import { beforeEach, describe, expect, it } from "vitest";
import { siteConfig } from "@/lib/site-config";
import {
  abandonCheckout,
  confirmCheckoutPayment,
  findVehicleBySlug,
  initializeCheckout,
  isVehicleAvailable,
  lookupBooking,
  validatePromo,
  type CheckoutGuest,
  type CheckoutPayload,
} from "./api";
import { getRows, resetDb } from "./store";

const SLUG = "hyundai-elantra-se";
const START = "2027-11-01";
const END = "2027-11-04";

const NO_EXTRAS = {
  childSeat: false,
  gps: false,
  additionalDriver: false,
  chauffeur: false,
  fullInsurance: false,
};

function guest(overrides: Partial<CheckoutGuest> = {}): CheckoutGuest {
  return {
    fullName: "Ama Mensah",
    phone: "0244123456",
    phoneAlt: "",
    email: "guest.integration@example.com",
    dateOfBirth: "1994-05-02",
    nationality: "Ghana resident",
    idType: "Ghana Card",
    idNumber: "GHA-123456789-0",
    licenceNumber: "DL-998877",
    licenceCountry: "Ghana",
    licenceExpiry: "2028-01-01",
    address: "12 Airport Road",
    city: "Accra",
    emergencyName: "Kofi Mensah",
    emergencyPhone: "0201112223",
    deliveryAddress: "",
    flightNumber: "",
    chauffeurPickup: "",
    chauffeurDropoff: "",
    passengers: "2",
    specialRequests: "",
    ...overrides,
  };
}

function payload(overrides: Partial<CheckoutPayload> = {}): CheckoutPayload {
  return {
    vehicleSlug: SLUG,
    startDate: START,
    endDate: END,
    serviceType: "self-drive",
    pickupLocation: "Accra Airport (KIA)",
    dropoffLocation: "Accra Airport (KIA)",
    extras: NO_EXTRAS,
    promoCode: "",
    delivery: false,
    guest: guest(),
    ...overrides,
  };
}

async function initializeOrThrow(input: CheckoutPayload) {
  const result = await initializeCheckout(input);
  if (!result.ok) throw new Error(result.error);
  return result;
}

beforeEach(() => {
  resetDb();
});

describe("validatePromo", () => {
  it("accepts the live site promo, case-insensitively", async () => {
    const promo = await validatePromo(siteConfig.promoCode.toLowerCase());
    expect(promo).toEqual({ code: siteConfig.promoCode, kind: "percent", value: 15 });
  });

  it("rejects unknown and inactive codes", async () => {
    expect(await validatePromo("NOT-A-CODE")).toBeNull();
    expect(await validatePromo("LOYAL200")).toBeNull();
    expect(await validatePromo("")).toBeNull();
  });
});

describe("initializeCheckout", () => {
  it("creates a pending booking and an initiated payment", async () => {
    const result = await initializeOrThrow(payload());

    const booking = getRows("bookings").find((b) => b.reference === result.reference);
    expect(booking?.status).toBe("pending_payment");
    expect(booking?.paid).toBe(0);
    expect(booking?.balance).toBe(booking?.total);
    expect(result.amount).toBe(booking?.total);
    expect(result.amountPesewas).toBe(result.amount * 100);

    const payment = getRows("payments").find((p) => p.bookingId === booking?.id);
    expect(payment?.status).toBe("initiated");
    expect(payment?.settled).toBe(false);
    expect(payment?.amount).toBe(booking?.total);
  });

  it("quotes 3 days at the car rate plus tax", async () => {
    const result = await initializeOrThrow(payload());
    // Elantra SE is GHS 800/day, 3 days, 15% VAT & levies enabled, no extras.
    expect(result.amount).toBe(Math.round(3 * 800 * 1.15));
  });

  it("applies a promo code discount to the amount due", async () => {
    const plain = await initializeOrThrow(payload());
    resetDb();
    const discounted = await initializeOrThrow(payload({ promoCode: siteConfig.promoCode }));
    expect(discounted.amount).toBeLessThan(plain.amount);
  });

  it("rejects an unknown vehicle and missing dates", async () => {
    expect((await initializeCheckout(payload({ vehicleSlug: "no-such-car" }))).ok).toBe(false);
    expect((await initializeCheckout(payload({ startDate: "", endDate: "" }))).ok).toBe(false);
  });

  it("refuses a vehicle that is already booked for the dates", async () => {
    const first = await initializeOrThrow(payload());
    const vehicle = findVehicleBySlug(SLUG);
    expect(vehicle).toBeDefined();
    expect(isVehicleAvailable(vehicle!.id, START, END)).toBe(false);

    const second = await initializeCheckout(
      payload({ guest: guest({ email: "someone.else@example.com", phone: "0209998887" }) })
    );
    expect(second.ok).toBe(false);
    expect(first.reference).toMatch(/^RGX-\d{6}$/);
  });
});

