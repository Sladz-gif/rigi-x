// Deterministic seed data for the in-browser mock database.
// Mirrors what `prisma/seed.ts` would produce, so every admin screen renders
// with realistic content and every create/edit/delete really mutates state.

import { cars } from "@/data/cars";
import { siteConfig } from "@/lib/site-config";
import type {
  Applicant,
  Attendance,
  AuditLog,
  Booking,
  BookingChannel,
  BookingStatus,
  Campaign,
  ContentItem,
  Customer,
  CustomerTier,
  Deposit,
  Driver,
  EmailOutbox,
  EmailTemplate,
  Employee,
  Expense,
  FaqArticle,
  FileRecord,
  Inspection,
  InventoryItem,
  Invoice,
  Lead,
  LeaveRequest,
  Location,
  MaintenanceOrder,
  MaintenanceSchedule,
  Payment,
  PayrollRun,
  Payslip,
  PromoCode,
  PurchaseOrder,
  Quote,
  Refund,
  Review,
  Segment,
  Setting,
  StaffUser,
  StockMovement,
  Supplier,
  Ticket,
  TicketMessage,
  Vehicle,
  VehicleDocument,
  Vendor,
} from "./types";

/* ------------------------------------------------------------ helpers */

export interface MockDb {
  staff: StaffUser[];
  customers: Customer[];
  vehicles: Vehicle[];
  vehicleDocuments: VehicleDocument[];
  inspections: Inspection[];
  drivers: Driver[];
  bookings: Booking[];
  quotes: Quote[];
  leads: Lead[];
  payments: Payment[];
  refunds: Refund[];
  deposits: Deposit[];
  invoices: Invoice[];
  expenses: Expense[];
  maintenanceOrders: MaintenanceOrder[];
  maintenanceSchedules: MaintenanceSchedule[];
  vendors: Vendor[];
  inventoryItems: InventoryItem[];
  stockMovements: StockMovement[];
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  tickets: Ticket[];
  ticketMessages: TicketMessage[];
  reviews: Review[];
  faqs: FaqArticle[];
  employees: Employee[];
  attendance: Attendance[];
  leaveRequests: LeaveRequest[];
  payrollRuns: PayrollRun[];
  payslips: Payslip[];
  applicants: Applicant[];
  campaigns: Campaign[];
  emailTemplates: EmailTemplate[];
  emailOutbox: EmailOutbox[];
  segments: Segment[];
  promoCodes: PromoCode[];
  contentItems: ContentItem[];
  auditLogs: AuditLog[];
  locations: Location[];
  settings: Setting[];
  files: FileRecord[];
}

export type CollectionName = keyof MockDb;

let rngState = 20261022;
function rnd(): number {
  rngState = (rngState * 1664525 + 1013904223) % 4294967296;
  return rngState / 4294967296;
}
function pick<T>(list: readonly T[]): T {
  return list[Math.floor(rnd() * list.length)];
}
function int(min: number, max: number): number {
  return Math.floor(rnd() * (max - min + 1)) + min;
}
function bool(chance = 0.5): boolean {
  return rnd() < chance;
}

const TODAY = new Date();
TODAY.setHours(8, 0, 0, 0);

function day(offset: number, hour = 9): string {
  const d = new Date(TODAY.getTime() + offset * 86_400_000);
  d.setHours(hour, int(0, 59), 0, 0);
  return d.toISOString();
}
function ymd(offset: number): string {
  return day(offset).slice(0, 10);
}
function stamp(offset: number): { createdAt: string; updatedAt: string } {
  return { createdAt: day(offset, 8), updatedAt: day(Math.min(offset + 2, 0), 10) };
}

/* -------------------------------------------------------------- seed */

const STAFF: Omit<StaffUser, "id" | "createdAt" | "updatedAt">[] = [
  {
    name: "Nana Adjei",
    email: "admin@rigi-x.com",
    role: "super_admin",
    phone: "+233 53 884 8346",
    department: "Management",
    active: true,
    lastLogin: day(0, 7),
    // Development password (1234) must be replaced at first sign-in.
    mustChangePassword: true,
  },
  {
    name: "Ama Boateng",
    email: "operations@rigi-x.com",
    role: "admin",
    phone: "+233 24 118 2204",
    department: "Operations",
    active: true,
    lastLogin: day(-1, 16),
    mustChangePassword: false,
  },
  {
    name: "Kwesi Owusu",
    email: "manager@rigi-x.com",
    role: "manager",
    phone: "+233 20 774 1180",
    department: "Operations",
    active: true,
    lastLogin: day(-2, 11),
    mustChangePassword: false,
  },
  {
    name: "Efua Danso",
    email: "sales@rigi-x.com",
    role: "sales",
    phone: "+233 55 902 4417",
    department: "Sales",
    active: true,
    lastLogin: day(0, 9),
    mustChangePassword: false,
  },
  {
    name: "Yaw Mensah",
    email: "finance@rigi-x.com",
    role: "finance",
    phone: "+233 27 330 7781",
    department: "Finance",
    active: true,
    lastLogin: day(-1, 14),
    mustChangePassword: false,
  },
  {
    name: "Akosua Frimpong",
    email: "hr@rigi-x.com",
    role: "hr",
    phone: "+233 26 445 9902",
    department: "People",
    active: true,
    lastLogin: day(-3, 10),
    mustChangePassword: false,
  },
  {
    name: "Kojo Antwi",
    email: "support@rigi-x.com",
    role: "support",
    phone: "+233 54 417 8699",
    department: "Customer Service",
    active: true,
    lastLogin: day(0, 8),
    mustChangePassword: false,
  },
  {
    name: "Selorm Agbeko",
    email: "fleet@rigi-x.com",
    role: "fleet",
    phone: "+233 50 771 2203",
    department: "Fleet",
    active: true,
    lastLogin: day(-4, 15),
    mustChangePassword: false,
  },
];

