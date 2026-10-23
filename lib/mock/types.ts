// Entity shapes for the in-browser mock database.
// Every row also carries `id`, `createdAt` and `updatedAt` (see Omit<Base, ...> usage).
// Money is stored as plain GHS numbers and rendered with formatGHS().

import type { Role } from "@/lib/permissions";

export interface Base {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export type Id<T extends Base> = Omit<T, keyof Base>;

/* ---------------------------------------------------------------- staff */

export interface StaffUser extends Base {
  name: string;
  email: string;
  role: Role;
  phone: string;
  department: string;
  active: boolean;
  lastLogin: string | null;
  mustChangePassword: boolean;
}

/* ------------------------------------------------------------ customers */

export type CustomerTier = "new" | "silver" | "gold" | "platinum";

export interface Customer extends Base {
  name: string;
  email: string;
  phone: string;
  phoneAlt: string;
  city: string;
  address: string;
  nationality: "Ghana resident" | "International visitor";
  idType: "Ghana Card" | "Passport" | "National ID";
  idNumber: string;
  licenceNumber: string;
  licenceExpiry: string;
  dateOfBirth: string;
  tier: CustomerTier;
  tags: string[];
  segment: string;
  verified: boolean;
  blacklisted: boolean;
  blacklistReason: string;
  totalSpend: number;
  rentals: number;
  notes: string;
}

/* --------------------------------------------------------------- fleet */

export type VehicleStatus =
  | "available"
  | "rented"
  | "reserved"
  | "in_maintenance"
  | "out_of_service";

export interface Vehicle extends Base {
  slug: string;
  name: string;
  brand: string;
  year: number;
  category: "economy" | "sedan" | "suv" | "luxury" | "van";
  plate: string;
  vin: string;
  colour: string;
  seats: number;
  transmission: string;
  fuel: string;
  odometerKm: number;
  status: VehicleStatus;
  pricePerDay: number;
  deposit: number;
  location: string;
  minAge: number;
  insuranceExpiry: string;
  registrationExpiry: string;
  roadworthyExpiry: string;
  nextServiceKm: number;
  nextServiceDate: string;
  utilisation: number;
}

export interface VehicleDocument extends Base {
  vehicleId: string;
  type: "Insurance" | "Registration" | "Roadworthy" | "Inspection" | "Other";
  reference: string;
  expiresAt: string;
  fileId: string;
}

export interface Inspection extends Base {
  bookingId: string;
  vehicleId: string;
  kind: "check_out" | "check_in";
  odometerKm: number;
  fuelLevel: number;
  damage: string;
  checklist: { label: string; ok: boolean }[];
  by: string;
}

export interface Driver extends Base {
  name: string;
  phone: string;
  licenceNumber: string;
  licenceExpiry: string;
  assignedVehicleId: string | null;
  available: boolean;
  rating: number;
  trips: number;
}

/* ------------------------------------------------------------ bookings */

export type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "active"
  | "returned"
  | "closed"
  | "cancelled";

export type BookingChannel = "website" | "walk_in" | "phone" | "whatsapp" | "partner";

export interface BookingExtras {
  childSeat: boolean;
  gps: boolean;
  additionalDriver: boolean;
  chauffeur: boolean;
  fullInsurance: boolean;
}

export interface Booking extends Base {
  reference: string;
  customerId: string;
  vehicleId: string;
  startDate: string;
  endDate: string;
  days: number;
  pickupLocation: string;
  dropoffLocation: string;
  serviceType: "self-drive" | "chauffeur";
  status: BookingStatus;
  channel: BookingChannel;
  extras: BookingExtras;
  subtotal: number;
  extrasTotal: number;
  discount: number;
  tax: number;
  total: number;
  deposit: number;
  paid: number;
  balance: number;
  promoCode: string;
  salespersonId: string | null;
  driverId: string | null;
  notes: string;
}

export interface Quote extends Base {
  reference: string;
  customerName: string;
  email: string;
  vehicleId: string;
  startDate: string;
  endDate: string;
  amount: number;
  status: "draft" | "sent" | "accepted" | "expired";
  validUntil: string;
}

export interface Lead extends Base {
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  value: number;
  stage: "new" | "contacted" | "quoted" | "won" | "lost";
  owner: string;
}

/* ------------------------------------------------------------ payments */

export type PaymentStatus = "initiated" | "success" | "failed" | "refunded";
export type PaymentChannel = "card" | "mobile_money" | "bank_transfer" | "cash";

export interface Payment extends Base {
  reference: string;
  bookingId: string;
  customerId: string;
  amount: number;
  currency: "GHS";
  status: PaymentStatus;
  channel: PaymentChannel;
  paystackReference: string;
  fees: number;
  settled: boolean;
  paidAt: string | null;
}

export interface Refund extends Base {
  paymentId: string;
  bookingId: string;
  amount: number;
  reason: string;
  status: "requested" | "approved" | "paid" | "rejected";
}

export interface Deposit extends Base {
  bookingId: string;
  customerId: string;
  amount: number;
  status: "held" | "released" | "forfeited";
  releasedAt: string | null;
  note: string;
}

export interface Invoice extends Base {
  number: string;
  bookingId: string | null;
  customerId: string;
  type: "invoice" | "receipt";
  issuedAt: string;
  dueAt: string;
  subtotal: number;
  tax: number;
  total: number;
  status: "draft" | "sent" | "paid" | "overdue" | "void";
}

export interface Expense extends Base {
  reference: string;
  category: string;
  vendor: string;
  vehicleId: string | null;
  amount: number;
  spentAt: string;
  status: "pending" | "approved" | "rejected";
  note: string;
}

export interface DepositOrPaymentSummary {
  label: string;
  value: number;
}

/* -------------------------------------------------------- maintenance */

export type MaintenanceStatus =
  | "open"
  | "in_progress"
  | "waiting_parts"
  | "completed"
  | "cancelled";

export interface MaintenanceOrder extends Base {
  reference: string;
  vehicleId: string;
  vendorId: string | null;
  mechanic: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: MaintenanceStatus;
  kind: "service" | "repair" | "accident";
  description: string;
  odometerKm: number;
  labourCost: number;
  partsCost: number;
  openedAt: string;
  closedAt: string | null;
}

export interface MaintenanceSchedule extends Base {
  vehicleId: string;
  service: string;
  intervalKm: number;
  intervalDays: number;
  dueAt: string;
  dueKm: number;
  overdue: boolean;
}

export interface Vendor extends Base {
  name: string;
  type: "garage" | "parts" | "tyres" | "detailing" | "insurance";
  contact: string;
  phone: string;
  email: string;
  rating: number;
}

/* --------------------------------------------------------- inventory */

export interface InventoryItem extends Base {
  sku: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  reorderLevel: number;
  unitCost: number;
  location: string;
  supplierId: string | null;
}

export interface StockMovement extends Base {
  itemId: string;
  kind: "in" | "out" | "adjust";
  quantity: number;
  reason: string;
  workOrderId: string | null;
  by: string;
}

export interface PurchaseOrder extends Base {
  number: string;
  supplierId: string;
  status: "draft" | "ordered" | "received" | "cancelled";
  orderedAt: string;
  expectedAt: string;
  total: number;
  lines: { itemId: string; name: string; quantity: number; unitCost: number }[];
}

export interface Supplier extends Base {
  name: string;
  contact: string;
  phone: string;
  email: string;
  category: string;
  leadTimeDays: number;
}

/* ------------------------------------------------------- service desk */

export type TicketStatus = "open" | "pending" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";

export interface Ticket extends Base {
  reference: string;
  subject: string;
  customerId: string;
  channel: "whatsapp" | "email" | "phone" | "web";
  status: TicketStatus;
  priority: TicketPriority;
  assigneeId: string | null;
  slaDueAt: string;
  category: "booking" | "payment" | "vehicle" | "damage" | "general";
  summary: string;
}

export interface TicketMessage extends Base {
  ticketId: string;
  author: string;
  internal: boolean;
  body: string;
}

export interface Review extends Base {
  customerId: string;
  vehicleId: string | null;
  rating: number;
  title: string;
  body: string;
  approved: boolean;
  publishedAt: string | null;
}

export interface FaqArticle extends Base {
  question: string;
  answer: string;
  category: string;
  published: boolean;
  views: number;
}

/* ---------------------------------------------------------------- hr */

export interface Employee extends Base {
  staffNo: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  jobTitle: string;
  contract: "full_time" | "part_time" | "contract";
  startDate: string;
  grossMonthly: number;
  allowances: number;
  emergencyName: string;
  emergencyPhone: string;
  active: boolean;
}

export interface Attendance extends Base {
  employeeId: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  hours: number;
  status: "present" | "late" | "absent" | "leave";
}

export interface LeaveRequest extends Base {
  employeeId: string;
  type: "annual" | "sick" | "unpaid" | "maternity";
  from: string;
  to: string;
  days: number;
  status: "pending" | "approved" | "rejected";
  reason: string;
}

export interface PayrollRun extends Base {
  period: string;
  gross: number;
  ssnit: number;
  paye: number;
  net: number;
  status: "draft" | "approved" | "paid";
  employees: number;
}

export interface Payslip extends Base {
  payrollRunId: string;
  employeeId: string;
  basic: number;
  allowances: number;
  ssnit: number;
  paye: number;
  otherDeductions: number;
  net: number;
}

export interface Applicant extends Base {
  name: string;
  role: string;
  email: string;
  stage: "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";
  appliedAt: string;
  rating: number;
}

/* --------------------------------------------------------- marketing */

export interface Campaign extends Base {
  name: string;
  subject: string;
  status: "draft" | "scheduled" | "sent" | "paused";
  audience: string;
  templateId: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  recipients: number;
  opens: number;
  clicks: number;
}

export interface EmailTemplate extends Base {
  name: string;
  category: "promo" | "reminder" | "thank_you" | "win_back" | "newsletter" | "transactional";
  subject: string;
  body: string;
  updatedBy: string;
}

export interface EmailOutbox extends Base {
  to: string;
  subject: string;
  body: string;
  templateId: string | null;
  status: "queued" | "sent" | "failed";
  provider: "mock" | "resend";
  sentAt: string | null;
}

export interface Segment extends Base {
  name: string;
  description: string;
  rule: string;
  members: number;
}

export interface PromoCode extends Base {
  code: string;
  kind: "percent" | "fixed";
  value: number;
  startsAt: string;
  expiresAt: string;
  usageLimit: number;
  used: number;
  active: boolean;
}

export interface ContentItem extends Base {
  title: string;
  channel: "email" | "instagram" | "blog" | "whatsapp";
  publishAt: string;
  status: "idea" | "draft" | "scheduled" | "published";
  owner: string;
}

/* ---------------------------------------------------------- platform */

export interface AuditLog extends Base {
  actorId: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  detail: string;
  ip: string;
}

export interface Location extends Base {
  name: string;
  city: string;
  address: string;
  type: "office" | "airport" | "partner";
  active: boolean;
}

export interface Setting extends Base {
  key: string;
  value: string;
  group: string;
  label: string;
}

export interface FileRecord extends Base {
  name: string;
  mime: string;
  sizeKb: number;
  owner: "staff" | "guest";
  ownerId: string;
  bookingId: string | null;
}
