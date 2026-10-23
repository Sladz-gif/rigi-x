"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Ban,
  Banknote,
  CheckCircle2,
  Plus,
  RotateCcw,
  Send,
  ShieldAlert,
  Trash2,
  TrendingDown,
  Wallet,
} from "lucide-react";
import {
  AdminCard,
  ChartCard,
  ConfirmDialog,
  DataTable,
  Field,
  FilterSelect,
  KpiCard,
  PageHeader,
  SelectInput,
  SlideOver,
  StatusPill,
  TableSkeleton,
  Tabs,
  TextArea,
  TextInput,
  type Column,
  type TabDef,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useOptionalAdminSession } from "@/components/admin/session";
import {
  deleteRow,
  insertRow,
  logAudit,
  updateRow,
  useDb,
  withLatency,
} from "@/lib/mock/store";
import type { Deposit, Expense, Invoice, Payment, Refund } from "@/lib/mock/types";
import { hasCapability } from "@/lib/permissions";
import { formatDate, formatGHS } from "@/lib/utils";

const RevenueTrendChart = dynamic(
  () => import("@/components/admin/charts").then((mod) => mod.RevenueTrendChart),
  { ssr: false, loading: () => <TableSkeleton rows={4} cols={4} /> }
);
const SplitBarChart = dynamic(
  () => import("@/components/admin/charts").then((mod) => mod.SplitBarChart),
  { ssr: false, loading: () => <TableSkeleton rows={4} cols={4} /> }
);

/* ------------------------------------------------------------- helpers */

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function num(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const PAYMENT_STATUSES = ["initiated", "success", "failed", "refunded"] as const;
const PAYMENT_CHANNELS = ["card", "mobile_money", "bank_transfer", "cash"] as const;
const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue", "void"] as const;
const INVOICE_TYPES = ["invoice", "receipt"] as const;
const DEPOSIT_STATUSES = ["held", "released", "forfeited"] as const;
const REFUND_STATUSES = ["requested", "approved", "paid", "rejected"] as const;
const EXPENSE_STATUSES = ["pending", "approved", "rejected"] as const;
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
  "Utilities",
  "Other",
] as const;

type PaymentRow = Payment & { bookingReference: string; customerName: string };
type InvoiceRow = Invoice & { customerName: string };
type DepositRow = Deposit & { bookingReference: string; customerName: string };
type RefundRow = Refund & {
  paymentReference: string;
  bookingReference: string;
  customerName: string;
};
type ExpenseRow = Expense & { vehicleName: string };

interface MonthlyBucket {
  label: string;
  revenue: number;
  expenses: number;
  [key: string]: string | number;
}

interface InvoiceFormState {
  customerId: string;
  bookingId: string;
  type: string;
  issuedAt: string;
  dueAt: string;
  subtotal: string;
  tax: string;
  status: string;
}

function emptyInvoice(): InvoiceFormState {
  return {
    customerId: "",
    bookingId: "",
    type: "invoice",
    issuedAt: todayIso(),
    dueAt: todayIso(),
    subtotal: "",
    tax: "",
    status: "draft",
  };
}

interface DepositFormState {
  bookingId: string;
  amount: string;
  status: string;
  note: string;
}

function emptyDeposit(): DepositFormState {
  return { bookingId: "", amount: "", status: "held", note: "" };
}

interface RefundFormState {
  paymentId: string;
  amount: string;
  reason: string;
  status: string;
}

function emptyRefund(): RefundFormState {
  return { paymentId: "", amount: "", reason: "", status: "requested" };
}

interface ExpenseFormState {
  reference: string;
  category: string;
  vendor: string;
  vehicleId: string;
  amount: string;
  spentAt: string;
  status: string;
  note: string;
}

