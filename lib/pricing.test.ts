import { describe, it, expect } from 'vitest';
import { calculatePrice } from './pricing';
import { Car } from '@/types';

describe('calculatePrice', () => {
  const mockCar: Car = {
    slug: 'test-car',
    name: 'Test Car',
    brand: 'Test',
    year: 2023,
    category: 'sedan',
    seats: 5,
    doors: 4,
    transmission: 'Automatic',
    fuel: 'Petrol',
    luggage: 2,
    pricePerDay: 800,
    deposit: 2000,
    chauffeurAvailable: true,
    selfDriveAvailable: true,
    minDays: 2,
    images: ['car-hyundai-elantra-1'],
    features: [],
    description: 'Test car',
  };

  it('calculates price for 3 days with no extras', () => {
    const pickup = new Date('2024-01-01');
    const returnDate = new Date('2024-01-04');

    const result = calculatePrice(mockCar, pickup, returnDate, {
      childSeat: false,
      gps: false,
      additionalDriver: false,
      chauffeur: false,
      fullInsurance: false,
    });

    expect(result.days).toBe(3);
    expect(result.dailyRate).toBe(800);
    expect(result.subtotal).toBe(2400);
    expect(result.extrasCost).toBe(0);
    expect(result.deposit).toBe(2000);
    expect(result.total).toBe(2400);
  });

  it('calculates price with extras', () => {
    const pickup = new Date('2024-01-01');
    const returnDate = new Date('2024-01-04');

    const result = calculatePrice(mockCar, pickup, returnDate, {
      childSeat: true,
      gps: true,
      additionalDriver: false,
      chauffeur: false,
      fullInsurance: false,
    });

    expect(result.days).toBe(3);
    expect(result.subtotal).toBe(2400);
    expect(result.extrasCost).toBe(240); // (50 + 30) * 3
    expect(result.total).toBe(2640);
    expect(result.extrasBreakdown.childSeat).toBe(150);
    expect(result.extrasBreakdown.gps).toBe(90);
  });

  it('calculates price with chauffeur service', () => {
    const pickup = new Date('2024-01-01');
    const returnDate = new Date('2024-01-03');

    const result = calculatePrice(mockCar, pickup, returnDate, {
      childSeat: false,
      gps: false,
      additionalDriver: false,
      chauffeur: true,
      fullInsurance: false,
    });

    expect(result.days).toBe(2);
    expect(result.subtotal).toBe(1600);
    expect(result.extrasCost).toBe(600); // 300 * 2
    expect(result.total).toBe(2200);
  });

  it('handles same-day pickup and return as 1 day', () => {
    const pickup = new Date('2024-01-01T10:00:00');
    const returnDate = new Date('2024-01-01T18:00:00');

    const result = calculatePrice(mockCar, pickup, returnDate, {
      childSeat: false,
      gps: false,
      additionalDriver: false,
      chauffeur: false,
      fullInsurance: false,
    });

    expect(result.days).toBe(1);
    expect(result.subtotal).toBe(800);
  });
});
