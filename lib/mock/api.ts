"use client";

// Simulated API layer. Every function returns a promise with realistic latency
// so the UI can show genuine loading, success and failure states. No network
// calls are made: Paystack, email and the database are all faked locally.
// NOTE: when real route handlers exist, keep these signatures and swap the body.

import { cars } from "@/data/cars";
import { calculateCheckoutTotals, type Extras } from "@/lib/pricing";
import { getRows, insertRow, logAudit, updateRow, withLatency } from "./store";
import type { Booking, Customer, Payment, Vehicle } from "./types";

export const PAYSTACK_MODE = "demo" as const;

/* ------------------------------------------------------------- promo */

export interface PromoResult {
  code: string;
  kind: "percent" | "fixed";
  value: number;
}

export async function validatePromo(code: string): Promise<PromoResult | null> {
  await withLatency(null, 450);
  const normalised = code.trim().toUpperCase();
  if (!normalised) return null;
  const promo = getRows("promoCodes").find(
    (row) => row.code.toUpperCase() === normalised && row.active
  );
  if (!promo) return null;
  if (promo.used >= promo.usageLimit) return null;
  if (new Date(promo.expiresAt) < new Date()) return null;
  return { code: promo.code, kind: promo.kind, value: promo.value };
}

/* ------------------------------------------------------ availability */

export function findVehicleBySlug(slug: string): Vehicle | undefined {
  return getRows("vehicles").find((vehicle) => vehicle.slug === slug);
}

export function getSeedCar(slug: string) {
  return cars.find((car) => car.slug === slug);
}

/** Releases bookings that were never paid for (30 minute expiry). */
export function expirePendingBookings(): number {
  const now = Date.now();
  const stale = getRows("bookings").filter(
    (booking) =>
      booking.status === "pending_payment" &&
      now - new Date(booking.createdAt).getTime() > 30 * 60_000
  );
  for (const booking of stale) {
    updateRow("bookings", booking.id, { status: "cancelled", notes: "Expired — payment not received in 30 minutes" });
  }
  return stale.length;
}

export function isVehicleAvailable(
  vehicleId: string,
  startDate: string,
  endDate: string,
  ignoreBookingId?: string
): boolean {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return !getRows("bookings").some((booking) => {
    if (booking.vehicleId !== vehicleId) return false;
    if (booking.id === ignoreBookingId) return false;
    if (booking.status === "cancelled") return false;
    const bStart = new Date(booking.startDate).getTime();
    const bEnd = new Date(booking.endDate).getTime();
    return start <= bEnd && end >= bStart;
  });
}

/* -------------------------------------------------------- checkout */

export interface CheckoutGuest {
  fullName: string;
  phone: string;
  phoneAlt: string;
  email: string;
  dateOfBirth: string;
  nationality: "Ghana resident" | "International visitor";
  idType: "Ghana Card" | "Passport" | "National ID";
  idNumber: string;
  licenceNumber: string;
  licenceCountry: string;
  licenceExpiry: string;
  address: string;
  city: string;
  emergencyName: string;
  emergencyPhone: string;
  deliveryAddress: string;
  flightNumber: string;
  chauffeurPickup: string;
  chauffeurDropoff: string;
  passengers: string;
  specialRequests: string;
}

export interface CheckoutPayload {
  vehicleSlug: string;
  startDate: string;
  endDate: string;
  serviceType: "self-drive" | "chauffeur";
  pickupLocation: string;
  dropoffLocation: string;
  extras: Extras;
  promoCode: string;
  delivery: boolean;
  guest: CheckoutGuest;
}

export type InitializeResult =
  | {
      ok: true;
      reference: string;
      accessCode: string;
      amount: number;
      amountPesewas: number;
      email: string;
      bookingId: string;
      mode: typeof PAYSTACK_MODE;
    }
  | { ok: false; error: string };

function normalisePhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("233")) return `+${digits}`;
  if (digits.startsWith("0")) return `+233${digits.slice(1)}`;
  return `+233${digits}`;
}

function taxRate(): number {
  const row = getRows("settings").find((s) => s.key === "tax.vat");
  const enabled = getRows("settings").find((s) => s.key === "tax.enabled");
  if (enabled?.value !== "true") return 0;
  return row ? Number(row.value) : 0;
}