function emptyExpense(reference: string): ExpenseFormState {
  return {
    reference,
    category: "Fuel",
    vendor: "",
    vehicleId: "",
    amount: "",
    spentAt: todayIso(),
    status: "pending",
    note: "",
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

/* --------------------------------------------------------------- page */

export default function AdminFinancePage() {
  const db = useDb();
  const admin = useOptionalAdminSession();
  const { toast } = useToast();

  const actorName = admin?.session.name ?? "System";
  const role = admin?.role;
  const canDelete = role ? hasCapability(role, "delete_records") : false;
  const canViewFinance = role ? hasCapability(role, "view_finance") : false;

  const [tab, setTab] = useState("payments");
  const [saving, setSaving] = useState(false);

  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [paymentChannelFilter, setPaymentChannelFilter] = useState("all");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all");
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState("all");
  const [expenseStatusFilter, setExpenseStatusFilter] = useState("all");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all");

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormState>(() => emptyInvoice());
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositForm, setDepositForm] = useState<DepositFormState>(() => emptyDeposit());
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundForm, setRefundForm] = useState<RefundFormState>(() => emptyRefund());
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>(() =>
    emptyExpense("EXP-2201")
  );

  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    run: () => void;
  } | null>(null);

  const paramsRead = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || paramsRead.current) return;
    paramsRead.current = true;
    const params = new URLSearchParams(window.location.search);
    const newParam = params.get("new");
    if (!newParam) return;
    const timer = window.setTimeout(() => {
      if (newParam === "invoice") {
        setTab("invoices");
        setInvoiceForm({ ...emptyInvoice(), customerId: db.customers[0]?.id ?? "" });
        setInvoiceOpen(true);
      } else if (newParam === "expense") {
        setTab("expenses");
        setExpenseForm(emptyExpense(nextExpenseReference(db.expenses)));
        setExpenseOpen(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [db]);

  /* --------------------------------------------------------- lookups */

  const customerName = (id: string) =>
    db.customers.find((customer) => customer.id === id)?.name ?? "Guest";

  /* ---------------------------------------------------------- metrics */

  const metrics = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const successful = db.payments.filter((payment) => payment.status === "success");

    const revenueMonth = successful
      .filter((payment) => payment.paidAt && new Date(payment.paidAt).getTime() >= startOfMonth)
      .reduce((sum, payment) => sum + payment.amount, 0);
    const outstanding = db.invoices
      .filter((invoice) => invoice.status === "sent" || invoice.status === "overdue")
      .reduce((sum, invoice) => sum + invoice.total, 0);
    const refundsMonth = db.refunds
      .filter((refund) => new Date(refund.createdAt).getTime() >= startOfMonth)
      .reduce((sum, refund) => sum + refund.amount, 0);
    const expensesMonth = db.expenses
      .filter((expense) => new Date(expense.spentAt).getTime() >= startOfMonth)
      .reduce((sum, expense) => sum + expense.amount, 0);

    return {
      revenueMonth,
      outstanding,
      refundsMonth,
      expensesMonth,
      successfulCount: successful.length,
    };
  }, [db]);

  const tabs: TabDef[] = [
    { id: "payments", label: "Payments", count: db.payments.length },
    { id: "invoices", label: "Invoices", count: db.invoices.length },
    { id: "deposits", label: "Deposits", count: db.deposits.length },
    { id: "refunds", label: "Refunds", count: db.refunds.length },
    { id: "expenses", label: "Expenses", count: db.expenses.length },
    { id: "reports", label: "Reports" },
  ];

  /* --------------------------------------------------------- payments */

  const paymentRows = useMemo<PaymentRow[]>(
    () =>
      db.payments.map((payment) => ({
        ...payment,
        bookingReference:
          db.bookings.find((booking) => booking.id === payment.bookingId)?.reference ?? "—",
        customerName:
          db.customers.find((customer) => customer.id === payment.customerId)?.name ?? "Guest",
      })),
    [db]
  );

  const filteredPayments = useMemo(
    () =>
      paymentRows.filter(
        (payment) =>
          (paymentStatusFilter === "all" || payment.status === paymentStatusFilter) &&
          (paymentChannelFilter === "all" || payment.channel === paymentChannelFilter)
      ),
    [paymentRows, paymentStatusFilter, paymentChannelFilter]
  );

  const paymentColumns: Column<PaymentRow>[] = [
    {
      key: "reference",
      header: "Reference",
      render: (payment) => <span className="font-medium text-ink">{payment.reference}</span>,
      value: (payment) => payment.reference,
    },
    {
      key: "bookingReference",
      header: "Booking",
      render: (payment) => payment.bookingReference,
      value: (payment) => payment.bookingReference,
      hideBelow: "md",
    },
    {
      key: "customerName",
      header: "Customer",
      render: (payment) => payment.customerName,
      value: (payment) => payment.customerName,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (payment) => formatGHS(payment.amount),
      value: (payment) => payment.amount,
    },
    {
      key: "channel",
      header: "Channel",
      render: (payment) => <StatusPill status={payment.channel} />,
      value: (payment) => payment.channel,
      hideBelow: "md",
    },
    {
      key: "status",
      header: "Status",
      render: (payment) => <StatusPill status={payment.status} />,
      value: (payment) => payment.status,
    },
    {
      key: "fees",
      header: "Fees",
      align: "right",
      render: (payment) => formatGHS(payment.fees),
      value: (payment) => payment.fees,
      hideBelow: "lg",
    },
    {
      key: "settled",
      header: "Settled",
      render: (payment) => (
        <StatusPill
          status={payment.settled ? "success" : "pending"}
          label={payment.settled ? "Settled" : "Unsettled"}
        />
      ),
      value: (payment) => (payment.settled ? "Yes" : "No"),
      hideBelow: "sm",
    },
    {
      key: "paidAt",
      header: "Paid at",
      render: (payment) => (payment.paidAt ? formatDate(new Date(payment.paidAt)) : "—"),
      value: (payment) => payment.paidAt ?? "",
      hideBelow: "lg",
    },
  ];

  const markSettled = async (payment: PaymentRow) => {
    setSaving(true);
    await withLatency(null);
    updateRow("payments", payment.id, {
      status: "success",
      settled: true,
      paidAt: new Date().toISOString(),
    });
    logAudit({
      actorName,
      action: "updated",
      entity: "Payment",
      entityId: payment.reference,
      detail: `Marked ${payment.reference} settled`,
    });
    setSaving(false);
    toast({ title: "Payment settled", description: payment.reference, variant: "success" });
  };

  const openRefundFor = (payment: Payment) => {
    setRefundForm({
      paymentId: payment.id,
      amount: String(payment.amount),
      reason: "",
      status: "requested",
    });
    setRefundOpen(true);
  };

  const deletePayment = async (payment: PaymentRow) => {
    setSaving(true);
    await withLatency(null);
    deleteRow("payments", payment.id);
    logAudit({
      actorName,
      action: "deleted",
      entity: "Payment",
      entityId: payment.reference,
      detail: `Deleted payment ${payment.reference}`,
    });
    setSaving(false);
    toast({ title: "Payment deleted", variant: "success" });
  };

  /* --------------------------------------------------------- invoices */

  const invoiceRows = useMemo<InvoiceRow[]>(
    () =>
      db.invoices.map((invoice) => ({
        ...invoice,
        customerName:
          db.customers.find((customer) => customer.id === invoice.customerId)?.name ?? "Guest",
      })),
    [db]
  );

  const filteredInvoices = useMemo(
    () =>
      invoiceRows.filter(
        (invoice) =>
          (invoiceStatusFilter === "all" || invoice.status === invoiceStatusFilter) &&
          (invoiceTypeFilter === "all" || invoice.type === invoiceTypeFilter)
      ),
    [invoiceRows, invoiceStatusFilter, invoiceTypeFilter]
  );

  const nextInvoiceNumber = (type: string) => {
    const prefix = type === "receipt" ? "RCPT" : "INV";
    const base = type === "receipt" ? 5000 : 1000;
    const max = db.invoices.reduce((acc, invoice) => {
      if (!invoice.number.startsWith(prefix)) return acc;
      const parsed = Number(invoice.number.replace(/\D/g, ""));
      return Number.isFinite(parsed) ? Math.max(acc, parsed) : acc;
    }, base);
    return `${prefix}-${max + 1}`;
  };

  const invoiceTotal = num(invoiceForm.subtotal) + num(invoiceForm.tax);

  const invoiceColumns: Column<InvoiceRow>[] = [
    {
      key: "number",
      header: "Number",
      render: (invoice) => <span className="font-medium text-ink">{invoice.number}</span>,
      value: (invoice) => invoice.number,
    },
    {
      key: "customerName",
      header: "Customer",
      render: (invoice) => invoice.customerName,
      value: (invoice) => invoice.customerName,
    },
    {
      key: "type",
      header: "Type",
      render: (invoice) => <StatusPill status={invoice.type} />,
      value: (invoice) => invoice.type,
      hideBelow: "md",
    },
    {
      key: "issuedAt",
      header: "Issued",
      render: (invoice) => formatDate(new Date(invoice.issuedAt)),
      value: (invoice) => invoice.issuedAt,
      hideBelow: "lg",
    },
    {
      key: "dueAt",
      header: "Due",
      render: (invoice) => formatDate(new Date(invoice.dueAt)),
      value: (invoice) => invoice.dueAt,
      hideBelow: "lg",
    },
    {
      key: "subtotal",
      header: "Subtotal",
      align: "right",
      render: (invoice) => formatGHS(invoice.subtotal),
      value: (invoice) => invoice.subtotal,
      hideBelow: "lg",
    },
    {
      key: "tax",
      header: "Tax",
      align: "right",
      render: (invoice) => formatGHS(invoice.tax),
      value: (invoice) => invoice.tax,
      hideBelow: "lg",
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      render: (invoice) => <span className="font-medium text-ink">{formatGHS(invoice.total)}</span>,
      value: (invoice) => invoice.total,
    },
    {
      key: "status",
      header: "Status",
      render: (invoice) => <StatusPill status={invoice.status} />,
      value: (invoice) => invoice.status,
    },
  ];

  const openNewInvoice = () => {
    setInvoiceForm({ ...emptyInvoice(), customerId: db.customers[0]?.id ?? "" });
    setInvoiceOpen(true);
  };

  const saveInvoice = async () => {
    if (!invoiceForm.customerId) {
      toast({ title: "Select a customer", variant: "error" });
      return;
    }
    const subtotal = num(invoiceForm.subtotal);
    const tax = num(invoiceForm.tax);
    if (subtotal <= 0) {
      toast({ title: "Enter a subtotal", description: "Subtotal must be greater than zero.", variant: "error" });
      return;
    }
    setSaving(true);
    await withLatency(null);
    const number =
      invoiceForm.type === "receipt"
        ? nextInvoiceNumber("receipt")
        : nextInvoiceNumber("invoice");
    insertRow("invoices", {
      number,
      bookingId: invoiceForm.bookingId || null,
      customerId: invoiceForm.customerId,
      type: invoiceForm.type as Invoice["type"],
      issuedAt: invoiceForm.issuedAt || todayIso(),
      dueAt: invoiceForm.dueAt || todayIso(),
      subtotal,
      tax,
      total: subtotal + tax,
      status: invoiceForm.status as Invoice["status"],
    });
    logAudit({
      actorName,
      action: "created",
      entity: "Invoice",
      entityId: number,
      detail: `Created ${number} for ${customerName(invoiceForm.customerId)}`,
    });
    setSaving(false);
    setInvoiceOpen(false);
    toast({ title: "Invoice created", description: number, variant: "success" });
  };

  const setInvoiceStatus = async (invoice: InvoiceRow, status: Invoice["status"]) => {
    setSaving(true);
    await withLatency(null);
    updateRow("invoices", invoice.id, { status });
    logAudit({
      actorName,
      action: "updated",
      entity: "Invoice",
      entityId: invoice.number,
      detail: `${invoice.number} → ${status}`,
    });
    setSaving(false);
    toast({ title: `Invoice ${invoice.number} updated`, variant: "success" });
  };

  const deleteInvoice = async (invoice: InvoiceRow) => {
    setSaving(true);
    await withLatency(null);
    deleteRow("invoices", invoice.id);
    logAudit({
      actorName,
      action: "deleted",
      entity: "Invoice",
      entityId: invoice.number,
      detail: `Deleted invoice ${invoice.number}`,
    });
    setSaving(false);
    toast({ title: "Invoice deleted", variant: "success" });
  };

  /* --------------------------------------------------------- deposits */

  const depositRows = useMemo<DepositRow[]>(
    () =>
      db.deposits.map((deposit) => ({
        ...deposit,
        bookingReference:
          db.bookings.find((booking) => booking.id === deposit.bookingId)?.reference ?? "—",
        customerName:
          db.customers.find((customer) => customer.id === deposit.customerId)?.name ?? "Guest",
      })),
    [db]
  );

  const depositColumns: Column<DepositRow>[] = [
    {
      key: "bookingReference",
      header: "Booking",
      render: (deposit) => <span className="font-medium text-ink">{deposit.bookingReference}</span>,
      value: (deposit) => deposit.bookingReference,
    },
    {
      key: "customerName",
      header: "Customer",
      render: (deposit) => deposit.customerName,
      value: (deposit) => deposit.customerName,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (deposit) => formatGHS(deposit.amount),
      value: (deposit) => deposit.amount,
    },
    {
      key: "status",
      header: "Status",
      render: (deposit) => <StatusPill status={deposit.status} />,
      value: (deposit) => deposit.status,
    },
    {
      key: "releasedAt",
      header: "Released at",
      render: (deposit) => (deposit.releasedAt ? formatDate(new Date(deposit.releasedAt)) : "—"),
      value: (deposit) => deposit.releasedAt ?? "",
      hideBelow: "md",
    },
    {
      key: "note",
      header: "Note",
      render: (deposit) => deposit.note || "—",
      value: (deposit) => deposit.note,
      hideBelow: "lg",
    },
  ];

  const openNewDeposit = () => {
    setDepositForm({ ...emptyDeposit(), bookingId: db.bookings[0]?.id ?? "" });
    setDepositOpen(true);
  };

  const saveDeposit = async () => {
    if (!depositForm.bookingId) {
      toast({ title: "Select a booking", variant: "error" });
      return;
    }
    const amount = num(depositForm.amount);
    if (amount <= 0) {
      toast({ title: "Enter a deposit amount", variant: "error" });
      return;
    }
    setSaving(true);
    await withLatency(null);
    const booking = db.bookings.find((item) => item.id === depositForm.bookingId);
    insertRow("deposits", {
      bookingId: depositForm.bookingId,
      customerId: booking?.customerId ?? "",
      amount,
      status: depositForm.status as Deposit["status"],
      releasedAt: depositForm.status === "held" ? null : new Date().toISOString(),
      note: depositForm.note.trim(),
    });
    logAudit({
      actorName,
      action: "created",
      entity: "Deposit",
      entityId: booking?.reference ?? depositForm.bookingId,
      detail: `Created deposit for ${booking?.reference ?? "booking"}`,
    });
    setSaving(false);
    setDepositOpen(false);
    toast({ title: "Deposit recorded", variant: "success" });
  };

  const setDepositStatus = async (deposit: DepositRow, status: Deposit["status"]) => {
    setSaving(true);
    await withLatency(null);
    updateRow("deposits", deposit.id, { status, releasedAt: new Date().toISOString() });
    logAudit({
      actorName,
      action: "updated",
      entity: "Deposit",
      entityId: deposit.bookingReference,
      detail: `Deposit for ${deposit.bookingReference} ${status}`,
    });
    setSaving(false);
    toast({
      title: `Deposit ${status}`,
      description: deposit.bookingReference,
      variant: "success",
    });
  };

  /* ---------------------------------------------------------- refunds */

  const refundRows = useMemo<RefundRow[]>(
    () =>
      db.refunds.map((refund) => {
        const payment = db.payments.find((item) => item.id === refund.paymentId);
        return {
          ...refund,
          paymentReference: payment?.reference ?? "—",
          bookingReference:
            db.bookings.find((booking) => booking.id === refund.bookingId)?.reference ?? "—",
          customerName: payment
            ? (db.customers.find((customer) => customer.id === payment.customerId)?.name ??
              "Guest")
            : "—",
        };
      }),
    [db]
  );

  const successfulPayments = useMemo(
    () => db.payments.filter((payment) => payment.status === "success"),
    [db.payments]
  );

  const refundColumns: Column<RefundRow>[] = [
    {
      key: "paymentReference",
      header: "Payment",
      render: (refund) => <span className="font-medium text-ink">{refund.paymentReference}</span>,
      value: (refund) => refund.paymentReference,
    },
    {
      key: "bookingReference",
      header: "Booking",
      render: (refund) => refund.bookingReference,
      value: (refund) => refund.bookingReference,
      hideBelow: "md",
    },
    {
      key: "customerName",
      header: "Customer",
      render: (refund) => refund.customerName,
      value: (refund) => refund.customerName,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (refund) => formatGHS(refund.amount),
      value: (refund) => refund.amount,
    },
    {
      key: "reason",
      header: "Reason",
      render: (refund) => refund.reason || "—",
      value: (refund) => refund.reason,
      hideBelow: "lg",
    },
    {
      key: "status",
      header: "Status",
      render: (refund) => <StatusPill status={refund.status} />,
      value: (refund) => refund.status,
    },
  ];

  const openNewRefund = () => {
    const payment = successfulPayments[0];
    setRefundForm({
      paymentId: payment?.id ?? "",
      amount: payment ? String(payment.amount) : "",
      reason: "",
      status: "requested",
    });
    setRefundOpen(true);
  };

  const saveRefund = async () => {
    const payment = db.payments.find((item) => item.id === refundForm.paymentId);
    if (!payment) {
      toast({ title: "Select a payment", variant: "error" });
      return;
    }
    const amount = num(refundForm.amount);
    if (amount <= 0) {
      toast({ title: "Enter a refund amount", variant: "error" });
      return;
    }
    setSaving(true);
    await withLatency(null);
    insertRow("refunds", {
      paymentId: payment.id,
      bookingId: payment.bookingId,
      amount,
      reason: refundForm.reason.trim() || "Refund requested",
      status: refundForm.status as Refund["status"],
    });
    logAudit({
      actorName,
      action: "created",
      entity: "Refund",
      entityId: payment.reference,
      detail: `Created refund of ${formatGHS(amount)} for ${payment.reference}`,
    });
    setSaving(false);
    setRefundOpen(false);
    toast({ title: "Refund created", description: payment.reference, variant: "success" });
  };

  const setRefundStatus = async (refund: RefundRow, status: Refund["status"]) => {
    setSaving(true);
    await withLatency(null);
    updateRow("refunds", refund.id, { status });
    logAudit({
      actorName,
      action: "updated",
      entity: "Refund",
      entityId: refund.paymentReference,
      detail: `Refund ${refund.paymentReference} ${status}`,
    });
    setSaving(false);
    toast({ title: `Refund ${status}`, variant: "success" });
  };

  /* --------------------------------------------------------- expenses */

  const expenseRows = useMemo<ExpenseRow[]>(
    () =>
      db.expenses.map((expense) => ({
        ...expense,
        vehicleName: expense.vehicleId
          ? (db.vehicles.find((vehicle) => vehicle.id === expense.vehicleId)?.name ?? "—")
          : "—",
      })),
    [db.expenses, db.vehicles]
  );

  const filteredExpenses = useMemo(
    () =>
      expenseRows.filter(
        (expense) =>
          (expenseStatusFilter === "all" || expense.status === expenseStatusFilter) &&
          (expenseCategoryFilter === "all" || expense.category === expenseCategoryFilter)
      ),
    [expenseRows, expenseStatusFilter, expenseCategoryFilter]
  );

  const expenseColumns: Column<ExpenseRow>[] = [
    {
      key: "reference",
      header: "Reference",
      render: (expense) => <span className="font-medium text-ink">{expense.reference}</span>,
      value: (expense) => expense.reference,
    },
    {
      key: "category",
      header: "Category",
      render: (expense) => expense.category,
      value: (expense) => expense.category,
    },
    {
      key: "vendor",
      header: "Vendor",
      render: (expense) => expense.vendor || "—",
      value: (expense) => expense.vendor,
      hideBelow: "md",
    },
    {
      key: "vehicleName",
      header: "Vehicle",
      render: (expense) => expense.vehicleName,
      value: (expense) => expense.vehicleName,
      hideBelow: "lg",
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (expense) => formatGHS(expense.amount),
      value: (expense) => expense.amount,
    },
    {
      key: "spentAt",
      header: "Spent",
      render: (expense) => formatDate(new Date(expense.spentAt)),
      value: (expense) => expense.spentAt,
      hideBelow: "lg",
    },
    {
      key: "status",
      header: "Status",
      render: (expense) => <StatusPill status={expense.status} />,
      value: (expense) => expense.status,
    },
  ];

  const openNewExpense = () => {
    setExpenseForm(emptyExpense(nextExpenseReference(db.expenses)));
    setExpenseOpen(true);
  };

  const saveExpense = async () => {
    const amount = num(expenseForm.amount);
    if (amount <= 0) {
      toast({ title: "Enter an amount", description: "Expense amount must be greater than zero.", variant: "error" });
      return;
    }
    setSaving(true);
    await withLatency(null);
    insertRow("expenses", {
      reference: expenseForm.reference.trim() || nextExpenseReference(db.expenses),
      category: expenseForm.category,
      vendor: expenseForm.vendor.trim(),
      vehicleId: expenseForm.vehicleId || null,
      amount,
      spentAt: expenseForm.spentAt || todayIso(),
      status: expenseForm.status as Expense["status"],
      note: expenseForm.note.trim(),
    });
    logAudit({
      actorName,
      action: "created",
      entity: "Expense",
      entityId: expenseForm.reference,
      detail: `Logged ${expenseForm.category} expense of ${formatGHS(amount)}`,
    });
    setSaving(false);
    setExpenseOpen(false);
    toast({ title: "Expense logged", description: expenseForm.reference, variant: "success" });
  };

  const setExpenseStatus = async (expense: ExpenseRow, status: Expense["status"]) => {
    setSaving(true);
    await withLatency(null);
    updateRow("expenses", expense.id, { status });
    logAudit({
      actorName,
      action: "updated",
      entity: "Expense",
      entityId: expense.reference,
      detail: `Expense ${expense.reference} ${status}`,
    });
    setSaving(false);
    toast({ title: `Expense ${status}`, description: expense.reference, variant: "success" });
  };

  const deleteExpense = async (expense: ExpenseRow) => {
    setSaving(true);
    await withLatency(null);
    deleteRow("expenses", expense.id);
    logAudit({
      actorName,
      action: "deleted",
      entity: "Expense",
      entityId: expense.reference,
      detail: `Deleted expense ${expense.reference}`,
    });
    setSaving(false);
    toast({ title: "Expense deleted", variant: "success" });
  };

  /* ---------------------------------------------------------- reports */

  const dailyRevenue = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (13 - index));
        const key = date.toISOString().slice(0, 10);
        const value = db.payments
          .filter((payment) => payment.status === "success" && (payment.paidAt ?? "").slice(0, 10) === key)
          .reduce((sum, payment) => sum + payment.amount, 0);
        return {
          label: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
          value,
        };
      }),
    [db.payments]
  );

  const monthly = useMemo<MonthlyBucket[]>(
    () =>
      Array.from({ length: 6 }, (_, index) => {
        const ref = new Date();
        ref.setDate(1);
        ref.setMonth(ref.getMonth() - (5 - index));
        const year = ref.getFullYear();
        const month = ref.getMonth();
        const inBucket = (iso: string | null) => {
          if (!iso) return false;
          const date = new Date(iso);
          return date.getFullYear() === year && date.getMonth() === month;
        };
        const revenue = db.payments
          .filter((payment) => payment.status === "success" && inBucket(payment.paidAt))
          .reduce((sum, payment) => sum + payment.amount, 0);
        const expenses = db.expenses
          .filter((expense) => inBucket(expense.spentAt))
          .reduce((sum, expense) => sum + expense.amount, 0);
        return {
          label: ref.toLocaleDateString("en-GB", { month: "short" }),
          revenue,
          expenses,
        };
      }),
    [db.payments, db.expenses]
  );

  const profitLoss = useMemo(() => {
    const revenue = monthly.reduce((sum, bucket) => sum + bucket.revenue, 0);
    const expenses = monthly.reduce((sum, bucket) => sum + bucket.expenses, 0);
    const profit = revenue - expenses;
    const margin = revenue ? Math.round((profit / revenue) * 1000) / 10 : 0;
    return { revenue, expenses, profit, margin };
  }, [monthly]);

  /* ------------------------------------------------------------ view */

  return (
    <>
      <PageHeader
        title="Finance"
        description="Payments, invoices, deposits, refunds and spend across the business."
        actions={
          <Button size="sm" onClick={openNewInvoice}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            New invoice
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Revenue this month"
          value={formatGHS(metrics.revenueMonth)}
          sub={`${metrics.successfulCount} successful payments`}
          icon={Banknote}
          tone="positive"
        />
        <KpiCard
          label="Outstanding"
          value={formatGHS(metrics.outstanding)}
          sub="Invoices sent or overdue"
          icon={Wallet}
          tone={metrics.outstanding ? "warning" : "neutral"}
        />
        <KpiCard
          label="Refunds this month"
          value={formatGHS(metrics.refundsMonth)}
          sub={`${db.refunds.length} refunds on record`}
          icon={RotateCcw}
        />
        <KpiCard
          label="Expenses this month"
          value={formatGHS(metrics.expensesMonth)}
          sub={`${db.expenses.length} expenses on record`}
          icon={TrendingDown}
          tone="danger"
        />
      </div>

      <div className="mt-6">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      {tab === "payments" && (
        <DataTable<PaymentRow>
          columns={paymentColumns}
          rows={filteredPayments}
          searchFields={(payment) =>
            `${payment.reference} ${payment.bookingReference} ${payment.customerName}`
          }
          searchPlaceholder="Search reference, booking or customer…"
          exportFilename="payments.csv"
          initialSort={{ key: "paidAt", dir: "desc" }}
          emptyTitle="No payments match"
          emptyDescription="Adjust the filters to see more payments."
          filters={
            <>
              <FilterSelect
                label="Status"
                value={paymentStatusFilter}
                options={["all", ...PAYMENT_STATUSES]}
                onChange={setPaymentStatusFilter}
              />
              <FilterSelect
                label="Channel"
                value={paymentChannelFilter}
                options={["all", ...PAYMENT_CHANNELS]}
                onChange={setPaymentChannelFilter}
              />
            </>
          }
          rowActions={(payment) => (
            <div className="flex items-center justify-end gap-1">
              {payment.status === "initiated" && (
                <button
                  type="button"
                  aria-label={`Mark ${payment.reference} settled`}
                  disabled={saving}
                  onClick={() => void markSettled(payment)}
                  className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-emerald-600 disabled:opacity-40"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                aria-label={`Refund ${payment.reference}`}
                onClick={() => openRefundFor(payment)}
                className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              {canDelete && (
                <button
                  type="button"
                  aria-label={`Delete ${payment.reference}`}
                  onClick={() =>
                    setConfirm({
                      title: "Delete payment",
                      description: `This permanently removes ${payment.reference}.`,
                      run: () => void deletePayment(payment),
                    })
                  }
                  className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-brand"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        />
      )}

      {tab === "invoices" && (
        <DataTable<InvoiceRow>
          columns={invoiceColumns}
          rows={filteredInvoices}
          searchFields={(invoice) => `${invoice.number} ${invoice.customerName} ${invoice.status}`}
          searchPlaceholder="Search number or customer…"
          exportFilename="invoices.csv"
          initialSort={{ key: "issuedAt", dir: "desc" }}
          emptyTitle="No invoices match"
          emptyDescription="Adjust the filters or create a new invoice."
          toolbar={
            <Button size="sm" onClick={openNewInvoice}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              New invoice
            </Button>
          }
          filters={
            <>
              <FilterSelect
                label="Status"
                value={invoiceStatusFilter}
                options={["all", ...INVOICE_STATUSES]}
                onChange={setInvoiceStatusFilter}
              />
              <FilterSelect
                label="Type"
                value={invoiceTypeFilter}
                options={["all", ...INVOICE_TYPES]}
                onChange={setInvoiceTypeFilter}
              />
            </>
          }
          rowActions={(invoice) => (
            <div className="flex items-center justify-end gap-1">
              {invoice.status !== "paid" && invoice.status !== "void" && (
                <button
                  type="button"
                  aria-label={`Mark ${invoice.number} paid`}
                  disabled={saving}
                  onClick={() => void setInvoiceStatus(invoice, "paid")}
                  className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-emerald-600 disabled:opacity-40"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </button>
              )}
              {invoice.status === "draft" && (
                <button
                  type="button"
                  aria-label={`Send ${invoice.number}`}
                  disabled={saving}
                  onClick={() => void setInvoiceStatus(invoice, "sent")}
                  className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              )}
              {invoice.status !== "void" && (
                <button
                  type="button"
                  aria-label={`Void ${invoice.number}`}
                  disabled={saving}
                  onClick={() => void setInvoiceStatus(invoice, "void")}
                  className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-brand disabled:opacity-40"
                >
                  <Ban className="h-3.5 w-3.5" />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  aria-label={`Delete ${invoice.number}`}
                  onClick={() =>
                    setConfirm({
                      title: "Delete invoice",
                      description: `This permanently removes ${invoice.number}.`,
                      run: () => void deleteInvoice(invoice),
                    })
                  }
                  className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-brand"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        />
      )}

      {tab === "deposits" && (
        <DataTable<DepositRow>
          columns={depositColumns}
          rows={depositRows}
          searchFields={(deposit) => `${deposit.bookingReference} ${deposit.customerName}`}
          searchPlaceholder="Search booking or customer…"
          exportFilename="deposits.csv"
          emptyTitle="No deposits"
          emptyDescription="Deposits appear here once bookings are secured."
          toolbar={
            <Button size="sm" onClick={openNewDeposit}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              New deposit
            </Button>
          }
          rowActions={(deposit) => (
            <div className="flex items-center justify-end gap-1">
              {deposit.status === "held" && (
                <>
                  <button
                    type="button"
                    aria-label={`Release deposit for ${deposit.bookingReference}`}
                    disabled={saving}
                    onClick={() => void setDepositStatus(deposit, "released")}
                    className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-emerald-600 disabled:opacity-40"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Forfeit deposit for ${deposit.bookingReference}`}
                    disabled={saving}
                    onClick={() => void setDepositStatus(deposit, "forfeited")}
                    className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-brand disabled:opacity-40"
                  >
                    <Ban className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          )}
        />
      )}

      {tab === "refunds" && (
        <DataTable<RefundRow>
          columns={refundColumns}
          rows={refundRows}
          searchFields={(refund) =>
            `${refund.paymentReference} ${refund.bookingReference} ${refund.customerName}`
          }
          searchPlaceholder="Search payment, booking or customer…"
          exportFilename="refunds.csv"
          emptyTitle="No refunds"
          emptyDescription="Refunds raised against payments show up here."
          toolbar={
            <Button size="sm" onClick={openNewRefund}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              New refund
            </Button>
          }
          rowActions={(refund) => (
            <div className="flex items-center justify-end gap-1">
              {refund.status === "requested" && (
                <button
                  type="button"
                  aria-label={`Approve refund ${refund.paymentReference}`}
                  disabled={saving}
                  onClick={() => void setRefundStatus(refund, "approved")}
                  className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-emerald-600 disabled:opacity-40"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </button>
              )}
              {refund.status === "approved" && (
                <button
                  type="button"
                  aria-label={`Mark refund ${refund.paymentReference} paid`}
                  disabled={saving}
                  onClick={() => void setRefundStatus(refund, "paid")}
                  className="rounded-lg border border-line px-2 py-1.5 text-[11px] font-medium text-muted transition-colors hover:text-ink disabled:opacity-40"
                >
                  Mark paid
                </button>
              )}
              {refund.status !== "rejected" && refund.status !== "paid" && (
                <button
                  type="button"
                  aria-label={`Reject refund ${refund.paymentReference}`}
                  disabled={saving}
                  onClick={() => void setRefundStatus(refund, "rejected")}
                  className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-brand disabled:opacity-40"
                >
                  <Ban className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        />
      )}

      {tab === "expenses" && (
        <DataTable<ExpenseRow>
          columns={expenseColumns}
          rows={filteredExpenses}
          searchFields={(expense) => `${expense.reference} ${expense.category} ${expense.vendor}`}
          searchPlaceholder="Search reference, category or vendor…"
          exportFilename="expenses.csv"
          initialSort={{ key: "spentAt", dir: "desc" }}
          emptyTitle="No expenses match"
          emptyDescription="Adjust the filters or log a new expense."
          toolbar={
            <Button size="sm" onClick={openNewExpense}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              New expense
            </Button>
          }
          filters={
            <>
              <FilterSelect
                label="Status"
                value={expenseStatusFilter}
                options={["all", ...EXPENSE_STATUSES]}
                onChange={setExpenseStatusFilter}
              />
              <FilterSelect
                label="Category"
                value={expenseCategoryFilter}
                options={["all", ...EXPENSE_CATEGORIES]}
                onChange={setExpenseCategoryFilter}
              />
            </>
          }
          rowActions={(expense) => (
            <div className="flex items-center justify-end gap-1">
              {expense.status !== "approved" && (
                <button
                  type="button"
                  aria-label={`Approve ${expense.reference}`}
                  disabled={saving}
                  onClick={() => void setExpenseStatus(expense, "approved")}
                  className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-emerald-600 disabled:opacity-40"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </button>
              )}
              {expense.status !== "rejected" && (
                <button
                  type="button"
                  aria-label={`Reject ${expense.reference}`}
                  disabled={saving}
                  onClick={() => void setExpenseStatus(expense, "rejected")}
                  className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-brand disabled:opacity-40"
                >
                  <Ban className="h-3.5 w-3.5" />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  aria-label={`Delete ${expense.reference}`}
                  onClick={() =>
                    setConfirm({
                      title: "Delete expense",
                      description: `This permanently removes ${expense.reference}.`,
                      run: () => void deleteExpense(expense),
                    })
                  }
                  className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-brand"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        />
      )}

      {tab === "reports" &&
        (canViewFinance ? (
          <div className="space-y-4">
            <ChartCard title="Revenue trend" subtitle="Daily settled payments, last 14 days" height={280}>
              <div role="img" aria-label="Revenue trend for the last 14 days" className="h-full w-full">
                <RevenueTrendChart data={dailyRevenue} />
              </div>
            </ChartCard>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartCard title="Revenue vs expenses" subtitle="Last 6 months" height={280}>
                <div role="img" aria-label="Revenue compared with expenses over the last 6 months" className="h-full w-full">
                  <SplitBarChart
                    data={monthly}
                    series={[
                      { key: "revenue", label: "Revenue", color: "#E10600" },
                      { key: "expenses", label: "Expenses", color: "#0B1220" },
                    ]}
                  />
                </div>
              </ChartCard>

              <AdminCard title="Profit & loss" description="Last 6 months">
                <dl className="divide-y divide-line text-sm">
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-muted">Revenue</dt>
                    <dd className="font-medium text-ink">{formatGHS(profitLoss.revenue)}</dd>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-muted">Expenses</dt>
                    <dd className="font-medium text-ink">{formatGHS(profitLoss.expenses)}</dd>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-muted">Gross profit</dt>
                    <dd className="font-medium text-ink">{formatGHS(profitLoss.profit)}</dd>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-muted">Margin</dt>
                    <dd className="font-medium text-ink">{profitLoss.margin}%</dd>
                  </div>
                </dl>
              </AdminCard>
            </div>
          </div>
        ) : (
          <AdminCard title="Restricted" description="Finance reports">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand" />
              <p className="text-sm text-muted">
                Finance reports are restricted to the finance, admin and super admin roles. Ask an
                administrator if you need the <code className="text-ink">view_finance</code>{" "}
                capability.
              </p>
            </div>
          </AdminCard>
        ))}

      {/* -------- invoice form -------- */}
      <SlideOver
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        title="New invoice"
        description={`${nextInvoiceNumber(invoiceForm.type)} will be issued.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setInvoiceOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void saveInvoice()} disabled={saving}>
              {saving ? "Saving…" : "Create invoice"}
            </Button>
          </>
        }
      >
        <Section title="Parties">
          <Field label="Customer" className="sm:col-span-2">
            <SelectInput
              value={invoiceForm.customerId}
              onChange={(event) =>
                setInvoiceForm((form) => ({
                  ...form,
                  customerId: event.target.value,
                  bookingId: "",
                }))
              }
            >
              <option value="">Select customer</option>
              {db.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} · {customer.email}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Booking" hint="Optional — only bookings for this customer" className="sm:col-span-2">
            <SelectInput
              value={invoiceForm.bookingId}
              disabled={!invoiceForm.customerId}
              onChange={(event) =>
                setInvoiceForm((form) => ({ ...form, bookingId: event.target.value }))
              }
            >
              <option value="">No booking</option>
              {db.bookings
                .filter((booking) => booking.customerId === invoiceForm.customerId)
                .map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    {booking.reference} · {formatGHS(booking.total)}
                  </option>
                ))}
            </SelectInput>
          </Field>
        </Section>

        <Section title="Document">
          <Field label="Type">
            <SelectInput
              value={invoiceForm.type}
              onChange={(event) =>
                setInvoiceForm((form) => ({ ...form, type: event.target.value }))
              }
            >
              {INVOICE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Status">
            <SelectInput
              value={invoiceForm.status}
              onChange={(event) =>
                setInvoiceForm((form) => ({ ...form, status: event.target.value }))
              }
            >
              {INVOICE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Issued">
            <TextInput
              type="date"
              value={invoiceForm.issuedAt}
              onChange={(event) =>
                setInvoiceForm((form) => ({ ...form, issuedAt: event.target.value }))
              }
            />
          </Field>
          <Field label="Due">
            <TextInput
              type="date"
              value={invoiceForm.dueAt}
              onChange={(event) =>
                setInvoiceForm((form) => ({ ...form, dueAt: event.target.value }))
              }
            />
          </Field>
        </Section>

        <Section title="Amounts">
          <Field label="Subtotal (GHS)">
            <TextInput
              type="number"
              min={0}
              value={invoiceForm.subtotal}
              onChange={(event) =>
                setInvoiceForm((form) => ({ ...form, subtotal: event.target.value }))
              }
            />
          </Field>
          <Field label="Tax (GHS)">
            <TextInput
              type="number"
              min={0}
              value={invoiceForm.tax}
              onChange={(event) => setInvoiceForm((form) => ({ ...form, tax: event.target.value }))}
            />
          </Field>
          <Field label="Total" hint="Subtotal + tax, calculated automatically" className="sm:col-span-2">
            <p className="rounded-xl border border-line bg-mist px-3 py-2 text-sm font-medium text-ink">
              {formatGHS(invoiceTotal)}
            </p>
          </Field>
        </Section>
      </SlideOver>

      {/* -------- deposit form -------- */}
      <SlideOver
        open={depositOpen}
        onClose={() => setDepositOpen(false)}
        title="New deposit"
        description="Record a security deposit held against a booking."
        width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDepositOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void saveDeposit()} disabled={saving}>
              {saving ? "Saving…" : "Record deposit"}
            </Button>
          </>
        }
      >
        <Section title="Deposit">
          <Field label="Booking" className="sm:col-span-2">
            <SelectInput
              value={depositForm.bookingId}
              onChange={(event) =>
                setDepositForm((form) => ({ ...form, bookingId: event.target.value }))
              }
            >
              <option value="">Select booking</option>
              {db.bookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {booking.reference} · {customerName(booking.customerId)}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Amount (GHS)">
            <TextInput
              type="number"
              min={0}
              value={depositForm.amount}
              onChange={(event) =>
                setDepositForm((form) => ({ ...form, amount: event.target.value }))
              }
            />
          </Field>
          <Field label="Status">
            <SelectInput
              value={depositForm.status}
              onChange={(event) =>
                setDepositForm((form) => ({ ...form, status: event.target.value }))
              }
            >
              {DEPOSIT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Note" className="sm:col-span-2">
            <TextArea
              value={depositForm.note}
              placeholder="Optional note for the deposit"
              onChange={(event) =>
                setDepositForm((form) => ({ ...form, note: event.target.value }))
              }
            />
          </Field>
        </Section>
      </SlideOver>

      {/* -------- refund form -------- */}
      <SlideOver
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        title="New refund"
        description="Raise a refund against a successful payment."
        width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRefundOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void saveRefund()} disabled={saving}>
              {saving ? "Saving…" : "Create refund"}
            </Button>
          </>
        }
      >
        <Section title="Refund">
          <Field label="Payment" className="sm:col-span-2">
            <SelectInput
              value={refundForm.paymentId}
              onChange={(event) => {
                const payment = db.payments.find((item) => item.id === event.target.value);
                setRefundForm((form) => ({
                  ...form,
                  paymentId: event.target.value,
                  amount: payment ? String(payment.amount) : form.amount,
                }));
              }}
            >
              <option value="">Select payment</option>
              {successfulPayments.map((payment) => (
                <option key={payment.id} value={payment.id}>
                  {payment.reference} · {formatGHS(payment.amount)} ·{" "}
                  {customerName(payment.customerId)}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Amount (GHS)">
            <TextInput
              type="number"
              min={0}
              value={refundForm.amount}
              onChange={(event) =>
                setRefundForm((form) => ({ ...form, amount: event.target.value }))
              }
            />
          </Field>
          <Field label="Status">
            <SelectInput
              value={refundForm.status}
              onChange={(event) =>
                setRefundForm((form) => ({ ...form, status: event.target.value }))
              }
            >
              {REFUND_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Reason" className="sm:col-span-2">
            <TextArea
              value={refundForm.reason}
              placeholder="Why is this refund being issued?"
              onChange={(event) =>
                setRefundForm((form) => ({ ...form, reason: event.target.value }))
              }
            />
          </Field>
        </Section>
      </SlideOver>

      {/* -------- expense form -------- */}
      <SlideOver
        open={expenseOpen}
        onClose={() => setExpenseOpen(false)}
        title="New expense"
        description={`Reference ${expenseForm.reference} will be logged.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setExpenseOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void saveExpense()} disabled={saving}>
              {saving ? "Saving…" : "Log expense"}
            </Button>
          </>
        }
      >
        <Section title="Expense">
          <Field label="Reference">
            <TextInput
              value={expenseForm.reference}
              onChange={(event) =>
                setExpenseForm((form) => ({ ...form, reference: event.target.value }))
              }
            />
          </Field>
          <Field label="Category">
            <SelectInput
              value={expenseForm.category}
              onChange={(event) =>
                setExpenseForm((form) => ({ ...form, category: event.target.value }))
              }
            >
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Vendor">
            <TextInput
              value={expenseForm.vendor}
              placeholder="Paid to"
              onChange={(event) =>
                setExpenseForm((form) => ({ ...form, vendor: event.target.value }))
              }
            />
          </Field>
          <Field label="Vehicle" hint="Optional">
            <SelectInput
              value={expenseForm.vehicleId}
              onChange={(event) =>
                setExpenseForm((form) => ({ ...form, vehicleId: event.target.value }))
              }
            >
              <option value="">No vehicle</option>
              {db.vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name} · {vehicle.plate}
                </option>
              ))}
            </SelectInput>
          </Field>
        </Section>

        <Section title="Payment">
          <Field label="Amount (GHS)">
            <TextInput
              type="number"
              min={0}
              value={expenseForm.amount}
              onChange={(event) =>
                setExpenseForm((form) => ({ ...form, amount: event.target.value }))
              }
            />
          </Field>
          <Field label="Spent">
            <TextInput
              type="date"
              value={expenseForm.spentAt}
              onChange={(event) =>
                setExpenseForm((form) => ({ ...form, spentAt: event.target.value }))
              }
            />
          </Field>
          <Field label="Status">
            <SelectInput
              value={expenseForm.status}
              onChange={(event) =>
                setExpenseForm((form) => ({ ...form, status: event.target.value }))
              }
            >
              {EXPENSE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Note" className="sm:col-span-2">
            <TextArea
              value={expenseForm.note}
              placeholder="Optional note"
              onChange={(event) => setExpenseForm((form) => ({ ...form, note: event.target.value }))}
            />
          </Field>
        </Section>
      </SlideOver>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title ?? ""}
        description={confirm?.description ?? ""}
        confirmLabel="Delete"
        onConfirm={() => confirm?.run()}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}

function nextExpenseReference(expenses: Expense[]): string {
  const max = expenses.reduce((acc, expense) => {
    const parsed = Number(expense.reference.replace(/\D/g, ""));
    return Number.isFinite(parsed) ? Math.max(acc, parsed) : acc;
  }, 2200);
  return `EXP-${max + 1}`;
}
