"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Ban, Check, Pencil, Plus, Send, Trash2 } from "lucide-react";
import {
  Checkbox,
  ConfirmDialog,
  DataTable,
  Field,
  FilterSelect,
  KpiCard,
  PageHeader,
  SelectInput,
  SlideOver,
  StatusPill,
  Tabs,
  TextArea,
  TextInput,
  type Column,
  type TabDef,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useOptionalAdminSession } from "@/components/admin/session";
import { hasCapability } from "@/lib/permissions";
import {
  deleteRow,
  insertRow,
  logAudit,
  updateRow,
  useDb,
  withLatency,
} from "@/lib/mock/store";
import type {
  Booking,
  BookingChannel,
  BookingExtras,
  BookingStatus,
  Lead,
  Quote,
} from "@/lib/mock/types";
import { cars } from "@/data/cars";
import { calculateCheckoutTotals } from "@/lib/pricing";
import { formatDate, formatGHS, getDaysBetween } from "@/lib/utils";

const BOOKING_STATUSES: BookingStatus[] = [
  "pending_payment",
  "confirmed",
  "active",
  "returned",
  "closed",
  "cancelled",
];
const BOOKING_CHANNELS: BookingChannel[] = ["website", "walk_in", "phone", "whatsapp", "partner"];
const QUOTE_STATUSES: Quote["status"][] = ["draft", "sent", "accepted", "expired"];
const LEAD_STAGES: Lead["stage"][] = ["new", "contacted", "quoted", "won", "lost"];
const LOCATIONS = [
  "Accra Airport (KIA)",
  "Dzorwulu",
  "Airport Residential",
  "East Legon",
  "Osu",
  "Hotel delivery",
];

function emptyExtras(): BookingExtras {
  return {
    childSeat: false,
    gps: false,
    additionalDriver: false,
    chauffeur: false,
    fullInsurance: false,
  };
}

const iso = (date: Date) => date.toISOString().slice(0, 10);
const num = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

interface DeleteTarget {
  collection: "bookings" | "quotes" | "leads";
  id: string;
  label: string;
  entity: string;
}

interface CreateBookingForm {
  mode: "existing" | "guest";
  customerId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  vehicleId: string;
  startDate: string;
  endDate: string;
  serviceType: Booking["serviceType"];
  pickupLocation: string;
  dropoffLocation: string;
  channel: Booking["channel"];
  extras: BookingExtras;
  promoCode: string;
  deliver: boolean;
  salespersonId: string;
  driverId: string;
  notes: string;
}

function defaultCreateForm(): CreateBookingForm {
  const start = new Date();
  const end = new Date(Date.now() + 2 * 86_400_000);
  return {
    mode: "existing",
    customerId: "",
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    vehicleId: "",
    startDate: iso(start),
    endDate: iso(end),
    serviceType: "self-drive",
    pickupLocation: LOCATIONS[0],
    dropoffLocation: LOCATIONS[0],
    channel: "website",
    extras: emptyExtras(),
    promoCode: "",
    deliver: false,
    salespersonId: "",
    driverId: "",
    notes: "",
  };
}

interface EditBookingForm {
  startDate: string;
  endDate: string;
  serviceType: Booking["serviceType"];
  pickupLocation: string;
  dropoffLocation: string;
  status: Booking["status"];
  channel: Booking["channel"];
  extras: BookingExtras;
  subtotal: string;
  extrasTotal: string;
  discount: string;
  tax: string;
  total: string;
  deposit: string;
  paid: string;
  balance: string;
  promoCode: string;
  salespersonId: string;
  driverId: string;
  notes: string;
}

function toEditBookingForm(booking: Booking): EditBookingForm {
  return {
    startDate: booking.startDate,
    endDate: booking.endDate,
    serviceType: booking.serviceType,
    pickupLocation: booking.pickupLocation,
    dropoffLocation: booking.dropoffLocation,
    status: booking.status,
    channel: booking.channel,
    extras: { ...booking.extras },
    subtotal: String(booking.subtotal),
    extrasTotal: String(booking.extrasTotal),
    discount: String(booking.discount),
    tax: String(booking.tax),
    total: String(booking.total),
    deposit: String(booking.deposit),
    paid: String(booking.paid),
    balance: String(booking.balance),
    promoCode: booking.promoCode,
    salespersonId: booking.salespersonId ?? "",
    driverId: booking.driverId ?? "",
    notes: booking.notes,
  };
}

interface QuoteForm {
  reference: string;
  customerName: string;
  email: string;
  vehicleId: string;
  startDate: string;
  endDate: string;
  amount: string;
  status: Quote["status"];
  validUntil: string;
}

function defaultQuoteForm(nextReference: string): QuoteForm {
  const start = new Date(Date.now() + 2 * 86_400_000);
  const end = new Date(Date.now() + 5 * 86_400_000);
  const valid = new Date(Date.now() + 14 * 86_400_000);
  return {
    reference: nextReference,
    customerName: "",
    email: "",
    vehicleId: "",
    startDate: iso(start),
    endDate: iso(end),
    amount: "0",
    status: "draft",
    validUntil: iso(valid),
  };
}

interface LeadForm {
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  value: string;
  stage: Lead["stage"];
  owner: string;
}

function defaultLeadForm(owner: string): LeadForm {
  return {
    name: "",
    company: "",
    email: "",
    phone: "",
    source: "Website",
    value: "0",
    stage: "new",
    owner,
  };
}