/** Mirrors `POST /api/checkout/initialize`. */
export async function initializeCheckout(payload: CheckoutPayload): Promise<InitializeResult> {
  await withLatency(null, 1100);

  const vehicle = findVehicleBySlug(payload.vehicleSlug);
  const car = getSeedCar(payload.vehicleSlug);
  if (!vehicle || !car) return { ok: false, error: "We could not find that vehicle." };

  if (!payload.startDate || !payload.endDate) {
    return { ok: false, error: "Please choose your pickup and return dates." };
  }
  if (!isVehicleAvailable(vehicle.id, payload.startDate, payload.endDate)) {
    return { ok: false, error: "That car is already booked for those dates." };
  }

  const promo = await validatePromo(payload.promoCode);
  const deliveryRow = getRows("settings").find((s) => s.key === "fee.delivery");
  const totals = calculateCheckoutTotals(
    car,
    new Date(payload.startDate),
    new Date(payload.endDate),
    payload.extras,
    {
      promoPercent: promo?.kind === "percent" ? promo.value : 0,
      promoFixed: promo?.kind === "fixed" ? promo.value : 0,
      promoLabel: promo?.code ?? "",
      taxRate: taxRate(),
      delivery: payload.delivery,
      deliveryFee: deliveryRow ? Number(deliveryRow.value) : 80,
    }
  );

  // Find or create the guest customer by normalised email or phone.
  const email = payload.guest.email.trim().toLowerCase();
  const phone = normalisePhone(payload.guest.phone);
  const existing = getRows("customers").find(
    (c) => c.email.toLowerCase() === email || c.phone.replace(/\s/g, "") === phone.replace(/\s/g, "")
  );

  const customerData = {
    name: payload.guest.fullName,
    email,
    phone,
    phoneAlt: payload.guest.phoneAlt ? normalisePhone(payload.guest.phoneAlt) : "",
    city: payload.guest.city,
    address: payload.guest.address,
    nationality: payload.guest.nationality,
    idType: payload.guest.idType,
    idNumber: payload.guest.idNumber,
    licenceNumber: payload.guest.licenceNumber,
    licenceExpiry: payload.guest.licenceExpiry,
    dateOfBirth: payload.guest.dateOfBirth,
  };

  let customer: Customer;
  if (existing) {
    customer = updateRow("customers", existing.id, customerData) as Customer;
  } else {
    customer = insertRow("customers", {
      ...customerData,
      tier: "new",
      tags: ["new"],
      segment: "New",
      verified: false,
      blacklisted: false,
      blacklistReason: "",
      totalSpend: 0,
      rentals: 0,
      notes: "",
    }) as Customer;
  }

  const reference = `RGX-${Math.floor(200000 + Math.random() * 799999)}`;
  const booking = insertRow("bookings", {
    reference,
    customerId: customer.id,
    vehicleId: vehicle.id,
    startDate: payload.startDate,
    endDate: payload.endDate,
    days: totals.days,
    pickupLocation: payload.pickupLocation,
    dropoffLocation: payload.dropoffLocation,
    serviceType: payload.serviceType,
    status: "pending_payment",
    channel: "website",
    extras: payload.extras,
    subtotal: totals.subtotal,
    extrasTotal: totals.extrasCost,
    discount: totals.discount,
    tax: totals.tax,
    total: totals.total,
    deposit: totals.deposit,
    paid: 0,
    balance: totals.total,
    promoCode: promo?.code ?? "",
    salespersonId: null,
    driverId: null,
    notes: payload.guest.specialRequests,
  }) as Booking;

  insertRow("payments", {
    reference: `PAY-${Math.floor(90000 + Math.random() * 9999)}`,
    bookingId: booking.id,
    customerId: customer.id,
    amount: totals.total,
    currency: "GHS",
    status: "initiated",
    channel: "card",
    paystackReference: `PSK_${Math.floor(1_000_000 + Math.random() * 8_999_999)}`,
    fees: Math.round(totals.total * 0.0195),
    settled: false,
    paidAt: null,
  } as Omit<Payment, "id" | "createdAt" | "updatedAt">);

  logAudit({
    actorName: "Checkout (guest)",
    action: "created",
    entity: "Booking",
    entityId: reference,
    detail: `Booking ${reference} created for pick up ${payload.startDate}`,
  });

  return {
    ok: true,
    reference,
    accessCode: `demo_${Math.random().toString(36).slice(2, 12)}`,
    amount: totals.total,
    amountPesewas: totals.total * 100,
    email,
    bookingId: booking.id,
    mode: PAYSTACK_MODE,
  };
}

