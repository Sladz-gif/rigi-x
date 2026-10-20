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