export default function AdminSalesPage() {
  const db = useDb();
  const { toast } = useToast();
  const session = useOptionalAdminSession();
  const role = session?.role;
  const actorName = session?.session.name ?? "Admin";
  const canDelete = role ? hasCapability(role, "delete_records") : false;

  const [tab, setTab] = useState("bookings");
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  /* ---------------------------------------------------------- bookings */
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateBookingForm>(() => defaultCreateForm());
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [editBookingForm, setEditBookingForm] = useState<EditBookingForm | null>(null);

  /* ------------------------------------------------------------ quotes */
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteEditing, setQuoteEditing] = useState<Quote | null>(null);
  const [quoteForm, setQuoteForm] = useState<QuoteForm>(() => defaultQuoteForm(""));

  /* ------------------------------------------------------------- leads */
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadEditing, setLeadEditing] = useState<Lead | null>(null);
  const [leadForm, setLeadForm] = useState<LeadForm>(() => defaultLeadForm(""));

  const handledQuery = useRef(false);
  useEffect(() => {
    if (handledQuery.current || typeof window === "undefined") return;
    handledQuery.current = true;
    const requested = new URLSearchParams(window.location.search).get("new");
    if (requested !== "booking") return;
    // Deferred so the external query-param read never triggers a cascading render.
    queueMicrotask(() => {
      setTab("bookings");
      setCreateForm(defaultCreateForm());
      setCreateOpen(true);
    });
  }, []);

  const bookings = db.bookings;
  const quotes = db.quotes;
  const leads = db.leads;

  const customerById = (id: string) => db.customers.find((customer) => customer.id === id);
  const vehicleById = (id: string) => db.vehicles.find((vehicle) => vehicle.id === id);
  const staffById = (id: string) => db.staff.find((member) => member.id === id);
  const driverById = (id: string) => db.drivers.find((driver) => driver.id === id);

  const metrics = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const revenueMonth = db.payments
      .filter((payment) => payment.status === "success")
      .filter((payment) => (payment.paidAt ? new Date(payment.paidAt).getTime() : 0) >= startOfMonth)
      .reduce((sum, payment) => sum + payment.amount, 0);

    const activeRentals = bookings.filter((booking) => booking.status === "active").length;
    const awaitingPayment = bookings.filter((booking) => booking.status === "pending_payment").length;
    const won = leads.filter((lead) => lead.stage === "won").length;
    const conversion = leads.length ? Math.round((won / leads.length) * 100) : 0;

    return { revenueMonth, activeRentals, awaitingPayment, conversion, won };
  }, [db.payments, bookings, leads]);

  const tabs: TabDef[] = [
    { id: "bookings", label: "Bookings", count: bookings.length },
    { id: "quotes", label: "Quotes", count: quotes.length },
    { id: "leads", label: "Leads", count: leads.length },
  ];

  const filteredBookings = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          (statusFilter === "all" || booking.status === statusFilter) &&
          (channelFilter === "all" || booking.channel === channelFilter)
      ),
    [bookings, statusFilter, channelFilter]
  );

  const createTotals = useMemo(() => {
    const vehicle = db.vehicles.find((item) => item.id === createForm.vehicleId);
    const car = vehicle ? cars.find((item) => item.slug === vehicle.slug) : undefined;
    if (!car || !createForm.startDate || !createForm.endDate) return null;
    const start = new Date(createForm.startDate);
    const end = new Date(createForm.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;

    const setting = (key: string, fallback = "") =>
      db.settings.find((row) => row.key === key)?.value ?? fallback;
    const promo = db.promoCodes.find(
      (code) =>
        code.active && code.code.toLowerCase() === createForm.promoCode.trim().toLowerCase()
    );
    const taxEnabled = setting("tax.enabled") === "true";
    const taxRate = taxEnabled ? Number(setting("tax.vat", "0")) || 0 : 0;
    const deliveryFee = Number(setting("fee.delivery", "80")) || 80;

    return calculateCheckoutTotals(car, start, end, createForm.extras, {
      promoPercent: promo?.kind === "percent" ? promo.value : 0,
      promoFixed: promo?.kind === "fixed" ? promo.value : 0,
      promoLabel: promo?.code ?? "",
      taxRate,
      delivery: createForm.deliver,
      deliveryFee,
    });
  }, [db.settings, db.promoCodes, db.vehicles, createForm]);

  /* --------------------------------------------------- booking columns */
  const bookingColumns: Column<Booking>[] = [
    {
      key: "reference",
      header: "Reference",
      render: (booking) => <span className="font-medium">{booking.reference}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      hideBelow: "sm",
      value: (booking) => customerById(booking.customerId)?.name ?? "Guest",
      render: (booking) => customerById(booking.customerId)?.name ?? "Guest",
    },
    {
      key: "vehicle",
      header: "Vehicle",
      value: (booking) => vehicleById(booking.vehicleId)?.name ?? "Vehicle",
      render: (booking) => {
        const vehicle = vehicleById(booking.vehicleId);
        return (
          <span className="block">
            <span className="block">{vehicle?.name ?? "Vehicle"}</span>
            <span className="block text-[11px] text-muted">{vehicle?.plate ?? ""}</span>
          </span>
        );
      },
    },
    {
      key: "startDate",
      header: "Start",
      hideBelow: "md",
      value: (booking) => booking.startDate,
      render: (booking) => formatDate(new Date(booking.startDate)),
    },
    {
      key: "endDate",
      header: "End",
      hideBelow: "lg",
      value: (booking) => booking.endDate,
      render: (booking) => formatDate(new Date(booking.endDate)),
    },
    { key: "days", header: "Days", align: "right", hideBelow: "md", value: (booking) => booking.days },
    {
      key: "status",
      header: "Status",
      value: (booking) => booking.status,
      render: (booking) => <StatusPill status={booking.status} />,
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      value: (booking) => booking.total,
      render: (booking) => formatGHS(booking.total),
    },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      hideBelow: "sm",
      value: (booking) => booking.balance,
      render: (booking) => formatGHS(booking.balance),
    },
  ];

  const quoteColumns: Column<Quote>[] = [
    {
      key: "reference",
      header: "Reference",
      render: (quote) => <span className="font-medium">{quote.reference}</span>,
    },
    { key: "customerName", header: "Customer", value: (quote) => quote.customerName },
    { key: "email", header: "Email", hideBelow: "md", value: (quote) => quote.email },
    {
      key: "vehicle",
      header: "Vehicle",
      value: (quote) => vehicleById(quote.vehicleId)?.name ?? "Vehicle",
      render: (quote) => vehicleById(quote.vehicleId)?.name ?? "Vehicle",
    },
    {
      key: "startDate",
      header: "Start",
      hideBelow: "lg",
      value: (quote) => quote.startDate,
      render: (quote) => formatDate(new Date(quote.startDate)),
    },
    {
      key: "endDate",
      header: "End",
      hideBelow: "lg",
      value: (quote) => quote.endDate,
      render: (quote) => formatDate(new Date(quote.endDate)),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      value: (quote) => quote.amount,
      render: (quote) => formatGHS(quote.amount),
    },
    {
      key: "status",
      header: "Status",
      value: (quote) => quote.status,
      render: (quote) => <StatusPill status={quote.status} />,
    },
    {
      key: "validUntil",
      header: "Valid until",
      hideBelow: "md",
      value: (quote) => quote.validUntil,
      render: (quote) => formatDate(new Date(quote.validUntil)),
    },
  ];

  const leadColumns: Column<Lead>[] = [
    { key: "name", header: "Name", render: (lead) => <span className="font-medium">{lead.name}</span> },
    {
      key: "company",
      header: "Company",
      hideBelow: "md",
      value: (lead) => lead.company,
      render: (lead) => lead.company || "—",
    },
    { key: "email", header: "Email", hideBelow: "lg", value: (lead) => lead.email },
    { key: "phone", header: "Phone", hideBelow: "lg", value: (lead) => lead.phone },
    { key: "source", header: "Source", hideBelow: "sm", value: (lead) => lead.source },
    {
      key: "value",
      header: "Value",
      align: "right",
      value: (lead) => lead.value,
      render: (lead) => formatGHS(lead.value),
    },
    {
      key: "stage",
      header: "Stage",
      value: (lead) => lead.stage,
      render: (lead) => <StatusPill status={lead.stage} />,
    },
    { key: "owner", header: "Owner", hideBelow: "md", value: (lead) => lead.owner },
  ];

  /* ------------------------------------------------------- mutations */
  const confirmDelete = async (target: DeleteTarget) => {
    await withLatency(null, 400);
    deleteRow(target.collection, target.id);
    logAudit({
      actorName,
      action: "deleted",
      entity: target.entity,
      entityId: target.id,
      detail: `Deleted ${target.label}`,
    });
    toast({ title: `${target.entity} deleted`, description: target.label, variant: "info" });
  };

  const submitCreateBooking = async () => {
    setSaving(true);
    try {
      if (!createForm.vehicleId) throw new Error("Select a vehicle.");
      if (!createForm.startDate || !createForm.endDate)
        throw new Error("Choose pickup and return dates.");
      if (new Date(createForm.endDate) <= new Date(createForm.startDate))
        throw new Error("The return date must be after the pickup date.");
      if (createForm.mode === "existing" && !createForm.customerId)
        throw new Error("Select an existing customer.");
      if (
        createForm.mode === "guest" &&
        !(createForm.guestName.trim() && createForm.guestEmail.trim())
      )
        throw new Error("Enter the guest name and email.");
      if (!createTotals) throw new Error("Unable to price this vehicle and date range.");

      await withLatency(null, 500);

      let customerId = createForm.customerId;
      if (createForm.mode === "guest") {
        const created = insertRow("customers", {
          name: createForm.guestName.trim(),
          email: createForm.guestEmail.trim(),
          phone: createForm.guestPhone.trim(),
          phoneAlt: "",
          city: "",
          address: "",
          nationality: "Ghana resident",
          idType: "Ghana Card",
          idNumber: "",
          licenceNumber: "",
          licenceExpiry: "",
          dateOfBirth: "",
          tier: "new",
          tags: ["guest"],
          segment: "New",
          verified: false,
          blacklisted: false,
          blacklistReason: "",
          totalSpend: 0,
          rentals: 0,
          notes: "",
        });
        customerId = created.id;
        logAudit({
          actorName,
          action: "created",
          entity: "Customer",
          entityId: created.id,
          detail: `Created guest ${created.name}`,
        });
      }

      const booking = insertRow("bookings", {
        reference: `RGX-${String(Date.now()).slice(-6)}`,
        customerId,
        vehicleId: createForm.vehicleId,
        startDate: createForm.startDate,
        endDate: createForm.endDate,
        days: createTotals.days,
        pickupLocation: createForm.pickupLocation,
        dropoffLocation: createForm.dropoffLocation,
        serviceType: createForm.serviceType,
        status: "confirmed",
        channel: createForm.channel,
        extras: createForm.extras,
        subtotal: createTotals.subtotal,
        extrasTotal: createTotals.extrasCost,
        discount: createTotals.discount,
        tax: createTotals.tax,
        total: createTotals.total,
        deposit: createTotals.deposit,
        paid: 0,
        balance: createTotals.total,
        promoCode: createForm.promoCode.trim().toUpperCase(),
        salespersonId: createForm.salespersonId || null,
        driverId: createForm.driverId || null,
        notes: createForm.notes,
      });
      logAudit({
        actorName,
        action: "created",
        entity: "Booking",
        entityId: booking.id,
        detail: `Created ${booking.reference}`,
      });
      toast({ title: "Booking created", description: `${booking.reference} is confirmed.` });
      setCreateOpen(false);
      setCreateForm(defaultCreateForm());
    } catch (error) {
      toast({
        title: "Could not create booking",
        description: error instanceof Error ? error.message : "Unexpected error.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const submitEditBooking = async () => {
    if (!editBooking || !editBookingForm) return;
    setSaving(true);
    try {
      if (!editBookingForm.startDate || !editBookingForm.endDate)
        throw new Error("Dates are required.");
      await withLatency(null, 500);
      const days = getDaysBetween(
        new Date(editBookingForm.startDate),
        new Date(editBookingForm.endDate)
      );
      updateRow("bookings", editBooking.id, {
        startDate: editBookingForm.startDate,
        endDate: editBookingForm.endDate,
        days,
        serviceType: editBookingForm.serviceType,
        pickupLocation: editBookingForm.pickupLocation,
        dropoffLocation: editBookingForm.dropoffLocation,
        status: editBookingForm.status,
        channel: editBookingForm.channel,
        extras: editBookingForm.extras,
        subtotal: num(editBookingForm.subtotal),
        extrasTotal: num(editBookingForm.extrasTotal),
        discount: num(editBookingForm.discount),
        tax: num(editBookingForm.tax),
        total: num(editBookingForm.total),
        deposit: num(editBookingForm.deposit),
        paid: num(editBookingForm.paid),
        balance: num(editBookingForm.balance),
        promoCode: editBookingForm.promoCode,
        salespersonId: editBookingForm.salespersonId || null,
        driverId: editBookingForm.driverId || null,
        notes: editBookingForm.notes,
      });
      logAudit({
        actorName,
        action: "updated",
        entity: "Booking",
        entityId: editBooking.id,
        detail: `Updated ${editBooking.reference}`,
      });
      toast({ title: "Booking updated", description: editBooking.reference });
      setEditBooking(null);
      setEditBookingForm(null);
    } catch (error) {
      toast({
        title: "Could not update booking",
        description: error instanceof Error ? error.message : "Unexpected error.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const submitQuote = async () => {
    setSaving(true);
    try {
      if (!quoteForm.reference.trim()) throw new Error("A reference is required.");
      if (!quoteForm.customerName.trim()) throw new Error("Enter the customer name.");
      if (!quoteForm.vehicleId) throw new Error("Select a vehicle.");
      await withLatency(null, 500);
      if (quoteEditing) {
        updateRow("quotes", quoteEditing.id, {
          reference: quoteForm.reference.trim(),
          customerName: quoteForm.customerName.trim(),
          email: quoteForm.email.trim(),
          vehicleId: quoteForm.vehicleId,
          startDate: quoteForm.startDate,
          endDate: quoteForm.endDate,
          amount: num(quoteForm.amount),
          status: quoteForm.status,
          validUntil: quoteForm.validUntil,
        });
        logAudit({
          actorName,
          action: "updated",
          entity: "Quote",
          entityId: quoteEditing.id,
          detail: `Updated ${quoteForm.reference}`,
        });
        toast({ title: "Quote updated", description: quoteForm.reference });
      } else {
        const created = insertRow("quotes", {
          reference: quoteForm.reference.trim(),
          customerName: quoteForm.customerName.trim(),
          email: quoteForm.email.trim(),
          vehicleId: quoteForm.vehicleId,
          startDate: quoteForm.startDate,
          endDate: quoteForm.endDate,
          amount: num(quoteForm.amount),
          status: quoteForm.status,
          validUntil: quoteForm.validUntil,
        });
        logAudit({
          actorName,
          action: "created",
          entity: "Quote",
          entityId: created.id,
          detail: `Created ${created.reference}`,
        });
        toast({ title: "Quote created", description: created.reference });
      }
      setQuoteOpen(false);
      setQuoteEditing(null);
    } catch (error) {
      toast({
        title: "Could not save quote",
        description: error instanceof Error ? error.message : "Unexpected error.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const markQuote = async (quote: Quote, status: Quote["status"]) => {
    await withLatency(null, 350);
    updateRow("quotes", quote.id, { status });
    logAudit({
      actorName,
      action: "updated",
      entity: "Quote",
      entityId: quote.id,
      detail: `Marked ${quote.reference} as ${status}`,
    });
    toast({ title: `Quote marked ${status}`, description: quote.reference });
  };

  const submitLead = async () => {
    setSaving(true);
    try {
      if (!leadForm.name.trim()) throw new Error("Enter the lead name.");
      await withLatency(null, 500);
      if (leadEditing) {
        updateRow("leads", leadEditing.id, {
          name: leadForm.name.trim(),
          company: leadForm.company.trim(),
          email: leadForm.email.trim(),
          phone: leadForm.phone.trim(),
          source: leadForm.source,
          value: num(leadForm.value),
          stage: leadForm.stage,
          owner: leadForm.owner,
        });
        logAudit({
          actorName,
          action: "updated",
          entity: "Lead",
          entityId: leadEditing.id,
          detail: `Updated ${leadForm.name}`,
        });
        toast({ title: "Lead updated", description: leadForm.name });
      } else {
        const created = insertRow("leads", {
          name: leadForm.name.trim(),
          company: leadForm.company.trim(),
          email: leadForm.email.trim(),
          phone: leadForm.phone.trim(),
          source: leadForm.source,
          value: num(leadForm.value),
          stage: leadForm.stage,
          owner: leadForm.owner,
        });
        logAudit({
          actorName,
          action: "created",
          entity: "Lead",
          entityId: created.id,
          detail: `Created ${created.name}`,
        });
        toast({ title: "Lead created", description: created.name });
      }
      setLeadOpen(false);
      setLeadEditing(null);
    } catch (error) {
      toast({
        title: "Could not save lead",
        description: error instanceof Error ? error.message : "Unexpected error.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const moveLeadStage = async (lead: Lead, stage: Lead["stage"]) => {
    await withLatency(null, 350);
    updateRow("leads", lead.id, { stage });
    logAudit({
      actorName,
      action: "updated",
      entity: "Lead",
      entityId: lead.id,
      detail: `Moved ${lead.name} to ${stage}`,
    });
    toast({ title: "Lead stage updated", description: `${lead.name} → ${stage}` });
  };

  const rowActionClass =
    "rounded-lg p-1.5 text-muted transition-colors hover:bg-mist hover:text-ink";

  const headerAction =
    tab === "bookings" ? (
      <Button
        size="sm"
        onClick={() => {
          setCreateForm(defaultCreateForm());
          setCreateOpen(true);
        }}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        New booking
      </Button>
    ) : tab === "quotes" ? (
      <Button
        size="sm"
        onClick={() => {
          setQuoteEditing(null);
          setQuoteForm(defaultQuoteForm(`QTE-${String(Date.now()).slice(-4)}`));
          setQuoteOpen(true);
        }}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        New quote
      </Button>
    ) : (
      <Button
        size="sm"
        onClick={() => {
          setLeadEditing(null);
          setLeadForm(defaultLeadForm(db.staff[3]?.name ?? ""));
          setLeadOpen(true);
        }}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        New lead
      </Button>
    );

  return (
    <>
      <PageHeader
        title="Sales"
        description="Bookings, quotes and the lead pipeline in one view."
        actions={headerAction}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Revenue this month"
          value={formatGHS(metrics.revenueMonth)}
          sub="Settled payments"
          tone="positive"
        />
        <KpiCard label="Active rentals" value={String(metrics.activeRentals)} sub="On the road now" />
        <KpiCard
          label="Awaiting payment"
          value={String(metrics.awaitingPayment)}
          sub="Pending bookings"
          tone="warning"
        />
        <KpiCard
          label="Lead conversion"
          value={`${metrics.conversion}%`}
          sub={`${metrics.won} of ${leads.length} leads won`}
        />
      </div>

      <div className="mt-5">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      {tab === "bookings" && (
        <DataTable<Booking>
          columns={bookingColumns}
          rows={filteredBookings}
          exportFilename="bookings.csv"
          initialSort={{ key: "startDate", dir: "asc" }}
          searchPlaceholder="Search reference, customer, plate…"
          searchFields={(booking) => {
            const customer = customerById(booking.customerId);
            const vehicle = vehicleById(booking.vehicleId);
            return [
              booking.reference,
              customer?.name,
              customer?.email,
              vehicle?.name,
              vehicle?.plate,
            ]
              .filter(Boolean)
              .join(" ");
          }}
          filters={
            <>
              <FilterSelect
                label="Status"
                value={statusFilter}
                options={["all", ...BOOKING_STATUSES]}
                onChange={setStatusFilter}
              />
              <FilterSelect
                label="Channel"
                value={channelFilter}
                options={["all", ...BOOKING_CHANNELS]}
                onChange={setChannelFilter}
              />
            </>
          }
          onRowClick={(booking) => {
            setEditBooking(booking);
            setEditBookingForm(toEditBookingForm(booking));
          }}
          rowActions={(booking) => (
            <div className="flex items-center justify-end gap-0.5">
              <button
                type="button"
                aria-label={`Edit booking ${booking.reference}`}
                onClick={() => {
                  setEditBooking(booking);
                  setEditBookingForm(toEditBookingForm(booking));
                }}
                className={rowActionClass}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {canDelete && (
                <button
                  type="button"
                  aria-label={`Delete booking ${booking.reference}`}
                  onClick={() =>
                    setDeleteTarget({
                      collection: "bookings",
                      id: booking.id,
                      label: booking.reference,
                      entity: "Booking",
                    })
                  }
                  className="rounded-lg p-1.5 text-muted transition-colors hover:bg-brand/5 hover:text-brand"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          emptyTitle="No bookings match these filters"
          emptyDescription="Adjust the status or channel filters, or create a new booking."
        />
      )}

      {tab === "quotes" && (
        <DataTable<Quote>
          columns={quoteColumns}
          rows={quotes}
          exportFilename="quotes.csv"
          searchPlaceholder="Search reference, customer, email…"
          searchFields={(quote) =>
            [quote.reference, quote.customerName, quote.email, vehicleById(quote.vehicleId)?.name]
              .filter(Boolean)
              .join(" ")
          }
          rowActions={(quote) => (
            <div className="flex items-center justify-end gap-0.5">
              <button
                type="button"
                aria-label={`Mark ${quote.reference} as sent`}
                onClick={() => void markQuote(quote, "sent")}
                className={rowActionClass}
              >
                <Send className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Mark ${quote.reference} as accepted`}
                onClick={() => void markQuote(quote, "accepted")}
                className={rowActionClass}
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Mark ${quote.reference} as expired`}
                onClick={() => void markQuote(quote, "expired")}
                className={rowActionClass}
              >
                <Ban className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Edit quote ${quote.reference}`}
                onClick={() => {
                  setQuoteEditing(quote);
                  setQuoteForm({
                    reference: quote.reference,
                    customerName: quote.customerName,
                    email: quote.email,
                    vehicleId: quote.vehicleId,
                    startDate: quote.startDate,
                    endDate: quote.endDate,
                    amount: String(quote.amount),
                    status: quote.status,
                    validUntil: quote.validUntil,
                  });
                  setQuoteOpen(true);
                }}
                className={rowActionClass}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {canDelete && (
                <button
                  type="button"
                  aria-label={`Delete quote ${quote.reference}`}
                  onClick={() =>
                    setDeleteTarget({
                      collection: "quotes",
                      id: quote.id,
                      label: quote.reference,
                      entity: "Quote",
                    })
                  }
                  className="rounded-lg p-1.5 text-muted transition-colors hover:bg-brand/5 hover:text-brand"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          emptyTitle="No quotes yet"
          emptyDescription="Create a quote to send a price to a prospective customer."
        />
      )}

      {tab === "leads" && (
        <DataTable<Lead>
          columns={leadColumns}
          rows={leads}
          exportFilename="leads.csv"
          searchPlaceholder="Search name, company, email…"
          searchFields={(lead) =>
            [lead.name, lead.company, lead.email, lead.phone, lead.source, lead.owner]
              .filter(Boolean)
              .join(" ")
          }
          rowActions={(lead) => (
            <div className="flex items-center justify-end gap-0.5">
              <SelectInput
                aria-label={`Stage for ${lead.name}`}
                value={lead.stage}
                onChange={(event) => void moveLeadStage(lead, event.target.value as Lead["stage"])}
                className="w-28 py-1 text-xs"
              >
                {LEAD_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </SelectInput>
              <button
                type="button"
                aria-label={`Edit lead ${lead.name}`}
                onClick={() => {
                  setLeadEditing(lead);
                  setLeadForm({
                    name: lead.name,
                    company: lead.company,
                    email: lead.email,
                    phone: lead.phone,
                    source: lead.source,
                    value: String(lead.value),
                    stage: lead.stage,
                    owner: lead.owner,
                  });
                  setLeadOpen(true);
                }}
                className={rowActionClass}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {canDelete && (
                <button
                  type="button"
                  aria-label={`Delete lead ${lead.name}`}
                  onClick={() =>
                    setDeleteTarget({
                      collection: "leads",
                      id: lead.id,
                      label: lead.name,
                      entity: "Lead",
                    })
                  }
                  className="rounded-lg p-1.5 text-muted transition-colors hover:bg-brand/5 hover:text-brand"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          emptyTitle="No leads yet"
          emptyDescription="Leads captured from the website and walk-ins appear here."
        />
      )}

      {/* ------------------------------------------- create booking */}
      <SlideOver
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New booking"
        description="Reserve a vehicle and price it exactly like the checkout."
        width="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitCreateBooking()} disabled={saving}>
              {saving ? "Saving…" : "Create booking"}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Customer</h3>
            <Field label="Booking for">
              <SelectInput
                value={createForm.mode}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    mode: event.target.value as CreateBookingForm["mode"],
                  }))
                }
              >
                <option value="existing">Existing customer</option>
                <option value="guest">New guest</option>
              </SelectInput>
            </Field>
            {createForm.mode === "existing" ? (
              <Field label="Customer">
                <SelectInput
                  value={createForm.customerId}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, customerId: event.target.value }))
                  }
                >
                  <option value="">Select a customer…</option>
                  {db.customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} · {customer.email}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Guest name">
                  <TextInput
                    value={createForm.guestName}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, guestName: event.target.value }))
                    }
                    placeholder="Full name"
                  />
                </Field>
                <Field label="Email">
                  <TextInput
                    type="email"
                    value={createForm.guestEmail}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, guestEmail: event.target.value }))
                    }
                    placeholder="name@example.com"
                  />
                </Field>
                <Field label="Phone">
                  <TextInput
                    value={createForm.guestPhone}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, guestPhone: event.target.value }))
                    }
                    placeholder="+233…"
                  />
                </Field>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Trip</h3>
            <Field label="Vehicle">
              <SelectInput
                value={createForm.vehicleId}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, vehicleId: event.target.value }))
                }
              >
                <option value="">Select a vehicle…</option>
                {db.vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} · {vehicle.plate} · {formatGHS(vehicle.pricePerDay)}/day
                  </option>
                ))}
              </SelectInput>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pickup date">
                <TextInput
                  type="date"
                  value={createForm.startDate}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, startDate: event.target.value }))
                  }
                />
              </Field>
              <Field
                label="Return date"
                hint={
                  createForm.startDate && createForm.endDate
                    ? `${getDaysBetween(new Date(createForm.startDate), new Date(createForm.endDate))} day(s)`
                    : undefined
                }
              >
                <TextInput
                  type="date"
                  value={createForm.endDate}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, endDate: event.target.value }))
                  }
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Service type">
                <SelectInput
                  value={createForm.serviceType}
                  onChange={(event) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      serviceType: event.target.value as Booking["serviceType"],
                    }))
                  }
                >
                  <option value="self-drive">Self-drive</option>
                  <option value="chauffeur">Chauffeur</option>
                </SelectInput>
              </Field>
              <Field label="Pickup location">
                <SelectInput
                  value={createForm.pickupLocation}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, pickupLocation: event.target.value }))
                  }
                >
                  {LOCATIONS.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Drop-off location">
                <SelectInput
                  value={createForm.dropoffLocation}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, dropoffLocation: event.target.value }))
                  }
                >
                  {LOCATIONS.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>
            <Field label="Channel">
              <SelectInput
                value={createForm.channel}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    channel: event.target.value as Booking["channel"],
                  }))
                }
              >
                {BOOKING_CHANNELS.map((channel) => (
                  <option key={channel} value={channel}>
                    {channel.replace(/_/g, " ")}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Extras</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Checkbox
                label="Child seat"
                checked={createForm.extras.childSeat}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    extras: { ...prev.extras, childSeat: event.target.checked },
                  }))
                }
              />
              <Checkbox
                label="GPS"
                checked={createForm.extras.gps}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    extras: { ...prev.extras, gps: event.target.checked },
                  }))
                }
              />
              <Checkbox
                label="Additional driver"
                checked={createForm.extras.additionalDriver}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    extras: { ...prev.extras, additionalDriver: event.target.checked },
                  }))
                }
              />
              <Checkbox
                label="Chauffeur"
                checked={createForm.extras.chauffeur}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    extras: { ...prev.extras, chauffeur: event.target.checked },
                  }))
                }
              />
              <Checkbox
                label="Full insurance"
                checked={createForm.extras.fullInsurance}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    extras: { ...prev.extras, fullInsurance: event.target.checked },
                  }))
                }
              />
              <Checkbox
                label="Deliver to address"
                checked={createForm.deliver}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, deliver: event.target.checked }))
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Promo code" hint="Applied automatically when active.">
                <TextInput
                  value={createForm.promoCode}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, promoCode: event.target.value }))
                  }
                  placeholder="ONLINE15"
                />
              </Field>
              <Field label="Assigned salesperson">
                <SelectInput
                  value={createForm.salespersonId}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, salespersonId: event.target.value }))
                  }
                >
                  <option value="">Unassigned</option>
                  {db.staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>
            <Field label="Driver (chauffeur bookings)">
              <SelectInput
                value={createForm.driverId}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, driverId: event.target.value }))
                }
              >
                <option value="">No driver</option>
                {db.drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Notes">
              <TextArea
                value={createForm.notes}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder="Anything the team should know"
              />
            </Field>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Live totals
            </h3>
            {createTotals ? (
              <div className="rounded-xl bg-mist p-4">
                <ul className="space-y-1.5">
                  {createTotals.lines.map((line) => (
                    <li key={line.label} className="flex justify-between gap-3 text-xs text-muted">
                      <span>{line.label}</span>
                      <span className="text-ink">{formatGHS(line.amount)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex justify-between border-t border-line pt-2 text-sm font-semibold text-ink">
                  <span>Total due</span>
                  <span>{formatGHS(createTotals.total)}</span>
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  Security deposit {formatGHS(createTotals.deposit)} · {createTotals.days} day
                  {createTotals.days === 1 ? "" : "s"}
                </p>
              </div>
            ) : (
              <p className="rounded-xl bg-mist p-4 text-xs text-muted">
                Select a vehicle and valid dates to see the live totals.
              </p>
            )}
          </section>
        </div>
      </SlideOver>

      {/* --------------------------------------------- edit booking */}
      <SlideOver
        open={editBooking !== null && editBookingForm !== null}
        onClose={() => {
          setEditBooking(null);
          setEditBookingForm(null);
        }}
        title={editBooking ? `Edit ${editBooking.reference}` : "Edit booking"}
        description={
          editBooking
            ? `${customerById(editBooking.customerId)?.name ?? "Guest"} · ${
                vehicleById(editBooking.vehicleId)?.name ?? "Vehicle"
              }`
            : undefined
        }
        width="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setEditBooking(null);
                setEditBookingForm(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => void submitEditBooking()} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </>
        }
      >
        {editBookingForm && (
          <div className="space-y-6">
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Dates</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Pickup date">
                  <TextInput
                    type="date"
                    value={editBookingForm.startDate}
                    onChange={(event) =>
                      setEditBookingForm((prev) =>
                        prev ? { ...prev, startDate: event.target.value } : prev
                      )
                    }
                  />
                </Field>
                <Field
                  label="Return date"
                  hint={`${getDaysBetween(
                    new Date(editBookingForm.startDate),
                    new Date(editBookingForm.endDate)
                  )} day(s)`}
                >
                  <TextInput
                    type="date"
                    value={editBookingForm.endDate}
                    onChange={(event) =>
                      setEditBookingForm((prev) =>
                        prev ? { ...prev, endDate: event.target.value } : prev
                      )
                    }
                  />
                </Field>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Details</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Service type">
                  <SelectInput
                    value={editBookingForm.serviceType}
                    onChange={(event) =>
                      setEditBookingForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              serviceType: event.target.value as Booking["serviceType"],
                            }
                          : prev
                      )
                    }
                  >
                    <option value="self-drive">Self-drive</option>
                    <option value="chauffeur">Chauffeur</option>
                  </SelectInput>
                </Field>
                <Field label="Status">
                  <SelectInput
                    value={editBookingForm.status}
                    onChange={(event) =>
                      setEditBookingForm((prev) =>
                        prev ? { ...prev, status: event.target.value as Booking["status"] } : prev
                      )
                    }
                  >
                    {BOOKING_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status.replace(/_/g, " ")}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="Pickup location">
                  <SelectInput
                    value={editBookingForm.pickupLocation}
                    onChange={(event) =>
                      setEditBookingForm((prev) =>
                        prev ? { ...prev, pickupLocation: event.target.value } : prev
                      )
                    }
                  >
                    {LOCATIONS.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="Drop-off location">
                  <SelectInput
                    value={editBookingForm.dropoffLocation}
                    onChange={(event) =>
                      setEditBookingForm((prev) =>
                        prev ? { ...prev, dropoffLocation: event.target.value } : prev
                      )
                    }
                  >
                    {LOCATIONS.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="Channel">
                  <SelectInput
                    value={editBookingForm.channel}
                    onChange={(event) =>
                      setEditBookingForm((prev) =>
                        prev ? { ...prev, channel: event.target.value as Booking["channel"] } : prev
                      )
                    }
                  >
                    {BOOKING_CHANNELS.map((channel) => (
                      <option key={channel} value={channel}>
                        {channel.replace(/_/g, " ")}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="Promo code">
                  <TextInput
                    value={editBookingForm.promoCode}
                    onChange={(event) =>
                      setEditBookingForm((prev) =>
                        prev ? { ...prev, promoCode: event.target.value } : prev
                      )
                    }
                  />
                </Field>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Extras</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Checkbox
                  label="Child seat"
                  checked={editBookingForm.extras.childSeat}
                  onChange={(event) =>
                    setEditBookingForm((prev) =>
                      prev ? { ...prev, extras: { ...prev.extras, childSeat: event.target.checked } } : prev
                    )
                  }
                />
                <Checkbox
                  label="GPS"
                  checked={editBookingForm.extras.gps}
                  onChange={(event) =>
                    setEditBookingForm((prev) =>
                      prev ? { ...prev, extras: { ...prev.extras, gps: event.target.checked } } : prev
                    )
                  }
                />
                <Checkbox
                  label="Additional driver"
                  checked={editBookingForm.extras.additionalDriver}
                  onChange={(event) =>
                    setEditBookingForm((prev) =>
                      prev
                        ? { ...prev, extras: { ...prev.extras, additionalDriver: event.target.checked } }
                        : prev
                    )
                  }
                />
                <Checkbox
                  label="Chauffeur"
                  checked={editBookingForm.extras.chauffeur}
                  onChange={(event) =>
                    setEditBookingForm((prev) =>
                      prev ? { ...prev, extras: { ...prev.extras, chauffeur: event.target.checked } } : prev
                    )
                  }
                />
                <Checkbox
                  label="Full insurance"
                  checked={editBookingForm.extras.fullInsurance}
                  onChange={(event) =>
                    setEditBookingForm((prev) =>
                      prev
                        ? { ...prev, extras: { ...prev.extras, fullInsurance: event.target.checked } }
                        : prev
                    )
                  }
                />
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Money</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  [
                    ["subtotal", "Subtotal"],
                    ["extrasTotal", "Extras total"],
                    ["discount", "Discount"],
                    ["tax", "Tax"],
                    ["total", "Total"],
                    ["deposit", "Deposit"],
                    ["paid", "Paid"],
                    ["balance", "Balance"],
                  ] as const
                ).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <TextInput
                      type="number"
                      value={editBookingForm[key]}
                      onChange={(event) =>
                        setEditBookingForm((prev) =>
                          prev ? { ...prev, [key]: event.target.value } : prev
                        )
                      }
                    />
                  </Field>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                Assignment
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Salesperson">
                  <SelectInput
                    value={editBookingForm.salespersonId}
                    onChange={(event) =>
                      setEditBookingForm((prev) =>
                        prev ? { ...prev, salespersonId: event.target.value } : prev
                      )
                    }
                  >
                    <option value="">Unassigned</option>
                    {db.staff.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="Driver">
                  <SelectInput
                    value={editBookingForm.driverId}
                    onChange={(event) =>
                      setEditBookingForm((prev) =>
                        prev ? { ...prev, driverId: event.target.value } : prev
                      )
                    }
                  >
                    <option value="">No driver</option>
                    {db.drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
              </div>
              {editBooking && (editBooking.salespersonId || editBooking.driverId) && (
                <p className="text-[11px] text-muted">
                  Currently assigned to{" "}
                  {[staffById(editBooking.salespersonId ?? "")?.name, driverById(editBooking.driverId ?? "")?.name]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              )}
              <Field label="Notes">
                <TextArea
                  value={editBookingForm.notes}
                  onChange={(event) =>
                    setEditBookingForm((prev) => (prev ? { ...prev, notes: event.target.value } : prev))
                  }
                />
              </Field>
            </section>
          </div>
        )}
      </SlideOver>

      {/* ------------------------------------------------- quote form */}
      <SlideOver
        open={quoteOpen}
        onClose={() => {
          setQuoteOpen(false);
          setQuoteEditing(null);
        }}
        title={quoteEditing ? `Edit ${quoteEditing.reference}` : "New quote"}
        description="Send a price to a prospective customer."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setQuoteOpen(false);
                setQuoteEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => void submitQuote()} disabled={saving}>
              {saving ? "Saving…" : quoteEditing ? "Save changes" : "Create quote"}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Details</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Reference">
                <TextInput
                  value={quoteForm.reference}
                  onChange={(event) =>
                    setQuoteForm((prev) => ({ ...prev, reference: event.target.value }))
                  }
                />
              </Field>
              <Field label="Customer name">
                <TextInput
                  value={quoteForm.customerName}
                  onChange={(event) =>
                    setQuoteForm((prev) => ({ ...prev, customerName: event.target.value }))
                  }
                />
              </Field>
              <Field label="Email">
                <TextInput
                  type="email"
                  value={quoteForm.email}
                  onChange={(event) =>
                    setQuoteForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
              </Field>
              <Field label="Vehicle">
                <SelectInput
                  value={quoteForm.vehicleId}
                  onChange={(event) =>
                    setQuoteForm((prev) => ({ ...prev, vehicleId: event.target.value }))
                  }
                >
                  <option value="">Select a vehicle…</option>
                  {db.vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Start date">
                <TextInput
                  type="date"
                  value={quoteForm.startDate}
                  onChange={(event) =>
                    setQuoteForm((prev) => ({ ...prev, startDate: event.target.value }))
                  }
                />
              </Field>
              <Field label="End date">
                <TextInput
                  type="date"
                  value={quoteForm.endDate}
                  onChange={(event) =>
                    setQuoteForm((prev) => ({ ...prev, endDate: event.target.value }))
                  }
                />
              </Field>
              <Field label="Amount (GHS)">
                <TextInput
                  type="number"
                  value={quoteForm.amount}
                  onChange={(event) =>
                    setQuoteForm((prev) => ({ ...prev, amount: event.target.value }))
                  }
                />
              </Field>
              <Field label="Status">
                <SelectInput
                  value={quoteForm.status}
                  onChange={(event) =>
                    setQuoteForm((prev) => ({
                      ...prev,
                      status: event.target.value as Quote["status"],
                    }))
                  }
                >
                  {QUOTE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Valid until">
                <TextInput
                  type="date"
                  value={quoteForm.validUntil}
                  onChange={(event) =>
                    setQuoteForm((prev) => ({ ...prev, validUntil: event.target.value }))
                  }
                />
              </Field>
            </div>
          </section>
        </div>
      </SlideOver>

      {/* -------------------------------------------------- lead form */}
      <SlideOver
        open={leadOpen}
        onClose={() => {
          setLeadOpen(false);
          setLeadEditing(null);
        }}
        title={leadEditing ? `Edit ${leadEditing.name}` : "New lead"}
        description="Track a prospective customer through the pipeline."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setLeadOpen(false);
                setLeadEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => void submitLead()} disabled={saving}>
              {saving ? "Saving…" : leadEditing ? "Save changes" : "Create lead"}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Contact</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Name">
                <TextInput
                  value={leadForm.name}
                  onChange={(event) =>
                    setLeadForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
              </Field>
              <Field label="Company">
                <TextInput
                  value={leadForm.company}
                  onChange={(event) =>
                    setLeadForm((prev) => ({ ...prev, company: event.target.value }))
                  }
                />
              </Field>
              <Field label="Email">
                <TextInput
                  type="email"
                  value={leadForm.email}
                  onChange={(event) =>
                    setLeadForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
              </Field>
              <Field label="Phone">
                <TextInput
                  value={leadForm.phone}
                  onChange={(event) =>
                    setLeadForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                />
              </Field>
            </div>
          </section>
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Pipeline</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Source">
                <TextInput
                  value={leadForm.source}
                  onChange={(event) =>
                    setLeadForm((prev) => ({ ...prev, source: event.target.value }))
                  }
                />
              </Field>
              <Field label="Estimated value (GHS)">
                <TextInput
                  type="number"
                  value={leadForm.value}
                  onChange={(event) =>
                    setLeadForm((prev) => ({ ...prev, value: event.target.value }))
                  }
                />
              </Field>
              <Field label="Stage">
                <SelectInput
                  value={leadForm.stage}
                  onChange={(event) =>
                    setLeadForm((prev) => ({
                      ...prev,
                      stage: event.target.value as Lead["stage"],
                    }))
                  }
                >
                  {LEAD_STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Owner">
                <SelectInput
                  value={leadForm.owner}
                  onChange={(event) =>
                    setLeadForm((prev) => ({ ...prev, owner: event.target.value }))
                  }
                >
                  <option value="">Unassigned</option>
                  {db.staff.map((member) => (
                    <option key={member.id} value={member.name}>
                      {member.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>
          </section>
        </div>
      </SlideOver>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete ${deleteTarget?.entity ?? "record"}?`}
        description={`${
          deleteTarget?.label ?? "This record"
        } will be removed permanently. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteTarget) void confirmDelete(deleteTarget);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
}