/** Mirrors `GET /api/checkout/verify` + the `charge.success` webhook. Idempotent. */
export async function confirmCheckoutPayment(reference: string): Promise<Booking | null> {
  await withLatency(null, 1500);
  const booking = getRows("bookings").find((b) => b.reference === reference);
  if (!booking) return null;
  if (booking.status !== "pending_payment") return booking;

  const payment = getRows("payments").find((p) => p.bookingId === booking.id);
  if (payment) {
    updateRow("payments", payment.id, {
      status: "success",
      settled: true,
      paidAt: new Date().toISOString(),
    });
  }

  const vehicle = getRows("vehicles").find((v) => v.id === booking.vehicleId);
  updateRow("bookings", booking.id, { status: "confirmed", paid: booking.total, balance: 0 });

  insertRow("deposits", {
    bookingId: booking.id,
    customerId: booking.customerId,
    amount: booking.deposit,
    status: "held",
    releasedAt: null,
    note: "Refundable security deposit held on the card.",
  });

  const customer = getRows("customers").find((c) => c.id === booking.customerId);
  insertRow("invoices", {
    number: `RCPT-${Math.floor(5000 + Math.random() * 4000)}`,
    bookingId: booking.id,
    customerId: booking.customerId,
    type: "receipt",
    issuedAt: new Date().toISOString(),
    dueAt: new Date().toISOString(),
    subtotal: booking.subtotal + booking.extrasTotal,
    tax: booking.tax,
    total: booking.total,
    status: "paid",
  });

  if (customer) {
    updateRow("customers", customer.id, {
      totalSpend: customer.totalSpend + booking.total,
      rentals: customer.rentals + 1,
      verified: true,
    });
  }

  insertRow("files", {
    name: `${booking.reference}-receipt.pdf`,
    mime: "application/pdf",
    sizeKb: 96,
    owner: "staff",
    ownerId: "system",
    bookingId: booking.id,
  });

  insertRow("emailOutbox", {
    to: customer?.email ?? "guest@example.com",
    subject: `Your Rigi-X booking ${booking.reference} is confirmed`,
    body: `<p>Hi ${customer?.name ?? "there"}, your booking for the ${vehicle?.name ?? "vehicle"} from ${booking.startDate} to ${booking.endDate} is confirmed. Total paid: GHS ${booking.total}.</p>`,
    templateId: "tpl-1",
    status: "sent",
    provider: "mock",
    sentAt: new Date().toISOString(),
  });

  logAudit({
    actorName: "Paystack webhook",
    action: "updated",
    entity: "Payment",
    entityId: payment?.reference ?? reference,
    detail: `charge.success for ${reference}`,
  });

  return getRows("bookings").find((b) => b.reference === reference) as Booking;
}

/** Simulates the customer closing the Paystack popup without paying. */
export async function abandonCheckout(reference: string): Promise<void> {
  await withLatency(null, 200);
  const booking = getRows("bookings").find((b) => b.reference === reference);
  if (!booking || booking.status !== "pending_payment") return;
  logAudit({
    actorName: "Checkout (guest)",
    action: "updated",
    entity: "Payment",
    entityId: reference,
    detail: "Payment popup closed — booking left as pending_payment",
  });
}

/* ------------------------------------------------------ guest lookup */

export interface GuestBookingView {
  booking: Booking;
  vehicle: Vehicle | undefined;
  customer: Customer | undefined;
  paid: number;
  deposit: number;
}

/**
 * Guest data is only reachable with the reference *and* the email or phone used
 * at checkout. Any mismatch returns null so references cannot be enumerated.
 */
export async function lookupBooking(
  reference: string,
  contact: string
): Promise<GuestBookingView | null> {
  await withLatency(null, 900);
  const ref = reference.trim().toUpperCase();
  const value = contact.trim().toLowerCase().replace(/\s/g, "");
  if (!ref || !value) return null;

  const booking = getRows("bookings").find((b) => b.reference.toUpperCase() === ref);
  if (!booking) return null;

  const customer = getRows("customers").find((c) => c.id === booking.customerId);
  if (!customer) return null;

  const matches =
    customer.email.toLowerCase() === value ||
    customer.phone.replace(/[\s+]/g, "").endsWith(value.replace(/[+]/g, "")) ||
    customer.phone.replace(/[^\d]/g, "") === value.replace(/[^\d]/g, "");
  if (!matches) return null;

  const deposit = getRows("deposits").find((d) => d.bookingId === booking.id);
  return {
    booking,
    vehicle: getRows("vehicles").find((v) => v.id === booking.vehicleId),
    customer,
    paid: booking.paid,
    deposit: deposit?.amount ?? booking.deposit,
  };
}

/* --------------------------------------------------- global search */

export interface SearchHit {
  group: "Bookings" | "Clients" | "Vehicles";
  label: string;
  sub: string;
  href: string;
}

export function globalSearch(query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];

  for (const booking of getRows("bookings")) {
    const customer = getRows("customers").find((c) => c.id === booking.customerId);
    const haystack = `${booking.reference} ${customer?.name ?? ""} ${customer?.email ?? ""}`.toLowerCase();
    if (haystack.includes(q)) {
      hits.push({
        group: "Bookings",
        label: booking.reference,
        sub: `${customer?.name ?? "Guest"} · ${booking.status.replace(/_/g, " ")}`,
        href: `/rigi-admin/sales?booking=${booking.reference}`,
      });
    }
    if (hits.length > 7) break;
  }

  for (const customer of getRows("customers")) {
    if (`${customer.name} ${customer.email} ${customer.phone}`.toLowerCase().includes(q)) {
      hits.push({
        group: "Clients",
        label: customer.name,
        sub: `${customer.email} · ${customer.rentals} rentals`,
        href: `/rigi-admin/customers?client=${customer.id}`,
      });
    }
    if (hits.length > 14) break;
  }

  for (const vehicle of getRows("vehicles")) {
    if (`${vehicle.name} ${vehicle.plate} ${vehicle.vin}`.toLowerCase().includes(q)) {
      hits.push({
        group: "Vehicles",
        label: vehicle.name,
        sub: `${vehicle.plate} · ${vehicle.status.replace(/_/g, " ")}`,
        href: `/rigi-admin/fleet?vehicle=${vehicle.id}`,
      });
    }
    if (hits.length > 19) break;
  }

  return hits;
}