const FIRST = [
  "Kwame",
  "Ama",
  "Kofi",
  "Abena",
  "Yaw",
  "Adwoa",
  "Kojo",
  "Esi",
  "Nana",
  "Akua",
  "Daniel",
  "Sarah",
  "Michael",
  "Linda",
  "Tunde",
  "Chioma",
  "Emeka",
  "Fatima",
  "Ibrahim",
  "Grace",
];
const LAST = [
  "Mensah",
  "Boateng",
  "Owusu",
  "Asante",
  "Danso",
  "Addo",
  "Agyeman",
  "Tetteh",
  "Nkrumah",
  "Amankwah",
  "Okafor",
  "Adeyemi",
  "Smith",
  "Johnson",
  "Bello",
  "Abubakar",
];
const CITIES = ["Accra", "Tema", "Kumasi", "Takoradi", "Cape Coast", "Madina", "East Legon"];
const STREETS = ["Dzorwulu Crescent", "Spintex Road", "Airport Residential", "Osu Oxford St", "Labone"];

const LOCATIONS = [
  "Accra Airport (KIA)",
  "Dzorwulu",
  "Airport Residential",
  "East Legon",
  "Osu",
  "Hotel delivery",
];

function money(n: number): number {
  return Math.round(n);
}

export function buildSeed(): MockDb {
  rngState = 20261022;

  /* ---------------------------------------------------------- staff */
  const staff: StaffUser[] = STAFF.map((s, i) => ({
    ...s,
    id: `usr-${i + 1}`,
    ...stamp(-400 + i),
  }));

  /* -------------------------------------------------------- vehicles */
  const vehicles: Vehicle[] = cars.map((c, i) => {
    const status: Vehicle["status"] =
      i === 4 ? "in_maintenance" : i === 9 ? "rented" : i === 11 ? "reserved" : "available";
    return {
      id: `veh-${i + 1}`,
      slug: c.slug,
      name: `${c.brand} ${c.name}`,
      brand: c.brand,
      year: c.year,
      category: c.category,
      plate: `GX ${1000 + i * 137}`,
      vin: `WVX${(1_400_000 + i * 9137).toString()}`,
      colour: pick(["Pearl White", "Obsidian Black", "Silver", "Deep Blue", "Gunmetal"]),
      seats: c.seats,
      transmission: c.transmission,
      fuel: c.fuel,
      odometerKm: 12_000 + i * 4_350,
      status,
      pricePerDay: c.pricePerDay,
      deposit: c.deposit,
      location: pick(LOCATIONS.slice(0, 3)),
      minAge: c.category === "luxury" ? 25 : 21,
      insuranceExpiry: ymd(int(10, 300)),
      registrationExpiry: ymd(int(20, 320)),
      roadworthyExpiry: ymd(int(-12, 200)),
      nextServiceKm: 20_000 + i * 5_000,
      nextServiceDate: ymd(int(-8, 45)),
      utilisation: int(38, 92),
      createdAt: day(-500 + i, 9),
      updatedAt: day(-3, 12),
    };
  });

  const vehicleDocuments: VehicleDocument[] = vehicles.flatMap((v, i) => [
    {
      id: `vdoc-${i}-1`,
      vehicleId: v.id,
      type: "Insurance" as const,
      reference: `INS-${4000 + i}`,
      expiresAt: v.insuranceExpiry,
      fileId: `file-${i + 1}`,
      createdAt: day(-400, 9),
      updatedAt: day(-30, 9),
    },
    {
      id: `vdoc-${i}-2`,
      vehicleId: v.id,
      type: "Roadworthy" as const,
      reference: `RW-${9000 + i}`,
      expiresAt: v.roadworthyExpiry,
      fileId: `file-${i + 20}`,
      createdAt: day(-380, 9),
      updatedAt: day(-25, 9),
    },
  ]);

  /* ------------------------------------------------------- customers */
  const tiers: CustomerTier[] = ["new", "silver", "gold", "platinum"];
  const customers: Customer[] = Array.from({ length: 28 }, (_, i) => {
    const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 3) % LAST.length]}`;
    const slug = name.toLowerCase().replace(/\s+/g, ".");
    const tier = tiers[i % tiers.length];
    const rentals = int(1, 18);
    return {
      id: `cus-${i + 1}`,
      name,
      email: `${slug}@example.com`,
      phone: `+233 ${int(20, 59)} ${int(100, 999)} ${int(1000, 9999)}`,
      phoneAlt: bool(0.4) ? `+233 ${int(20, 59)} ${int(100, 999)} ${int(1000, 9999)}` : "",
      city: CITIES[i % CITIES.length],
      address: `${int(1, 90)} ${STREETS[i % STREETS.length]}, ${CITIES[i % CITIES.length]}`,
      nationality: i % 5 === 0 ? "International visitor" : "Ghana resident",
      idType: i % 3 === 0 ? "Passport" : "Ghana Card",
      idNumber: `GHA-${int(100000000, 999999999)}-${int(0, 9)}`,
      licenceNumber: `DL-${int(1000000, 9999999)}`,
      licenceExpiry: ymd(int(30, 900)),
      dateOfBirth: ymd(-int(21, 55) * 365),
      tier,
      tags: [tier === "platinum" ? "VIP" : "regular", ...(i % 7 === 0 ? ["corporate"] : [])],
      segment: i % 4 === 0 ? "Corporate" : i % 4 === 1 ? "Repeat renters" : i % 4 === 2 ? "Weekend" : "New",
      verified: i % 11 !== 0,
      blacklisted: i === 17,
      blacklistReason: i === 17 ? "Unpaid damage claim from RGX-100016" : "",
      totalSpend: money(rentals * int(700, 4200)),
      rentals,
      notes: bool(0.35) ? "Prefers automatic transmission and airport pickup." : "",
      ...stamp(-300 + i * 4),
    };
  });

  /* --------------------------------------------------------- drivers */
  const drivers: Driver[] = Array.from({ length: 6 }, (_, i) => ({
    id: `drv-${i + 1}`,
    name: `${FIRST[(i + 4) % FIRST.length]} ${LAST[(i + 2) % LAST.length]}`,
    phone: `+233 ${int(20, 59)} ${int(100, 999)} ${int(1000, 9999)}`,
    licenceNumber: `DL-${int(1000000, 9999999)}`,
    licenceExpiry: ymd(int(-20, 400)),
    assignedVehicleId: i < 4 ? vehicles[i + 7].id : null,
    available: i > 1,
    rating: Number((3.9 + rnd()).toFixed(1)),
    trips: int(20, 400),
    ...stamp(-260 + i * 3),
  }));

  /* -------------------------------------------------------- bookings */
  const statuses: BookingStatus[] = [
    "confirmed",
    "confirmed",
    "active",
    "returned",
    "closed",
    "pending_payment",
    "cancelled",
  ];
  const channels: BookingChannel[] = ["website", "website", "walk_in", "phone", "whatsapp", "partner"];

  const bookings: Booking[] = Array.from({ length: 46 }, (_, i) => {
    const customer = customers[i % customers.length];
    const vehicle = vehicles[i % vehicles.length];
    const start = i < 8 ? -int(1, 40) : int(1, 45);
    const days = int(2, 9);
    const end = start + days;
    const status = i < 3 ? "pending_payment" : statuses[i % statuses.length];
    const chauffeur = !vehicle.name.includes("Rolls") && i % 3 === 0;
    const extras = {
      childSeat: i % 9 === 0,
      gps: i % 4 === 0,
      additionalDriver: i % 6 === 0,
      chauffeur,
      fullInsurance: i % 2 === 0,
    };
    const subtotal = money(days * vehicle.pricePerDay);
    const extrasTotal = money(
      (extras.childSeat ? days * 50 : 0) +
        (extras.gps ? days * 30 : 0) +
        (extras.additionalDriver ? days * 50 : 0) +
        (chauffeur ? days * 300 : 0) +
        (extras.fullInsurance ? days * 100 : 0)
    );
    const discount = i % 5 === 0 ? money((subtotal + extrasTotal) * 0.15) : 0;
    const tax = money((subtotal + extrasTotal - discount) * 0.15);
    const total = money(subtotal + extrasTotal - discount + tax);
    const paid =
      status === "pending_payment" || status === "cancelled"
        ? 0
        : status === "confirmed"
          ? money(total * 0.5)
          : total;
    return {
      id: `bkg-${i + 1}`,
      reference: `RGX-${100001 + i}`,
      customerId: customer.id,
      vehicleId: vehicle.id,
      startDate: ymd(start),
      endDate: ymd(end),
      days,
      pickupLocation: pick(LOCATIONS),
      dropoffLocation: pick(LOCATIONS),
      serviceType: chauffeur ? "chauffeur" : "self-drive",
      status,
      channel: channels[i % channels.length],
      extras,
      subtotal,
      extrasTotal,
      discount,
      tax,
      total,
      deposit: vehicle.deposit,
      paid,
      balance: total - paid,
      promoCode: discount > 0 ? siteConfig.promoCode : "",
      salespersonId: bool(0.6) ? staff[3].id : null,
      driverId: chauffeur ? drivers[i % drivers.length].id : null,
      notes: bool(0.2) ? "Customer requested early pickup." : "",
      ...stamp(start - 6),
    };
  });

  /* ---------------------------------------------------------- quotes */
  const quotes: Quote[] = Array.from({ length: 12 }, (_, i) => ({
    id: `qot-${i + 1}`,
    reference: `QTE-${2001 + i}`,
    customerName: customers[(i + 5) % customers.length].name,
    email: customers[(i + 5) % customers.length].email,
    vehicleId: vehicles[(i + 2) % vehicles.length].id,
    startDate: ymd(int(2, 30)),
    endDate: ymd(int(31, 50)),
    amount: money(int(1, 9) * vehicles[i % vehicles.length].pricePerDay),
    status: (["draft", "sent", "accepted", "expired"] as const)[i % 4],
    validUntil: ymd(int(3, 30)),
    ...stamp(-40 + i),
  }));

  /* ----------------------------------------------------------- leads */
  const leads: Lead[] = Array.from({ length: 14 }, (_, i) => ({
    id: `led-${i + 1}`,
    name: `${FIRST[(i + 8) % FIRST.length]} ${LAST[(i + 1) % LAST.length]}`,
    company: i % 3 === 0 ? pick(["Vivo Energy", "MTN Ghana", "Kosmos Energy", "Unilever GH"]) : "",
    email: `lead${i + 1}@example.com`,
    phone: `+233 ${int(20, 59)} ${int(100, 999)} ${int(1000, 9999)}`,
    source: pick(["Website", "WhatsApp", "Referral", "Google Ads", "Walk-in"]),
    value: money(int(1, 12) * 1200),
    stage: (["new", "contacted", "quoted", "won", "lost"] as const)[i % 5],
    owner: staff[(i % 4) + 3].name,
    ...stamp(-30 + i * 2),
  }));

  /* -------------------------------------------------------- payments */
  const payments: Payment[] = bookings
    .filter((b) => b.paid > 0)
    .map((b, i) => ({
      id: `pay-${i + 1}`,
      reference: `PAY-${50001 + i}`,
      bookingId: b.id,
      customerId: b.customerId,
      amount: b.paid,
      currency: "GHS" as const,
      status: (b.status === "cancelled" ? "refunded" : "success") as Payment["status"],
      channel: (["card", "mobile_money", "bank_transfer", "cash"] as const)[i % 4],
      paystackReference: `PSK_${(9_100_000 + i * 37).toString()}`,
      fees: money(b.paid * 0.0195),
      settled: i % 3 !== 0,
      paidAt: b.createdAt,
      ...stamp(-40 + i),
    }));

  const refunds: Refund[] = payments
    .filter((p) => p.status === "refunded")
    .map((p, i) => ({
      id: `ref-${i + 1}`,
      paymentId: p.id,
      bookingId: p.bookingId,
      amount: p.amount,
      reason: "Customer cancelled before pickup (48h notice)",
      status: "paid" as const,
      ...stamp(-12 + i),
    }));

  const deposits: Deposit[] = bookings
    .filter((b) => b.status === "active" || b.status === "closed" || b.status === "returned")
    .map((b, i) => ({
      id: `dep-${i + 1}`,
      bookingId: b.id,
      customerId: b.customerId,
      amount: b.deposit,
      status: (b.status === "closed" ? "released" : (["held", "released", "forfeited"] as const)[i % 3]) as Deposit["status"],
      releasedAt: b.status === "closed" ? day(-2, 12) : null,
      note: i % 9 === 0 ? "Minor kerb damage — partial deduction" : "",
      ...stamp(-30 + i),
    }));

  /* -------------------------------------------------------- invoices */
  const invoices: Invoice[] = bookings.slice(0, 30).map((b, i) => {
    const overdue = i % 11 === 0;
    return {
      id: `inv-${i + 1}`,
      number: `${i % 4 === 0 ? "RCPT" : "INV"}-${3001 + i}`,
      bookingId: b.id,
      customerId: b.customerId,
      type: (i % 4 === 0 ? "receipt" : "invoice") as Invoice["type"],
      issuedAt: b.createdAt,
      dueAt: day(int(-20, 20)),
      subtotal: b.subtotal + b.extrasTotal,
      tax: b.tax,
      total: money(b.subtotal + b.extrasTotal + b.tax - b.discount),
      status: (overdue ? "overdue" : b.paid >= b.total ? "paid" : "sent") as Invoice["status"],
      ...stamp(-45 + i),
    };
  });

  /* -------------------------------------------------------- expenses */
  const EXPENSE_CATEGORIES = [
    "Fuel",
    "Maintenance",
    "Insurance",
    "Salaries",
    "Rent",
    "Marketing",
    "Tyres",
    "Cleaning",
    "Licensing",
  ];
  const expenses: Expense[] = Array.from({ length: 26 }, (_, i) => ({
    id: `exp-${i + 1}`,
    reference: `EXP-${7001 + i}`,
    category: EXPENSE_CATEGORIES[i % EXPENSE_CATEGORIES.length],
    vendor: pick(["Total Energies", "Auto Works Ltd", "Enterprise Insurance", "SIC", "Zoomlion", "Kantanka Parts"]),
    vehicleId: i % 3 === 0 ? vehicles[i % vehicles.length].id : null,
    amount: money(int(180, 9000)),
    spentAt: ymd(-int(1, 60)),
    status: (["approved", "approved", "pending", "rejected"] as const)[i % 4],
    note: "",
    ...stamp(-60 + i * 2),
  }));

  /* ----------------------------------------------------- maintenance */
  const vendors: Vendor[] = [
    { name: "Auto Works Ltd", type: "garage" as const, contact: "Selorm", phone: "+233 30 221 4410", email: "service@autoworks.gh", rating: 4.6 },
    { name: "Kantanka Parts", type: "parts" as const, contact: "Kojo", phone: "+233 30 224 1190", email: "sales@kantanka-parts.gh", rating: 4.1 },
    { name: "Tyres Plus GH", type: "tyres" as const, contact: "Nadia", phone: "+233 30 551 7788", email: "hello@tyresplus.gh", rating: 4.4 },
    { name: "Shine Detailers", type: "detailing" as const, contact: "Ebo", phone: "+233 24 990 1120", email: "book@shinedetailing.gh", rating: 4.8 },
    { name: "Enterprise Insurance", type: "insurance" as const, contact: "Adjoa", phone: "+233 30 221 0000", email: "claims@enterprise.gh", rating: 3.9 },
  ].map((v, i) => ({ ...v, id: `ven-${i + 1}`, ...stamp(-320 + i * 5) }));

  const maintenanceOrders: MaintenanceOrder[] = Array.from({ length: 18 }, (_, i) => {
    const vehicle = vehicles[i % vehicles.length];
    const kind = (["service", "repair", "accident"] as const)[i % 3];
    const labourCost = money(int(200, 2600));
    const partsCost = money(int(150, 5200));
    const status = (["open", "in_progress", "waiting_parts", "completed", "completed", "cancelled"] as const)[i % 6];
    return {
      id: `mnt-${i + 1}`,
      reference: `WO-${4001 + i}`,
      vehicleId: vehicle.id,
      vendorId: vendors[i % 3].id,
      mechanic: pick(["Yaw A.", "Kofi B.", "Musah I.", "In-house team"]),
      priority: (["low", "normal", "high", "urgent"] as const)[i % 4],
      status,
      kind,
      description:
        kind === "service"
          ? `${int(5, 20)}k km service — oil, filters, brake check`
          : kind === "repair"
            ? pick(["Replace front brake pads", "Air-conditioning regas", "Suspension bushes", "Alternator replacement"])
            : "Accident repair — panel and respray",
      odometerKm: vehicle.odometerKm + int(0, 900),
      labourCost,
      partsCost,
      openedAt: day(-int(1, 90)),
      closedAt: status === "completed" ? day(-int(1, 12)) : null,
      ...stamp(-90 + i * 3),
    };
  });

  const maintenanceSchedules: MaintenanceSchedule[] = vehicles.map((v, i) => ({
    id: `msch-${i + 1}`,
    vehicleId: v.id,
    service: i % 2 === 0 ? "Full service" : "Tyre rotation + alignment",
    intervalKm: 10_000,
    intervalDays: 180,
    dueAt: ymd(int(-15, 60)),
    dueKm: v.nextServiceKm,
    overdue: int(-15, 1) < 0,
    ...stamp(-120 + i),
  }));

  /* ------------------------------------------------------- inventory */
  const suppliers: Supplier[] = [
    { name: "Kantanka Parts", contact: "Kojo Mensah", phone: "+233 30 224 1190", email: "sales@kantanka-parts.gh", category: "Spare parts", leadTimeDays: 5 },
    { name: "Tyres Plus GH", contact: "Nadia Owusu", phone: "+233 30 551 7788", email: "hello@tyresplus.gh", category: "Tyres", leadTimeDays: 3 },
    { name: "Lubricants Direct", contact: "Ibrahim Sule", phone: "+233 24 771 3320", email: "orders@lubricantsdirect.gh", category: "Oils", leadTimeDays: 7 },
    { name: "CleanPro Supplies", contact: "Esi Bawa", phone: "+233 55 220 8811", email: "sales@cleanpro.gh", category: "Cleaning", leadTimeDays: 2 },
  ].map((s, i) => ({ ...s, id: `sup-${i + 1}`, ...stamp(-280 + i * 6) }));

  const ITEM_TEMPLATES: { name: string; category: string; unit: string; cost: number }[] = [
    { name: "Engine oil 5W-30 (4L)", category: "Oils", unit: "bottle", cost: 320 },
    { name: "Oil filter — Toyota", category: "Filters", unit: "piece", cost: 85 },
    { name: "Air filter — universal", category: "Filters", unit: "piece", cost: 120 },
    { name: "Brake pads (front set)", category: "Brakes", unit: "set", cost: 640 },
    { name: "Brake fluid DOT4 (1L)", category: "Oils", unit: "bottle", cost: 95 },
    { name: "Tyre 225/65 R17", category: "Tyres", unit: "piece", cost: 1250 },
    { name: "Tyre 265/60 R18", category: "Tyres", unit: "piece", cost: 1680 },
    { name: "Battery 70Ah", category: "Electrical", unit: "piece", cost: 1450 },
    { name: "Wiper blades (pair)", category: "Accessories", unit: "pair", cost: 180 },
    { name: "Child seat", category: "Accessories", unit: "piece", cost: 420 },
    { name: "GPS unit", category: "Accessories", unit: "piece", cost: 780 },
    { name: "Car shampoo (5L)", category: "Cleaning", unit: "can", cost: 210 },
    { name: "Microfibre towels (pack)", category: "Cleaning", unit: "pack", cost: 140 },
    { name: "Coolant (5L)", category: "Oils", unit: "bottle", cost: 260 },
    { name: "Spark plugs (set of 4)", category: "Engine", unit: "set", cost: 380 },
  ];

  const inventoryItems: InventoryItem[] = ITEM_TEMPLATES.map((t, i) => {
    const reorderLevel = int(4, 12);
    const quantity = i < 4 ? int(0, reorderLevel) : int(reorderLevel + 1, 40);
    return {
      id: `itm-${i + 1}`,
      sku: `RIG-${1000 + i * 7}`,
      name: t.name,
      category: t.category,
      unit: t.unit,
      quantity,
      reorderLevel,
      unitCost: t.cost,
      location: pick(["Main store", "Workshop", "Airport bay", "Warehouse B"]),
      supplierId: suppliers[i % suppliers.length].id,
      ...stamp(-200 + i * 3),
    };
  });

  const stockMovements: StockMovement[] = Array.from({ length: 34 }, (_, i) => {
    const item = inventoryItems[i % inventoryItems.length];
    const kind = (["in", "out", "out", "adjust"] as const)[i % 4];
    return {
      id: `stk-${i + 1}`,
      itemId: item.id,
      kind,
      quantity: kind === "in" ? int(2, 20) : int(1, 6),
      reason:
        kind === "in"
          ? "Purchase order received"
          : kind === "out"
            ? `Used on ${pick(["routine service", "brake job", "tyre replacement", "detail"])}`
            : "Stock take correction",
      workOrderId: kind === "out" ? maintenanceOrders[i % maintenanceOrders.length].id : null,
      by: pick(["Selorm A.", "Yaw A.", "Kofi B."]),
      ...stamp(-70 + i * 2),
    };
  });

  const purchaseOrders: PurchaseOrder[] = Array.from({ length: 9 }, (_, i) => {
    const supplier = suppliers[i % suppliers.length];
    const lines = Array.from({ length: int(2, 4) }, (_, j) => {
      const item = inventoryItems[(i * 3 + j) % inventoryItems.length];
      const quantity = int(4, 24);
      return { itemId: item.id, name: item.name, quantity, unitCost: item.unitCost };
    });
    return {
      id: `po-${i + 1}`,
      number: `PO-${6001 + i}`,
      supplierId: supplier.id,
      status: (["draft", "ordered", "received", "received", "cancelled"] as const)[i % 5],
      orderedAt: day(-int(5, 50)),
      expectedAt: day(int(-10, 20)),
      total: money(lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0)),
      lines,
      ...stamp(-50 + i * 4),
    };
  });

  /* ------------------------------------------------------ service desk */
  const tickets: Ticket[] = Array.from({ length: 22 }, (_, i) => {
    const status = (["open", "pending", "resolved", "closed"] as const)[i % 4];
    return {
      id: `tkt-${i + 1}`,
      reference: `TKT-${8001 + i}`,
      subject: pick([
        "Airport pickup time changed",
        "Deposit refund not received",
        "Vehicle air-conditioning weak",
        "Damage claim on front bumper",
        "Need a baby seat for tomorrow",
        "Invoice for company accounting",
        "Extension request for 2 more days",
      ]),
      customerId: customers[i % customers.length].id,
      channel: (["whatsapp", "email", "phone", "web"] as const)[i % 4],
      status,
      priority: (["low", "normal", "high", "urgent"] as const)[i % 4],
      assigneeId: status === "open" ? null : staff[6].id,
      slaDueAt: day(int(-2, 3), 17),
      category: (["booking", "payment", "vehicle", "damage", "general"] as const)[i % 5],
      summary: "Customer contacted us about the item below. Awaiting resolution.",
      ...stamp(-25 + i),
    };
  });

  const ticketMessages: TicketMessage[] = tickets.flatMap((t, i) => [
    {
      id: `tmsg-${i}-1`,
      ticketId: t.id,
      author: "Customer",
      internal: false,
      body: "Hello, could you please look into this for me? Thank you.",
      ...stamp(-24 + i),
    },
    {
      id: `tmsg-${i}-2`,
      ticketId: t.id,
      author: staff[6].name,
      internal: false,
      body: "Thanks for reaching out — we are checking with the fleet team and will revert shortly.",
      ...stamp(-23 + i),
    },
    {
      id: `tmsg-${i}-3`,
      ticketId: t.id,
      author: staff[6].name,
      internal: true,
      body: "Internal: vehicle needs a workshop slot, coordinate with Fleet.",
      ...stamp(-22 + i),
    },
  ]);

  const reviews: Review[] = Array.from({ length: 14 }, (_, i) => ({
    id: `rev-${i + 1}`,
    customerId: customers[(i + 2) % customers.length].id,
    vehicleId: vehicles[i % vehicles.length].id,
    rating: int(3, 5),
    title: pick(["Smooth pickup", "Great car, will rent again", "Clean vehicle", "Fast support", "Good value"]),
    body: "The car was exactly as described, clean and delivered on time. The team handled everything professionally.",
    approved: i % 3 !== 0,
    publishedAt: i % 3 !== 0 ? day(-int(1, 40)) : null,
    ...stamp(-60 + i * 3),
  }));

  const faqs: FaqArticle[] = [
    { q: "What do I need to rent a car?", a: "A valid driver's licence, a Ghana Card or passport, and you must be at least 21 (25 for luxury cars)." },
    { q: "Do you deliver the car?", a: "Yes — we deliver across Accra, including Kotoka International Airport, free within 10km of Dzorwulu." },
    { q: "Is a deposit required?", a: "Yes, a refundable security deposit is held on your card or collected at pickup and released after return." },
    { q: "Can I take the car outside Accra?", a: "Yes, with prior approval. Let us know your route so we can prepare the vehicle." },
    { q: "What is the fuel policy?", a: "Cars are handed over with a full tank and should be returned full." },
    { q: "How do I cancel?", a: "Free cancellation up to 48 hours before pickup. 50% refund between 24 and 48 hours." },
    { q: "Do you offer chauffeur services?", a: "Yes, professional chauffeurs are available on most vehicles, priced per day." },
    { q: "Can I add a second driver?", a: "Yes, an additional driver can be added for ₵50 per day with a valid licence." },
  ].map((f, i) => ({
    ...f,
    id: `faq-${i + 1}`,
    question: f.q,
    answer: f.a,
    category: pick(["Booking", "Requirements", "Payments", "Insurance", "Cancellations"]),
    published: true,
    views: int(120, 2400),
    ...stamp(-210 + i * 4),
  }));

  /* --------------------------------------------------------------- hr */
  const employees: Employee[] = Array.from({ length: 16 }, (_, i) => {
    const department = pick(["Operations", "Fleet", "Sales", "Finance", "People", "Customer Service"]);
    const gross = money(int(2400, 9500));
    return {
      id: `emp-${i + 1}`,
      staffNo: `RX-${100 + i}`,
      name: `${FIRST[(i + 3) % FIRST.length]} ${LAST[(i + 5) % LAST.length]}`,
      email: `employee${i + 1}@rigi-x.com`,
      phone: `+233 ${int(20, 59)} ${int(100, 999)} ${int(1000, 9999)}`,
      department,
      jobTitle: pick(["Driver", "Rental agent", "Mechanic", "Accountant", "Dispatcher", "Detailer"]),
      contract: (["full_time", "full_time", "part_time", "contract"] as const)[i % 4],
      startDate: ymd(-int(60, 1500)),
      grossMonthly: gross,
      allowances: money(gross * 0.1),
      emergencyName: `${FIRST[(i + 9) % FIRST.length]} ${LAST[(i + 2) % LAST.length]}`,
      emergencyPhone: `+233 ${int(20, 59)} ${int(100, 999)} ${int(1000, 9999)}`,
      active: i !== 15,
      ...stamp(-400 + i * 8),
    };
  });

  const attendance: Attendance[] = employees.flatMap((emp, i) =>
    Array.from({ length: 6 }, (_, j) => {
      const date = ymd(-j - 1);
      const late = (i + j) % 9 === 0;
      const absent = (i + j) % 13 === 0;
      return {
        id: `att-${i}-${j}`,
        employeeId: emp.id,
        date,
        clockIn: absent ? "" : `0${late ? 9 : 7}:${late ? "42" : "58"}`,
        clockOut: absent ? null : "17:30",
        hours: absent ? 0 : late ? 7.5 : 9,
        status: (absent ? "absent" : late ? "late" : "present") as Attendance["status"],
        ...stamp(-j - 1),
      };
    })
  );

  const leaveRequests: LeaveRequest[] = Array.from({ length: 12 }, (_, i) => {
    const from = int(1, 40);
    const days = int(1, 10);
    return {
      id: `lve-${i + 1}`,
      employeeId: employees[i % employees.length].id,
      type: (["annual", "sick", "unpaid", "maternity"] as const)[i % 4],
      from: ymd(from),
      to: ymd(from + days),
      days,
      status: (["pending", "approved", "rejected", "approved"] as const)[i % 4],
      reason: pick(["Family event", "Medical appointment", "Annual leave", "Travel"]),
      ...stamp(-20 + i),
    };
  });

  const payrollRuns: PayrollRun[] = Array.from({ length: 3 }, (_, i) => {
    const gross = money(employees.reduce((s, e) => s + e.grossMonthly + e.allowances, 0));
    const ssnit = money(gross * 0.055);
    const paye = money(gross * 0.12);
    return {
      id: `pr-${i + 1}`,
      period: new Date(TODAY.getFullYear(), TODAY.getMonth() - i, 1).toISOString().slice(0, 7),
      gross,
      ssnit,
      paye,
      net: gross - ssnit - paye,
      status: (["paid", "paid", "draft"] as const)[i],
      employees: employees.length,
      ...stamp(-80 + i * 30),
    };
  });

  const payslips: Payslip[] = payrollRuns.flatMap((run, i) =>
    employees.slice(0, 16).map((emp, j) => {
      const basic = emp.grossMonthly;
      const allowances = emp.allowances;
      const ssnit = money(basic * 0.055);
      const paye = money(basic * 0.12);
      return {
        id: `ps-${i}-${j}`,
        payrollRunId: run.id,
        employeeId: emp.id,
        basic,
        allowances,
        ssnit,
        paye,
        otherDeductions: money(int(0, 200)),
        net: basic + allowances - ssnit - paye,
        ...stamp(-80 + i * 30),
      };
    })
  );

  const applicants: Applicant[] = Array.from({ length: 10 }, (_, i) => ({
    id: `app-${i + 1}`,
    name: `${FIRST[(i + 6) % FIRST.length]} ${LAST[(i + 9) % LAST.length]}`,
    role: pick(["Chauffeur", "Rental agent", "Mechanic", "Cleaner", "Accountant"]),
    email: `applicant${i + 1}@example.com`,
    stage: (["applied", "screening", "interview", "offer", "hired", "rejected"] as const)[i % 6],
    appliedAt: ymd(-int(2, 45)),
    rating: int(2, 5),
    ...stamp(-45 + i * 3),
  }));

  /* -------------------------------------------------------- marketing */
  const emailTemplates: EmailTemplate[] = [
    { name: "Booking confirmation", category: "transactional" as const, subject: "Your Rigi-X booking {{reference}} is confirmed", body: "<p>Hi {{first_name}}, your booking is confirmed.</p>" },
    { name: "Payment receipt", category: "transactional" as const, subject: "Receipt for {{reference}}", body: "<p>Thanks for your payment of {{amount}}.</p>" },
    { name: "Online promo — 15% off", category: "promo" as const, subject: "{{first_name}}, take 15% off your next rental", body: "<p>Use code ONLINE15 at checkout.</p>" },
    { name: "Pickup reminder", category: "reminder" as const, subject: "Your car is ready tomorrow", body: "<p>See you at {{pickup_location}}.</p>" },
    { name: "Thank you — how did we do?", category: "thank_you" as const, subject: "How was your Rigi-X rental?", body: "<p>Leave us a review.</p>" },
    { name: "We miss you", category: "win_back" as const, subject: "It has been a while, {{first_name}}", body: "<p>Here is 10% off your next trip.</p>" },
    { name: "Monthly newsletter", category: "newsletter" as const, subject: "Rigi-X monthly update", body: "<p>New arrivals this month…</p>" },
  ].map((t, i) => ({ ...t, id: `tpl-${i + 1}`, updatedBy: staff[1].name, ...stamp(-150 + i * 7) }));

  const segments: Segment[] = [
    { name: "Corporate accounts", description: "Companies booking monthly with an invoice account", rule: "tag = corporate", members: 42 },
    { name: "Repeat renters", description: "Customers with more than 3 completed rentals", rule: "rentals > 3", members: 168 },
    { name: "Weekend travellers", description: "Book Friday to Sunday pickups", rule: "pickup weekday in (fri)", members: 231 },
    { name: "Luxury interest", description: "Viewed a luxury vehicle in the last 30 days", rule: "viewed category = luxury", members: 87 },
    { name: "Unsubscribed", description: "Opted out of marketing emails", rule: "unsubscribed = true", members: 19 },
  ].map((s, i) => ({ ...s, id: `seg-${i + 1}`, ...stamp(-180 + i * 9) }));

  const campaigns: Campaign[] = Array.from({ length: 9 }, (_, i) => {
    const status = (["draft", "scheduled", "sent", "sent", "paused"] as const)[i % 5];
    const recipients = int(180, 3200);
    return {
      id: `cmp-${i + 1}`,
      name: pick([
        "Christmas self-drive offer",
        "Airport transfer push",
        "Corporate fleet outreach",
        "Easter weekend special",
        "Win-back — lapsed renters",
        "New arrivals: Spectre",
      ]),
      subject: "Your next Rigi-X rental, on us (almost)",
      status,
      audience: segments[i % segments.length].name,
      templateId: emailTemplates[i % emailTemplates.length].id,
      scheduledAt: status === "scheduled" ? day(int(1, 12)) : null,
      sentAt: status === "sent" ? day(-int(2, 60)) : null,
      recipients,
      opens: status === "sent" ? money(recipients * (0.28 + rnd() * 0.2)) : 0,
      clicks: status === "sent" ? money(recipients * (0.05 + rnd() * 0.06)) : 0,
      ...stamp(-120 + i * 11),
    };
  });

  const emailOutbox: EmailOutbox[] = [
    ...bookings.slice(0, 12).map((b, i) => ({
      id: `out-${i + 1}`,
      to: customers.find((c) => c.id === b.customerId)?.email ?? "guest@example.com",
      subject: `Your Rigi-X booking ${b.reference} is confirmed`,
      body: `<p>Hi, your booking ${b.reference} is confirmed. Total ${b.total} GHS.</p>`,
      templateId: emailTemplates[0].id,
      status: "sent" as const,
      provider: "mock" as const,
      sentAt: day(-int(1, 40)),
      ...stamp(-40 + i),
    })),
    ...payments.slice(0, 8).map((p, i) => ({
      id: `out-r-${i + 1}`,
      to: customers.find((c) => c.id === p.customerId)?.email ?? "guest@example.com",
      subject: `Receipt for payment ${p.reference}`,
      body: `<p>We received ${p.amount} GHS. Thank you.</p>`,
      templateId: emailTemplates[1].id,
      status: "sent" as const,
      provider: "mock" as const,
      sentAt: day(-int(1, 30)),
      ...stamp(-30 + i),
    })),
    ...campaigns
      .filter((c) => c.status === "sent")
      .map((c, i) => ({
        id: `out-c-${i + 1}`,
        to: `${c.recipients} recipients`,
        subject: c.subject,
        body: `<p>Campaign: ${c.name}</p>`,
        templateId: c.templateId,
        status: "sent" as const,
        provider: "mock" as const,
        sentAt: c.sentAt,
        ...stamp(-30 + i),
      })),
    {
      id: "out-pending-1",
      to: customers[3].email,
      subject: "Reset your Rigi-X staff password",
      body: "<p>Use the link to reset your password (expires in 30 minutes).</p>",
      templateId: null,
      status: "queued",
      provider: "mock",
      sentAt: null,
      ...stamp(0),
    },
  ];

  const promoCodes: PromoCode[] = [
    { code: siteConfig.promoCode, kind: "percent" as const, value: 15, startsAt: ymd(-90), expiresAt: ymd(90), usageLimit: 500, used: 132, active: true },
    { code: "WEEKEND10", kind: "percent" as const, value: 10, startsAt: ymd(-120), expiresAt: ymd(180), usageLimit: 1000, used: 341, active: true },
    { code: "AIRPORT50", kind: "fixed" as const, value: 50, startsAt: ymd(-60), expiresAt: ymd(30), usageLimit: 200, used: 88, active: true },
    { code: "LOYAL200", kind: "fixed" as const, value: 200, startsAt: ymd(-200), expiresAt: ymd(-20), usageLimit: 50, used: 50, active: false },
  ].map((p, i) => ({ ...p, id: `promo-${i + 1}`, ...stamp(-200 + i * 20) }));

  const contentItems: ContentItem[] = Array.from({ length: 8 }, (_, i) => ({
    id: `cnt-${i + 1}`,
    title: pick([
      "Top 5 weekend getaways from Accra",
      "Airport transfer — why book ahead",
      "Corporate accounts explained",
      "How our deposit works",
      "Meet the fleet: Rolls-Royce Spectre",
      "Road trip checklist",
    ]),
    channel: (["email", "instagram", "blog", "whatsapp"] as const)[i % 4],
    publishAt: ymd(int(-10, 25)),
    status: (["idea", "draft", "scheduled", "published"] as const)[i % 4],
    owner: staff[(i % 3) + 3].name,
    ...stamp(-40 + i * 5),
  }));

  /* --------------------------------------------------------- platform */
  const locations: Location[] = [
    { name: "Dzorwulu HQ", city: "Accra", address: siteConfig.address, type: "office" as const, active: true },
    { name: "Kotoka International Airport", city: "Accra", address: "Terminal 3 arrivals", type: "airport" as const, active: true },
    { name: "Airport Residential partner bay", city: "Accra", address: "Airport Residential Area", type: "partner" as const, active: true },
    { name: "Kumasi drop-off point", city: "Kumasi", address: "Adum, Kumasi", type: "partner" as const, active: false },
  ].map((l, i) => ({ ...l, id: `loc-${i + 1}`, ...stamp(-300 + i * 10) }));

  const settings: Setting[] = [
    { key: "business.name", value: siteConfig.name, group: "Business profile", label: "Business name" },
    { key: "business.email", value: siteConfig.emailAdmin, group: "Business profile", label: "Main email" },
    { key: "business.phone", value: siteConfig.phone, group: "Business profile", label: "Phone" },
    { key: "business.address", value: siteConfig.address, group: "Business profile", label: "Address" },
    { key: "business.tin", value: "C0012345678", group: "Business profile", label: "TIN" },
    { key: "tax.vat", value: "15", group: "Taxes & fees", label: "VAT / NHIL / GETFund levy (%)" },
    { key: "tax.enabled", value: "true", group: "Taxes & fees", label: "Apply tax at checkout" },
    { key: "fee.delivery", value: "80", group: "Taxes & fees", label: "Delivery fee (GHS)" },
    { key: "pricing.weekendMultiplier", value: "1.15", group: "Pricing rules", label: "Weekend multiplier" },
    { key: "pricing.longRentalDiscount", value: "10", group: "Pricing rules", label: "7+ day discount (%)" },
    { key: "pricing.minAgeLuxury", value: "25", group: "Pricing rules", label: "Minimum age — luxury" },
    { key: "payment.provider", value: "Paystack (demo mode)", group: "Payment settings", label: "Provider" },
    { key: "payment.currency", value: "GHS", group: "Payment settings", label: "Currency" },
    { key: "payment.expiryMinutes", value: "30", group: "Payment settings", label: "Pending booking expiry (minutes)" },
    { key: "notify.newBooking", value: "true", group: "Notifications", label: "Email me on new bookings" },
    { key: "notify.lowStock", value: "true", group: "Notifications", label: "Low stock alerts" },
    { key: "notify.overdueReturn", value: "true", group: "Notifications", label: "Overdue return alerts" },
    { key: "email.provider", value: "Mock provider (not connected)", group: "Notifications", label: "Email provider" },
  ].map((s, i) => ({ ...s, id: `set-${i + 1}`, ...stamp(-250 + i) }));

  const files: FileRecord[] = [
    ...customers.slice(0, 10).flatMap((c, i) => [
      { id: `file-${i + 1}`, name: `${c.name.split(" ")[0]}-ghana-card.jpg`, mime: "image/jpeg", sizeKb: int(320, 1800), owner: "guest" as const, ownerId: c.id, bookingId: bookings[i % bookings.length].id },
      { id: `file-g${i + 1}`, name: `${c.name.split(" ")[0]}-licence.pdf`, mime: "application/pdf", sizeKb: int(200, 900), owner: "guest" as const, ownerId: c.id, bookingId: bookings[i % bookings.length].id },
    ]),
    ...vehicles.map((v, i) => ({
      id: `file-${i + 20}`,
      name: `${v.slug}-roadworthy.pdf`,
      mime: "application/pdf",
      sizeKb: int(150, 700),
      owner: "staff" as const,
      ownerId: staff[7].id,
      bookingId: null,
    })),
  ].map((f, i) => ({ ...f, bookingId: (f as { bookingId: string | null }).bookingId, ...stamp(-120 + i) }));

  const auditLogs: AuditLog[] = Array.from({ length: 28 }, (_, i) => {
    const actor = staff[i % staff.length];
    const entity = pick(["Booking", "Payment", "Customer", "Vehicle", "Employee", "Promo code"]);
    const action = pick(["created", "updated", "deleted", "revealed sensitive data", "exported"]);
    return {
      id: `aud-${i + 1}`,
      actorId: actor.id,
      actorName: actor.name,
      action,
      entity,
      entityId: `${entity.toLowerCase().slice(0, 3)}-${int(1, 40)}`,
      detail: `${action} ${entity.toLowerCase()} record`,
      ip: `10.0.${int(0, 4)}.${int(2, 240)}`,
      ...stamp(-int(0, 45)),
    };
  });

  /* ---------------------------------------------------- inspections */
  const inspections: Inspection[] = bookings
    .filter((b) => b.status === "active" || b.status === "returned" || b.status === "closed")
    .map((b, i) => ({
      id: `ins-${i + 1}`,
      bookingId: b.id,
      vehicleId: b.vehicleId,
      kind: (i % 2 === 0 ? "check_out" : "check_in") as Inspection["kind"],
      odometerKm: vehicles.find((v) => v.id === b.vehicleId)!.odometerKm + i * 40,
      fuelLevel: int(60, 100),
      damage: i % 7 === 0 ? "Small scuff on rear bumper" : "",
      checklist: [
        { label: "Tyres & spare", ok: true },
        { label: "Lights & indicators", ok: i % 5 !== 0 },
        { label: "Wipers", ok: true },
        { label: "Documents in glovebox", ok: true },
        { label: "Cleanliness", ok: i % 4 !== 0 },
      ],
      by: staff[7].name,
      ...stamp(-25 + i),
    }));

  return {
    staff,
    customers,
    vehicles,
    vehicleDocuments,
    inspections,
    drivers,
    bookings,
    quotes,
    leads,
    payments,
    refunds,
    deposits,
    invoices,
    expenses,
    maintenanceOrders,
    maintenanceSchedules,
    vendors,
    inventoryItems,
    stockMovements,
    purchaseOrders,
    suppliers,
    tickets,
    ticketMessages,
    reviews,
    faqs,
    employees,
    attendance,
    leaveRequests,
    payrollRuns,
    payslips,
    applicants,
    campaigns,
    emailTemplates,
    emailOutbox,
    segments,
    promoCodes,
    contentItems,
    auditLogs,
    locations,
    settings,
    files,
  };
}
