"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Package,
  Pencil,
  Play,
  Plus,
  Trash2,
  Wrench,
} from "lucide-react";
import {
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
import {
  deleteRow,
  insertRow,
  logAudit,
  updateRow,
  useDb,
  withLatency,
} from "@/lib/mock/store";
import type { MaintenanceOrder, MaintenanceSchedule, Vendor } from "@/lib/mock/types";
import { hasCapability } from "@/lib/permissions";
import { formatDate, formatGHS } from "@/lib/utils";

/* ------------------------------------------------------------- helpers */

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const ORDER_STATUSES = ["open", "in_progress", "waiting_parts", "completed", "cancelled"] as const;
const ORDER_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
const ORDER_KINDS = ["service", "repair", "accident"] as const;
const VENDOR_TYPES = ["garage", "parts", "tyres", "detailing", "insurance"] as const;

interface OrderFormState {
  vehicleId: string;
  vendorId: string;
  mechanic: string;
  priority: string;
  status: string;
  kind: string;
  description: string;
  odometerKm: string;
  labourCost: string;
  partsCost: string;
  openedAt: string;
  closedAt: string;
}

function emptyOrder(): OrderFormState {
  return {
    vehicleId: "",
    vendorId: "",
    mechanic: "",
    priority: "normal",
    status: "open",
    kind: "service",
    description: "",
    odometerKm: "",
    labourCost: "",
    partsCost: "",
    openedAt: todayIso(),
    closedAt: "",
  };
}

interface ScheduleFormState {
  vehicleId: string;
  service: string;
  intervalKm: string;
  intervalDays: string;
  dueAt: string;
  dueKm: string;
}

function emptySchedule(): ScheduleFormState {
  return {
    vehicleId: "",
    service: "Full service",
    intervalKm: "10000",
    intervalDays: "180",
    dueAt: todayIso(),
    dueKm: "",
  };
}

interface VendorFormState {
  name: string;
  type: string;
  contact: string;
  phone: string;
  email: string;
  rating: string;
}

function emptyVendor(): VendorFormState {
  return { name: "", type: "garage", contact: "", phone: "", email: "", rating: "4.0" };
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

export default function AdminMaintenancePage() {
  const db = useDb();
  const admin = useOptionalAdminSession();
  const { toast } = useToast();

  const actorName = admin?.session.name ?? "System";
  const role = admin?.role;
  const canDelete = role ? hasCapability(role, "delete_records") : false;

  const [tab, setTab] = useState("orders");
  const [saving, setSaving] = useState(false);

  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [orderOpen, setOrderOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderForm, setOrderForm] = useState<OrderFormState>(() => emptyOrder());
  const [deletingOrder, setDeletingOrder] = useState<MaintenanceOrder | null>(null);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState>(() => emptySchedule());
  const [deletingSchedule, setDeletingSchedule] = useState<MaintenanceSchedule | null>(null);

  const [vendorOpen, setVendorOpen] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [vendorForm, setVendorForm] = useState<VendorFormState>(() => emptyVendor());
  const [deletingVendor, setDeletingVendor] = useState<Vendor | null>(null);

  const paramsRead = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || paramsRead.current) return;
    paramsRead.current = true;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    const newParam = params.get("new");
    // Deferred so the mount-time state sync does not run synchronously inside
    // the effect body (keeps render work out of the effect commit phase).
    const id = window.setTimeout(() => {
      if (tabParam === "orders" || tabParam === "schedule" || tabParam === "vendors") {
        setTab(tabParam);
      }
      if (newParam === "order") {
        setEditingOrderId(null);
        setOrderForm({ ...emptyOrder(), vehicleId: db.vehicles[0]?.id ?? "", mechanic: actorName });
        setOrderOpen(true);
      } else if (newParam === "schedule") {
        setScheduleForm({ ...emptySchedule(), vehicleId: db.vehicles[0]?.id ?? "" });
        setScheduleOpen(true);
      } else if (newParam === "vendor") {
        setEditingVendorId(null);
        setVendorForm(emptyVendor());
        setVendorOpen(true);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [db, actorName]);

  /* --------------------------------------------------------- lookups */

  const vehicleName = (id: string) => db.vehicles.find((v) => v.id === id)?.name ?? "—";
  const vendorName = (id: string | null) =>
    id ? (db.vendors.find((v) => v.id === id)?.name ?? "—") : "—";

  const nextReference = () => {
    const max = db.maintenanceOrders.reduce((acc, order) => {
      const n = Number(order.reference.replace(/\D/g, ""));
      return Number.isFinite(n) ? Math.max(acc, n) : acc;
    }, 4000);
    return `WO-${max + 1}`;
  };

  /* --------------------------------------------------------- metrics */

  const metrics = useMemo(() => {
    const openOrders = db.maintenanceOrders.filter(
      (order) =>
        order.status === "open" ||
        order.status === "in_progress" ||
        order.status === "waiting_parts"
    );
    const waitingParts = db.maintenanceOrders.filter((order) => order.status === "waiting_parts");
    const overdue = db.maintenanceSchedules.filter((schedule) => schedule.overdue);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const spendThisMonth = db.maintenanceOrders
      .filter((order) => order.closedAt && new Date(order.closedAt) >= startOfMonth)
      .reduce((sum, order) => sum + order.labourCost + order.partsCost, 0);

    return { openOrders, waitingParts, overdue, spendThisMonth };
  }, [db]);

  const tabs: TabDef[] = [
    { id: "orders", label: "Work orders", count: metrics.openOrders.length },
    { id: "schedule", label: "Schedule", count: metrics.overdue.length },
    { id: "vendors", label: "Vendors", count: db.vendors.length },
  ];

  /* ----------------------------------------------------- work orders */

  const filteredOrders = useMemo(
    () =>
      db.maintenanceOrders.filter(
        (order) =>
          (statusFilter === "all" || order.status === statusFilter) &&
          (priorityFilter === "all" || order.priority === priorityFilter)
      ),
    [db.maintenanceOrders, statusFilter, priorityFilter]
  );

  const orderColumns: Column<MaintenanceOrder>[] = [
    {
      key: "reference",
      header: "Reference",
      render: (order) => <span className="font-medium text-ink">{order.reference}</span>,
      value: (order) => order.reference,
    },
    {
      key: "vehicle",
      header: "Vehicle",
      render: (order) => vehicleName(order.vehicleId),
      value: (order) => vehicleName(order.vehicleId),
    },
    {
      key: "kind",
      header: "Kind",
      render: (order) => <StatusPill status={order.kind} />,
      value: (order) => order.kind,
      hideBelow: "sm",
    },
    {
      key: "priority",
      header: "Priority",
      render: (order) => <StatusPill status={order.priority} />,
      value: (order) => order.priority,
    },
    {
      key: "status",
      header: "Status",
      render: (order) => <StatusPill status={order.status} />,
      value: (order) => order.status,
    },
    { key: "mechanic", header: "Mechanic", value: (order) => order.mechanic, hideBelow: "md" },
    {
      key: "vendor",
      header: "Vendor",
      render: (order) => vendorName(order.vendorId),
      value: (order) => vendorName(order.vendorId),
      hideBelow: "lg",
    },
    {
      key: "odometerKm",
      header: "Odometer",
      align: "right",
      render: (order) => `${order.odometerKm.toLocaleString()} km`,
      value: (order) => order.odometerKm,
      hideBelow: "lg",
    },
    {
      key: "cost",
      header: "Cost",
      align: "right",
      render: (order) => formatGHS(order.labourCost + order.partsCost),
      value: (order) => order.labourCost + order.partsCost,
    },
    {
      key: "openedAt",
      header: "Opened",
      render: (order) => formatDate(new Date(order.openedAt)),
      value: (order) => order.openedAt,
      hideBelow: "md",
    },
  ];

  const openNewOrder = () => {
    setEditingOrderId(null);
    setOrderForm({ ...emptyOrder(), vehicleId: db.vehicles[0]?.id ?? "", mechanic: actorName });
    setOrderOpen(true);
  };

  const openEditOrder = (order: MaintenanceOrder) => {
    setEditingOrderId(order.id);
    setOrderForm({
      vehicleId: order.vehicleId,
      vendorId: order.vendorId ?? "",
      mechanic: order.mechanic,
      priority: order.priority,
      status: order.status,
      kind: order.kind,
      description: order.description,
      odometerKm: String(order.odometerKm),
      labourCost: String(order.labourCost),
      partsCost: String(order.partsCost),
      openedAt: order.openedAt.slice(0, 10),
      closedAt: order.closedAt ? order.closedAt.slice(0, 10) : "",
    });
    setOrderOpen(true);
  };

  const saveOrder = async () => {
    if (!orderForm.vehicleId) {
      toast({ title: "Select a vehicle", description: "A work order needs a vehicle.", variant: "error" });
      return;
    }
    if (!orderForm.description.trim()) {
      toast({ title: "Add a description", variant: "error" });
      return;
    }
    setSaving(true);
    await withLatency(null);
    const existing = editingOrderId
      ? db.maintenanceOrders.find((order) => order.id === editingOrderId)
      : undefined;
    const reference = existing?.reference ?? nextReference();
    const payload = {
      reference,
      vehicleId: orderForm.vehicleId,
      vendorId: orderForm.vendorId || null,
      mechanic: orderForm.mechanic.trim() || "Unassigned",
      priority: orderForm.priority as MaintenanceOrder["priority"],
      status: orderForm.status as MaintenanceOrder["status"],
      kind: orderForm.kind as MaintenanceOrder["kind"],
      description: orderForm.description.trim(),
      odometerKm: Number(orderForm.odometerKm) || 0,
      labourCost: Number(orderForm.labourCost) || 0,
      partsCost: Number(orderForm.partsCost) || 0,
      openedAt: orderForm.openedAt ? new Date(orderForm.openedAt).toISOString() : new Date().toISOString(),
      closedAt:
        orderForm.status === "completed"
          ? orderForm.closedAt
            ? new Date(orderForm.closedAt).toISOString()
            : new Date().toISOString()
          : null,
    };
    if (editingOrderId) {
      updateRow("maintenanceOrders", editingOrderId, payload);
    } else {
      insertRow("maintenanceOrders", payload);
    }
    logAudit({
      actorName,
      action: editingOrderId ? "updated" : "created",
      entity: "Maintenance order",
      entityId: reference,
      detail: `${editingOrderId ? "Updated" : "Created"} work order ${reference}`,
    });
    setSaving(false);
    setOrderOpen(false);
    toast({
      title: editingOrderId ? "Work order updated" : "Work order created",
      description: reference,
      variant: "success",
    });
  };

  const setOrderStatus = async (order: MaintenanceOrder, status: MaintenanceOrder["status"]) => {
    setSaving(true);
    await withLatency(null);
    updateRow("maintenanceOrders", order.id, {
      status,
      closedAt: status === "completed" ? new Date().toISOString() : order.closedAt,
    });
    if (status === "completed") {
      updateRow("vehicles", order.vehicleId, { status: "available" });
    }
    logAudit({
      actorName,
      action: "updated",
      entity: "Maintenance order",
      entityId: order.reference,
      detail: `Status → ${status.replace(/_/g, " ")}`,
    });
    setSaving(false);
    toast({
      title: `Work order ${order.reference} updated`,
      description: status === "completed" ? "Vehicle marked available." : undefined,
      variant: "success",
    });
  };

  const deleteOrder = async (order: MaintenanceOrder) => {
    setSaving(true);
    await withLatency(null);
    deleteRow("maintenanceOrders", order.id);
    logAudit({
      actorName,
      action: "deleted",
      entity: "Maintenance order",
      entityId: order.reference,
      detail: `Deleted work order ${order.reference}`,
    });
    setSaving(false);
    toast({ title: "Work order deleted", variant: "success" });
  };

  /* ------------------------------------------------------- schedule */

  const scheduleColumns: Column<MaintenanceSchedule>[] = [
    {
      key: "vehicle",
      header: "Vehicle",
      render: (schedule) => vehicleName(schedule.vehicleId),
      value: (schedule) => vehicleName(schedule.vehicleId),
    },
    { key: "service", header: "Service", value: (schedule) => schedule.service },
    {
      key: "interval",
      header: "Interval",
      render: (schedule) =>
        `${schedule.intervalKm.toLocaleString()} km / ${schedule.intervalDays} d`,
      value: (schedule) => schedule.intervalKm,
      hideBelow: "md",
    },
    {
      key: "dueAt",
      header: "Due date",
      render: (schedule) => (
        <span className={schedule.overdue ? "font-medium text-brand" : "text-ink"}>
          {formatDate(new Date(schedule.dueAt))}
        </span>
      ),
      value: (schedule) => schedule.dueAt,
    },
    {
      key: "dueKm",
      header: "Due km",
      align: "right",
      render: (schedule) => `${schedule.dueKm.toLocaleString()} km`,
      value: (schedule) => schedule.dueKm,
      hideBelow: "sm",
    },
    {
      key: "overdue",
      header: "Overdue",
      render: (schedule) => (
        <StatusPill
          status={schedule.overdue ? "overdue" : "ok"}
          label={schedule.overdue ? "Overdue" : "On track"}
        />
      ),
      value: (schedule) => (schedule.overdue ? "overdue" : "ok"),
    },
  ];

  const openNewSchedule = () => {
    setScheduleForm({ ...emptySchedule(), vehicleId: db.vehicles[0]?.id ?? "" });
    setScheduleOpen(true);
  };

  const saveSchedule = async () => {
    if (!scheduleForm.vehicleId) {
      toast({ title: "Select a vehicle", variant: "error" });
      return;
    }
    if (!scheduleForm.service.trim()) {
      toast({ title: "Add a service name", variant: "error" });
      return;
    }
    setSaving(true);
    await withLatency(null);
    const dueAt = scheduleForm.dueAt || todayIso();
    insertRow("maintenanceSchedules", {
      vehicleId: scheduleForm.vehicleId,
      service: scheduleForm.service.trim(),
      intervalKm: Number(scheduleForm.intervalKm) || 0,
      intervalDays: Number(scheduleForm.intervalDays) || 0,
      dueAt,
      dueKm: Number(scheduleForm.dueKm) || 0,
      overdue: new Date(dueAt) < new Date(),
    });
    logAudit({
      actorName,
      action: "created",
      entity: "Maintenance schedule",
      entityId: scheduleForm.vehicleId,
      detail: `Scheduled "${scheduleForm.service.trim()}"`,
    });
    setSaving(false);
    setScheduleOpen(false);
    toast({ title: "Schedule added", variant: "success" });
  };

  const markServiced = async (schedule: MaintenanceSchedule) => {
    setSaving(true);
    await withLatency(null);
    const next = new Date(schedule.dueAt);
    next.setDate(next.getDate() + schedule.intervalDays);
    updateRow("maintenanceSchedules", schedule.id, {
      dueAt: next.toISOString().slice(0, 10),
      dueKm: schedule.dueKm + schedule.intervalKm,
      overdue: false,
    });
    logAudit({
      actorName,
      action: "updated",
      entity: "Maintenance schedule",
      entityId: schedule.id,
      detail: `Marked "${schedule.service}" serviced`,
    });
    setSaving(false);
    toast({
      title: "Marked as serviced",
      description: `Next due ${formatDate(next)}`,
      variant: "success",
    });
  };

  const deleteSchedule = async (schedule: MaintenanceSchedule) => {
    setSaving(true);
    await withLatency(null);
    deleteRow("maintenanceSchedules", schedule.id);
    logAudit({
      actorName,
      action: "deleted",
      entity: "Maintenance schedule",
      entityId: schedule.id,
      detail: `Deleted "${schedule.service}" schedule`,
    });
    setSaving(false);
    toast({ title: "Schedule deleted", variant: "success" });
  };

  /* -------------------------------------------------------- vendors */

  const vendorColumns: Column<Vendor>[] = [
    {
      key: "name",
      header: "Name",
      render: (vendor) => <span className="font-medium text-ink">{vendor.name}</span>,
      value: (vendor) => vendor.name,
    },
    {
      key: "type",
      header: "Type",
      render: (vendor) => <StatusPill status={vendor.type} />,
      value: (vendor) => vendor.type,
    },
    { key: "contact", header: "Contact", value: (vendor) => vendor.contact, hideBelow: "sm" },
    { key: "phone", header: "Phone", value: (vendor) => vendor.phone, hideBelow: "md" },
    { key: "email", header: "Email", value: (vendor) => vendor.email, hideBelow: "lg" },
    {
      key: "rating",
      header: "Rating",
      align: "right",
      render: (vendor) => vendor.rating.toFixed(1),
      value: (vendor) => vendor.rating,
    },
  ];

  const openNewVendor = () => {
    setEditingVendorId(null);
    setVendorForm(emptyVendor());
    setVendorOpen(true);
  };

  const openEditVendor = (vendor: Vendor) => {
    setEditingVendorId(vendor.id);
    setVendorForm({
      name: vendor.name,
      type: vendor.type,
      contact: vendor.contact,
      phone: vendor.phone,
      email: vendor.email,
      rating: String(vendor.rating),
    });
    setVendorOpen(true);
  };

  const saveVendor = async () => {
    if (!vendorForm.name.trim()) {
      toast({ title: "Add a vendor name", variant: "error" });
      return;
    }
    setSaving(true);
    await withLatency(null);
    const payload = {
      name: vendorForm.name.trim(),
      type: vendorForm.type as Vendor["type"],
      contact: vendorForm.contact.trim(),
      phone: vendorForm.phone.trim(),
      email: vendorForm.email.trim(),
      rating: Number(vendorForm.rating) || 0,
    };
    if (editingVendorId) {
      updateRow("vendors", editingVendorId, payload);
    } else {
      insertRow("vendors", payload);
    }
    logAudit({
      actorName,
      action: editingVendorId ? "updated" : "created",
      entity: "Vendor",
      entityId: editingVendorId ?? payload.name,
      detail: `${editingVendorId ? "Updated" : "Created"} vendor ${payload.name}`,
    });
    setSaving(false);
    setVendorOpen(false);
    toast({
      title: editingVendorId ? "Vendor updated" : "Vendor added",
      variant: "success",
    });
  };

  const deleteVendor = async (vendor: Vendor) => {
    setSaving(true);
    await withLatency(null);
    deleteRow("vendors", vendor.id);
    logAudit({
      actorName,
      action: "deleted",
      entity: "Vendor",
      entityId: vendor.id,
      detail: `Deleted vendor ${vendor.name}`,
    });
    setSaving(false);
    toast({ title: "Vendor deleted", variant: "success" });
  };

  /* ----------------------------------------------------------- view */

  return (
    <>
      <PageHeader
        title="Maintenance"
        description="Work orders, scheduled servicing and the workshop vendor list."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Open work orders"
          value={String(metrics.openOrders.length)}
          sub="Open, in progress or awaiting parts"
          icon={Wrench}
          tone={metrics.openOrders.length ? "warning" : "neutral"}
        />
        <KpiCard
          label="Waiting on parts"
          value={String(metrics.waitingParts.length)}
          sub="Blocked by parts supply"
          icon={Package}
          tone={metrics.waitingParts.length ? "danger" : "neutral"}
        />
        <KpiCard
          label="Overdue services"
          value={String(metrics.overdue.length)}
          sub="Past their scheduled date"
          icon={CalendarClock}
          tone={metrics.overdue.length ? "danger" : "neutral"}
        />
        <KpiCard
          label="Spend this month"
          value={formatGHS(metrics.spendThisMonth)}
          sub="Labour + parts, closed this month"
          icon={CircleDollarSign}
        />
      </div>

      <div className="mt-6">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      {tab === "orders" && (
        <DataTable<MaintenanceOrder>
          columns={orderColumns}
          rows={filteredOrders}
          searchFields={(order) =>
            `${order.reference} ${vehicleName(order.vehicleId)} ${order.mechanic}`
          }
          searchPlaceholder="Search reference, vehicle or mechanic…"
          exportFilename="maintenance-orders.csv"
          initialSort={{ key: "openedAt", dir: "desc" }}
          emptyTitle="No work orders match"
          emptyDescription="Adjust the filters or create a new work order."
          toolbar={
            <Button size="sm" onClick={openNewOrder}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              New work order
            </Button>
          }
          filters={
            <>
              <FilterSelect
                label="Status"
                value={statusFilter}
                options={["all", ...ORDER_STATUSES]}
                onChange={setStatusFilter}
              />
              <FilterSelect
                label="Priority"
                value={priorityFilter}
                options={["all", ...ORDER_PRIORITIES]}
                onChange={setPriorityFilter}
              />
            </>
          }
          rowActions={(order) => (
            <div className="flex items-center justify-end gap-1">
              {order.status !== "in_progress" && order.status !== "completed" && (
                <button
                  type="button"
                  aria-label={`Start work on ${order.reference}`}
                  disabled={saving}
                  onClick={() => void setOrderStatus(order, "in_progress")}
                  className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink disabled:opacity-40"
                >
                  <Play className="h-3.5 w-3.5" />
                </button>
              )}
              {order.status !== "waiting_parts" && order.status !== "completed" && (
                <button
                  type="button"
                  aria-label={`Mark ${order.reference} waiting for parts`}
                  disabled={saving}
                  onClick={() => void setOrderStatus(order, "waiting_parts")}
                  className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink disabled:opacity-40"
                >
                  <Clock className="h-3.5 w-3.5" />
                </button>
              )}
              {order.status !== "completed" && order.status !== "cancelled" && (
                <button
                  type="button"
                  aria-label={`Complete ${order.reference}`}
                  disabled={saving}
                  onClick={() => void setOrderStatus(order, "completed")}
                  className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-emerald-600 disabled:opacity-40"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                aria-label={`Edit ${order.reference}`}
                onClick={() => openEditOrder(order)}
                className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {canDelete && (
                <button
                  type="button"
                  aria-label={`Delete ${order.reference}`}
                  onClick={() => setDeletingOrder(order)}
                  className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-brand"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        />
      )}

      {tab === "schedule" && (
        <DataTable<MaintenanceSchedule>
          columns={scheduleColumns}
          rows={db.maintenanceSchedules}
          searchFields={(schedule) => `${vehicleName(schedule.vehicleId)} ${schedule.service}`}
          searchPlaceholder="Search vehicle or service…"
          exportFilename="maintenance-schedule.csv"
          emptyTitle="No service schedules"
          emptyDescription="Add a schedule to start tracking due services."
          toolbar={
            <Button size="sm" onClick={openNewSchedule}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add schedule
            </Button>
          }
          rowActions={(schedule) => (
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                aria-label={`Mark ${schedule.service} serviced`}
                disabled={saving}
                onClick={() => void markServiced(schedule)}
                className="rounded-lg border border-line px-2 py-1.5 text-[11px] font-medium text-muted transition-colors hover:text-ink disabled:opacity-40"
              >
                Mark serviced
              </button>
              {canDelete && (
                <button
                  type="button"
                  aria-label={`Delete ${schedule.service} schedule`}
                  onClick={() => setDeletingSchedule(schedule)}
                  className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-brand"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        />
      )}

      {tab === "vendors" && (
        <DataTable<Vendor>
          columns={vendorColumns}
          rows={db.vendors}
          searchFields={(vendor) => `${vendor.name} ${vendor.contact} ${vendor.email}`}
          searchPlaceholder="Search vendors…"
          exportFilename="maintenance-vendors.csv"
          emptyTitle="No vendors yet"
          emptyDescription="Add garages, parts suppliers and detailers you work with."
          toolbar={
            <Button size="sm" onClick={openNewVendor}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add vendor
            </Button>
          }
          rowActions={(vendor) => (
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                aria-label={`Edit ${vendor.name}`}
                onClick={() => openEditVendor(vendor)}
                className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {canDelete && (
                <button
                  type="button"
                  aria-label={`Delete ${vendor.name}`}
                  onClick={() => setDeletingVendor(vendor)}
                  className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-brand"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        />
      )}

      {/* -------- work order form -------- */}
      <SlideOver
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        title={editingOrderId ? "Edit work order" : "New work order"}
        description={
          editingOrderId
            ? "Update the job details and status."
            : `Reference ${nextReference()} will be created.`
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setOrderOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void saveOrder()} disabled={saving}>
              {saving ? "Saving…" : editingOrderId ? "Save changes" : "Create work order"}
            </Button>
          </>
        }
      >
        <Section title="Job">
          <Field label="Vehicle" className="sm:col-span-2">
            <SelectInput
              value={orderForm.vehicleId}
              onChange={(event) =>
                setOrderForm((form) => ({ ...form, vehicleId: event.target.value }))
              }
            >
              <option value="">Select vehicle</option>
              {db.vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name} · {vehicle.plate}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Kind">
            <SelectInput
              value={orderForm.kind}
              onChange={(event) => setOrderForm((form) => ({ ...form, kind: event.target.value }))}
            >
              {ORDER_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Priority">
            <SelectInput
              value={orderForm.priority}
              onChange={(event) =>
                setOrderForm((form) => ({ ...form, priority: event.target.value }))
              }
            >
              {ORDER_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <TextArea
              value={orderForm.description}
              placeholder="What needs doing?"
              onChange={(event) =>
                setOrderForm((form) => ({ ...form, description: event.target.value }))
              }
            />
          </Field>
        </Section>

        <Section title="Assignment">
          <Field label="Mechanic">
            <TextInput
              value={orderForm.mechanic}
              placeholder="Assigned to"
              onChange={(event) =>
                setOrderForm((form) => ({ ...form, mechanic: event.target.value }))
              }
            />
          </Field>
          <Field label="Vendor" hint="Optional workshop or supplier">
            <SelectInput
              value={orderForm.vendorId}
              onChange={(event) =>
                setOrderForm((form) => ({ ...form, vendorId: event.target.value }))
              }
            >
              <option value="">No vendor</option>
              {db.vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Odometer (km)">
            <TextInput
              type="number"
              min={0}
              value={orderForm.odometerKm}
              onChange={(event) =>
                setOrderForm((form) => ({ ...form, odometerKm: event.target.value }))
              }
            />
          </Field>
          <Field label="Opened">
            <TextInput
              type="date"
              value={orderForm.openedAt}
              onChange={(event) =>
                setOrderForm((form) => ({ ...form, openedAt: event.target.value }))
              }
            />
          </Field>
        </Section>

        <Section title="Costs & status">
          <Field label="Labour cost (GHS)">
            <TextInput
              type="number"
              min={0}
              value={orderForm.labourCost}
              onChange={(event) =>
                setOrderForm((form) => ({ ...form, labourCost: event.target.value }))
              }
            />
          </Field>
          <Field label="Parts cost (GHS)">
            <TextInput
              type="number"
              min={0}
              value={orderForm.partsCost}
              onChange={(event) =>
                setOrderForm((form) => ({ ...form, partsCost: event.target.value }))
              }
            />
          </Field>
          <Field label="Status">
            <SelectInput
              value={orderForm.status}
              onChange={(event) =>
                setOrderForm((form) => ({
                  ...form,
                  status: event.target.value,
                  closedAt:
                    event.target.value === "completed" && !form.closedAt
                      ? todayIso()
                      : form.closedAt,
                }))
              }
            >
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, " ")}
                </option>
              ))}
            </SelectInput>
          </Field>
          {orderForm.status === "completed" && (
            <Field label="Closed">
              <TextInput
                type="date"
                value={orderForm.closedAt}
                onChange={(event) =>
                  setOrderForm((form) => ({ ...form, closedAt: event.target.value }))
                }
              />
            </Field>
          )}
        </Section>
      </SlideOver>

      {/* -------- schedule form -------- */}
      <SlideOver
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title="Add service schedule"
        description="Recurring servicing tracked by date and distance."
        width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void saveSchedule()} disabled={saving}>
              {saving ? "Saving…" : "Add schedule"}
            </Button>
          </>
        }
      >
        <Section title="Schedule">
          <Field label="Vehicle" className="sm:col-span-2">
            <SelectInput
              value={scheduleForm.vehicleId}
              onChange={(event) =>
                setScheduleForm((form) => ({ ...form, vehicleId: event.target.value }))
              }
            >
              <option value="">Select vehicle</option>
              {db.vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name} · {vehicle.plate}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Service" className="sm:col-span-2">
            <TextInput
              value={scheduleForm.service}
              placeholder="e.g. Full service"
              onChange={(event) =>
                setScheduleForm((form) => ({ ...form, service: event.target.value }))
              }
            />
          </Field>
          <Field label="Interval (km)">
            <TextInput
              type="number"
              min={0}
              value={scheduleForm.intervalKm}
              onChange={(event) =>
                setScheduleForm((form) => ({ ...form, intervalKm: event.target.value }))
              }
            />
          </Field>
          <Field label="Interval (days)">
            <TextInput
              type="number"
              min={0}
              value={scheduleForm.intervalDays}
              onChange={(event) =>
                setScheduleForm((form) => ({ ...form, intervalDays: event.target.value }))
              }
            />
          </Field>
          <Field label="Due date">
            <TextInput
              type="date"
              value={scheduleForm.dueAt}
              onChange={(event) =>
                setScheduleForm((form) => ({ ...form, dueAt: event.target.value }))
              }
            />
          </Field>
          <Field label="Due km">
            <TextInput
              type="number"
              min={0}
              value={scheduleForm.dueKm}
              onChange={(event) =>
                setScheduleForm((form) => ({ ...form, dueKm: event.target.value }))
              }
            />
          </Field>
        </Section>
      </SlideOver>

      {/* -------- vendor form -------- */}
      <SlideOver
        open={vendorOpen}
        onClose={() => setVendorOpen(false)}
        title={editingVendorId ? "Edit vendor" : "Add vendor"}
        description="Garages, parts suppliers, tyre and detailing partners."
        width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setVendorOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void saveVendor()} disabled={saving}>
              {saving ? "Saving…" : editingVendorId ? "Save changes" : "Add vendor"}
            </Button>
          </>
        }
      >
        <Section title="Vendor">
          <Field label="Name" className="sm:col-span-2">
            <TextInput
              value={vendorForm.name}
              onChange={(event) =>
                setVendorForm((form) => ({ ...form, name: event.target.value }))
              }
            />
          </Field>
          <Field label="Type">
            <SelectInput
              value={vendorForm.type}
              onChange={(event) =>
                setVendorForm((form) => ({ ...form, type: event.target.value }))
              }
            >
              {VENDOR_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Contact person">
            <TextInput
              value={vendorForm.contact}
              onChange={(event) =>
                setVendorForm((form) => ({ ...form, contact: event.target.value }))
              }
            />
          </Field>
          <Field label="Phone">
            <TextInput
              value={vendorForm.phone}
              onChange={(event) =>
                setVendorForm((form) => ({ ...form, phone: event.target.value }))
              }
            />
          </Field>
          <Field label="Email">
            <TextInput
              type="email"
              value={vendorForm.email}
              onChange={(event) =>
                setVendorForm((form) => ({ ...form, email: event.target.value }))
              }
            />
          </Field>
          <Field label="Rating" hint="0 – 5">
            <TextInput
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={vendorForm.rating}
              onChange={(event) =>
                setVendorForm((form) => ({ ...form, rating: event.target.value }))
              }
            />
          </Field>
        </Section>
      </SlideOver>

      <ConfirmDialog
        open={Boolean(deletingOrder)}
        title="Delete work order"
        description={`This permanently removes ${deletingOrder?.reference ?? "this work order"}.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deletingOrder) void deleteOrder(deletingOrder);
        }}
        onClose={() => setDeletingOrder(null)}
      />
      <ConfirmDialog
        open={Boolean(deletingSchedule)}
        title="Delete schedule"
        description={`This removes the "${deletingSchedule?.service ?? "service"}" schedule.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deletingSchedule) void deleteSchedule(deletingSchedule);
        }}
        onClose={() => setDeletingSchedule(null)}
      />
      <ConfirmDialog
        open={Boolean(deletingVendor)}
        title="Delete vendor"
        description={`This permanently removes ${deletingVendor?.name ?? "this vendor"}.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deletingVendor) void deleteVendor(deletingVendor);
        }}
        onClose={() => setDeletingVendor(null)}
      />
    </>
  );
}
