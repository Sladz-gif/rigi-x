import { PrismaClient } from '@prisma/client';
import { cars } from '../data/cars';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.vehicle.deleteMany();

  console.log('🧹 Cleared existing data');

  // Create vehicles from data/cars.ts
  for (const car of cars) {
    await prisma.vehicle.create({
      data: {
        slug: car.slug,
        name: car.name,
        brand: car.brand,
        year: car.year,
        category: car.category,
        seats: car.seats,
        doors: car.doors,
        transmission: car.transmission,
        fuel: car.fuel,
        luggage: car.luggage,
        pricePerDay: Math.round(car.pricePerDay * 100), // Convert to pesewas
        deposit: Math.round(car.deposit * 100), // Convert to pesewas
        chauffeurAvailable: car.chauffeurAvailable,
        selfDriveAvailable: car.selfDriveAvailable,
        minDays: car.minDays,
        minAge: car.category === 'luxury' ? 25 : 21,
        images: JSON.stringify(car.images),
        features: JSON.stringify(car.features || []),
        description: car.description,
        status: 'available',
      },
    });
  }

  console.log(`🚗 Created ${cars.length} vehicles`);

  // Create sample customers
  const customer1 = await prisma.customer.create({
    data: {
      name: 'Kwame Mensah',
      email: 'kwame.mensah@example.com',
      phone: '+233501234567',
      dateOfBirth: new Date('1990-05-15'),
      nationality: 'Ghana',
      idType: 'Ghana Card',
      idNumber: 'GHA-123456789-0',
      licenceNumber: 'GH-98765432',
      licenceCountry: 'Ghana',
      licenceExpiry: new Date('2026-12-31'),
      address: '123 Airport Residential Area',
      city: 'Accra',
      emergencyName: 'Ama Mensah',
      emergencyPhone: '+233509876543',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: 'John Smith',
      email: 'john.smith@example.com',
      phone: '+233502345678',
      dateOfBirth: new Date('1985-08-20'),
      nationality: 'International',
      idType: 'Passport',
      idNumber: 'UK1234567',
      licenceNumber: 'UK9876543',
      licenceCountry: 'United Kingdom',
      licenceExpiry: new Date('2025-06-30'),
      address: '456 Ridge',
      city: 'Accra',
      emergencyName: 'Jane Smith',
      emergencyPhone: '+233503456789',
    },
  });

  console.log('👥 Created 2 sample customers');

  // Create sample bookings
  const vehicle1 = await prisma.vehicle.findFirst({ where: { slug: 'hyundai-elantra-se' } });
  const vehicle2 = await prisma.vehicle.findFirst({ where: { slug: 'toyota-corolla-le' } });

  if (vehicle1 && vehicle2) {
    // Confirmed booking
    const booking1 = await prisma.booking.create({
      data: {
        reference: 'RGX-000001',
        customerId: customer1.id,
        vehicleId: vehicle1.id,
        startDate: new Date('2026-10-25'),
        endDate: new Date('2026-10-28'),
        pickupLocation: 'Airport',
        serviceType: 'self-drive',
        extras: JSON.stringify({ childSeat: false, gps: true, additionalDriver: false }),
        totalAmount: Math.round(800 * 3 * 100), // 3 days * 800 GHS
        depositAmount: vehicle1.deposit,
        status: 'confirmed',
      },
    });

    await prisma.payment.create({
      data: {
        bookingId: booking1.id,
        reference: 'PAY-DEMO-001',
        amount: booking1.totalAmount,
        currency: 'GHS',
        status: 'success',
        channel: 'demo',
      },
    });

    // Pending payment booking
    const booking2 = await prisma.booking.create({
      data: {
        reference: 'RGX-000002',
        customerId: customer2.id,
        vehicleId: vehicle2.id,
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-11-05'),
        pickupLocation: 'Dzorwulu',
        serviceType: 'self-drive',
        extras: JSON.stringify({ childSeat: true, gps: false, additionalDriver: false }),
        totalAmount: Math.round(750 * 4 * 100), // 4 days * 750 GHS
        depositAmount: vehicle2.deposit,
        status: 'pending_payment',
      },
    });

    await prisma.payment.create({
      data: {
        bookingId: booking2.id,
        reference: 'PAY-DEMO-002',
        amount: booking2.totalAmount,
        currency: 'GHS',
        status: 'initiated',
        channel: 'demo',
      },
    });

    console.log('📋 Created 2 sample bookings');
  }

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
