import { Car } from "@/types";
import { getDaysBetween } from "./utils";

export interface Extras {
  childSeat: boolean;
  gps: boolean;
  additionalDriver: boolean;
  chauffeur: boolean;
  fullInsurance: boolean;
}

export interface PriceBreakdown {
  days: number;
  dailyRate: number;
  subtotal: number;
  extrasCost: number;
  deposit: number;
  total: number;
  extrasBreakdown: {
    [key: string]: number;
  };
}

// Extra prices (in GHS)
const EXTRA_PRICES = {
  childSeat: 50, // per day
  gps: 30, // per day
  additionalDriver: 50, // per day
  chauffeur: 300, // per day
  fullInsurance: 100, // per day
} as const;

export function calculatePrice(
  car: Car,
  pickupDate: Date,
  returnDate: Date,
  extras: Extras
): PriceBreakdown {
  const days = getDaysBetween(pickupDate, returnDate);
  
  // Calculate base rental cost
  const dailyRate = car.pricePerDay;
  const subtotal = days * dailyRate;
  
  // Calculate extras cost
  let extrasCost = 0;
  const extrasBreakdown: { [key: string]: number } = {};
  
  if (extras.childSeat) {
    const cost = days * EXTRA_PRICES.childSeat;
    extrasCost += cost;
    extrasBreakdown.childSeat = cost;
  }
  
  if (extras.gps) {
    const cost = days * EXTRA_PRICES.gps;
    extrasCost += cost;
    extrasBreakdown.gps = cost;
  }
  
  if (extras.additionalDriver) {
    const cost = days * EXTRA_PRICES.additionalDriver;
    extrasCost += cost;
    extrasBreakdown.additionalDriver = cost;
  }
  
  if (extras.chauffeur) {
    const cost = days * EXTRA_PRICES.chauffeur;
    extrasCost += cost;
    extrasBreakdown.chauffeur = cost;
  }
  
  if (extras.fullInsurance) {
    const cost = days * EXTRA_PRICES.fullInsurance;
    extrasCost += cost;
    extrasBreakdown.fullInsurance = cost;
  }
  
  // Total cost (excluding deposit)
  const total = subtotal + extrasCost;
  
  return {
    days,
    dailyRate,
    subtotal,
    extrasCost,
    deposit: car.deposit,
    total,
    extrasBreakdown,
  };
}

export function getExtraPrice(key: keyof Extras): number {
  return EXTRA_PRICES[key];
}

export const EXTRA_LABELS: Record<keyof Extras, string> = {
  childSeat: "Child seat",
  gps: "GPS navigation",
  additionalDriver: "Additional driver",
  chauffeur: "Chauffeur service",
  fullInsurance: "Full insurance",
};

export interface CheckoutOptions {
  /** Percentage discount from an applied promo code. */
  promoPercent?: number;
  /** Flat GHS discount from an applied promo code. */
  promoFixed?: number;
  /** Label shown next to the discount line, e.g. the promo code. */
  promoLabel?: string;
  /** Tax rate as a percentage (VAT + levies). 0 disables the tax line. */
  taxRate?: number;
  /** Adds a delivery fee line when the customer chose delivery. */
  delivery?: boolean;
  deliveryFee?: number;
}

export interface CheckoutTotals extends PriceBreakdown {
  discount: number;
  discountLabel: string;
  tax: number;
  taxRate: number;
  deliveryFee: number;
  amountDueNow: number;
  lines: { label: string; amount: number }[];
}

/**
 * Full checkout quote used by /checkout, the success page and the admin booking
 * forms, so an amount shown to the customer always matches the stored amount.
 */
export function calculateCheckoutTotals(
  car: Car,
  pickupDate: Date,
  returnDate: Date,
  extras: Extras,
  options: CheckoutOptions = {}
): CheckoutTotals {
  const base = calculatePrice(car, pickupDate, returnDate, extras);
  const {
    promoPercent = 0,
    promoFixed = 0,
    promoLabel = "",
    taxRate = 0,
    delivery = false,
    deliveryFee = 80,
  } = options;

  const deliveryLine = delivery ? deliveryFee : 0;
  const beforeDiscount = base.subtotal + base.extrasCost + deliveryLine;
  const discount = Math.min(
    beforeDiscount,
    Math.round((beforeDiscount * promoPercent) / 100 + promoFixed)
  );
  const taxableBase = beforeDiscount - discount;
  const tax = Math.round((taxableBase * taxRate) / 100);
  const total = taxableBase + tax;

  const lines: { label: string; amount: number }[] = [
    { label: `${base.days} day${base.days === 1 ? "" : "s"} × ${formatMoney(base.dailyRate)}`, amount: base.subtotal },
  ];
  for (const [key, amount] of Object.entries(base.extrasBreakdown)) {
    lines.push({ label: EXTRA_LABELS[key as keyof Extras], amount });
  }
  if (deliveryLine) lines.push({ label: "Delivery to your address", amount: deliveryLine });
  if (discount) {
    lines.push({
      label: promoLabel ? `Discount (${promoLabel})` : "Discount",
      amount: -discount,
    });
  }
  if (tax) lines.push({ label: `VAT & levies (${taxRate}%)`, amount: tax });

  return {
    ...base,
    total,
    discount,
    discountLabel: promoLabel,
    tax,
    taxRate,
    deliveryFee: deliveryLine,
    amountDueNow: total,
    lines,
  };
}

function formatMoney(amount: number): string {
  return `₵${amount.toLocaleString("en-GH")}`;
}