describe("confirmCheckoutPayment", () => {
  it("confirms the booking and issues a receipt, deposit and email", async () => {
    const init = await initializeOrThrow(payload());
    const confirmed = await confirmCheckoutPayment(init.reference);

    expect(confirmed?.status).toBe("confirmed");
    expect(confirmed?.balance).toBe(0);
    expect(confirmed?.paid).toBe(confirmed?.total);

    const payment = getRows("payments").find((p) => p.bookingId === init.bookingId);
    expect(payment?.status).toBe("success");
    expect(payment?.settled).toBe(true);
    expect(payment?.paidAt).not.toBeNull();

    const deposits = getRows("deposits").filter((d) => d.bookingId === init.bookingId);
    expect(deposits).toHaveLength(1);
    expect(deposits[0].status).toBe("held");

    const invoices = getRows("invoices").filter((i) => i.bookingId === init.bookingId);
    expect(invoices).toHaveLength(1);
    expect(invoices[0].type).toBe("receipt");
    expect(invoices[0].status).toBe("paid");

    const emails = getRows("emailOutbox").filter((e) => e.subject.includes(init.reference));
    expect(emails).toHaveLength(1);
  });

  it("is idempotent when the webhook fires twice", async () => {
    const init = await initializeOrThrow(payload());
    await confirmCheckoutPayment(init.reference);
    await confirmCheckoutPayment(init.reference);

    expect(getRows("deposits").filter((d) => d.bookingId === init.bookingId)).toHaveLength(1);
    expect(getRows("invoices").filter((i) => i.bookingId === init.bookingId)).toHaveLength(1);
    expect(getRows("emailOutbox").filter((e) => e.subject.includes(init.reference))).toHaveLength(1);
  });

  it("credits the customer's spend once", async () => {
    const init = await initializeOrThrow(payload());
    await confirmCheckoutPayment(init.reference);
    const booking = getRows("bookings").find((b) => b.id === init.bookingId)!;
    const customer = getRows("customers").find((c) => c.id === booking.customerId)!;
    expect(customer.totalSpend).toBe(booking.total);
    expect(customer.rentals).toBe(1);
    expect(customer.verified).toBe(true);
  });

  it("returns null for an unknown reference", async () => {
    expect(await confirmCheckoutPayment("RGX-000000")).toBeNull();
  });
});

describe("abandonCheckout", () => {
  it("leaves the booking pending so it can expire later", async () => {
    const init = await initializeOrThrow(payload());
    await abandonCheckout(init.reference);
    const booking = getRows("bookings").find((b) => b.reference === init.reference);
    expect(booking?.status).toBe("pending_payment");
  });
});

describe("lookupBooking", () => {
  it("returns the booking only with a matching email or phone", async () => {
    const init = await initializeOrThrow(payload());

    const byEmail = await lookupBooking(init.reference, "guest.integration@example.com");
    expect(byEmail?.booking.reference).toBe(init.reference);
    expect(byEmail?.vehicle?.slug).toBe(SLUG);

    const byPhone = await lookupBooking(init.reference.toLowerCase(), "+233244123456");
    expect(byPhone?.booking.reference).toBe(init.reference);
  });

  it("refuses a wrong contact, a wrong reference and empty input", async () => {
    const init = await initializeOrThrow(payload());
    expect(await lookupBooking(init.reference, "wrong@example.com")).toBeNull();
    expect(await lookupBooking("RGX-000000", "guest.integration@example.com")).toBeNull();
    expect(await lookupBooking("", "")).toBeNull();
  });
});
