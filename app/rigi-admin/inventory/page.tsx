"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  CircleDollarSign,
  Eye,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
  Truck,
  X,
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
import type {
  InventoryItem,
  PurchaseOrder,
  StockMovement,
  Supplier,
} from "@/lib/mock/types";
import { hasCapability } from "@/lib/permissions";
import { formatDate, formatGHS } from "@/lib/utils";

/* ------------------------------------------------------------- helpers */

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const MOVEMENT_KINDS = ["in", "out", "adjust"] as const;

interface ItemFormState {
  sku: string;
  name: string;
  category: string;
  unit: string;
  quantity: string;
  reorderLevel: string;
  unitCost: string;
  location: string;
  supplierId: string;
}

function emptyItem(): ItemFormState {
  return {
    sku: "",
    name: "",
    category: "",
    unit: "piece",
    quantity: "0",
    reorderLevel: "5",
    unitCost: "0",
    location: "Main store",
    supplierId: "",
  };
}

interface AdjustFormState {
  itemId: string;
  kind: string;
  quantity: string;
  reason: string;
  workOrderId: string;
}

function emptyAdjust(): AdjustFormState {
  return { itemId: "", kind: "in", quantity: "1", reason: "", workOrderId: "" };
}

interface POLine {
  itemId: string;
  name: string;
  quantity: string;
  unitCost: string;
}

interface SupplierFormState {
  name: string;
  contact: string;
  phone: string;
  email: string;
  category: string;
  leadTimeDays: string;
}

function emptySupplier(): SupplierFormState {
  return { name: "", contact: "", phone: "", email: "", category: "", leadTimeDays: "5" };
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

export default function AdminInventoryPage() {
  const db = useDb();
  const admin = useOptionalAdminSession();
  const { toast } = useToast();

  const actorName = admin?.session.name ?? "System";
  const role = admin?.role;
  const canDelete = role ? hasCapability(role, "delete_records") : false;

  const [tab, setTab] = useState("items");
  const [saving, setSaving] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");

  const [itemOpen, setItemOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormState>(() => emptyItem());
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState<AdjustFormState>(() => emptyAdjust());

  const [poOpen, setPoOpen] = useState(false);
  const [poForm, setPoForm] = useState<{
    supplierId: string;
    orderedAt: string;
    expectedAt: string;
    lines: POLine[];
  }>(() => ({ supplierId: "", orderedAt: todayIso(), expectedAt: addDaysIso(7), lines: [] }));
  const [detailPo, setDetailPo] = useState<PurchaseOrder | null>(null);
  const [deletingPo, setDeletingPo] = useState<PurchaseOrder | null>(null);

  const [supplierOpen, setSupplierOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [supplierForm, setSupplierForm] = useState<SupplierFormState>(() => emptySupplier());
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

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
      if (
        tabParam === "items" ||
        tabParam === "movements" ||
        tabParam === "orders" ||
        tabParam === "suppliers"
      ) {
        setTab(tabParam);
      }
      if (newParam === "item") {
        setEditingItemId(null);
        setItemForm(emptyItem());
        setItemOpen(true);
      } else if (newParam === "movement") {
        setAdjustForm({ ...emptyAdjust(), itemId: db.inventoryItems[0]?.id ?? "" });
        setAdjustOpen(true);
      } else if (newParam === "po") {
        setPoForm({ supplierId: "", orderedAt: todayIso(), expectedAt: addDaysIso(7), lines: [] });
        setPoOpen(true);
      } else if (newParam === "supplier") {
        setEditingSupplierId(null);
        setSupplierForm(emptySupplier());
        setSupplierOpen(true);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [db]);

  /* --------------------------------------------------------- lookups */

  const itemName = (id: string) => db.inventoryItems.find((item) => item.id === id)?.name ?? "—";
  const vehicleName = (id: string) =>
    db.vehicles.find((vehicle) => vehicle.id === id)?.name ?? "Vehicle";
  const supplierName = (id: string | null) =>
    id ? (db.suppliers.find((supplier) => supplier.id === id)?.name ?? "—") : "—";
  const workOrderRef = (id: string | null) =>
    id ? (db.maintenanceOrders.find((order) => order.id === id)?.reference ?? "—") : "—";

  const categories = useMemo(
    () => Array.from(new Set(db.inventoryItems.map((item) => item.category))).sort(),
    [db.inventoryItems]
  );

  /* --------------------------------------------------------- metrics */

  const metrics = useMemo(() => {
    const lowStock = db.inventoryItems.filter((item) => item.quantity <= item.reorderLevel);
    const stockValue = db.inventoryItems.reduce(
      (sum, item) => sum + item.quantity * item.unitCost,
      0
    );
    const openPos = db.purchaseOrders.filter(
      (po) => po.status === "ordered" || po.status === "draft"
    );
    return { lowStock, stockValue, openPos };
  }, [db.inventoryItems, db.purchaseOrders]);

  const tabs: TabDef[] = [
    { id: "items", label: "Items", count: db.inventoryItems.length },
    { id: "movements", label: "Stock movements", count: db.stockMovements.length },
    { id: "orders", label: "Purchase orders", count: db.purchaseOrders.length },
    { id: "suppliers", label: "Suppliers", count: db.suppliers.length },
  ];

  /* ----------------------------------------------------------- items */

  const filteredItems = useMemo(
    () =>
      categoryFilter === "all"
        ? db.inventoryItems
        : db.inventoryItems.filter((item) => item.category === categoryFilter),
    [db.inventoryItems, categoryFilter]
  );

  const itemColumns: Column<InventoryItem>[] = [
    {
      key: "sku",
      header: "SKU",
      render: (item) => <span className="font-mono text-xs text-muted">{item.sku}</span>,
      value: (item) => item.sku,
    },
    {
      key: "name",
      header: "Name",
      render: (item) => <span className="font-medium text-ink">{item.name}</span>,
      value: (item) => item.name,
    },
    { key: "category", header: "Category", value: (item) => item.category, hideBelow: "md" },
    {
      key: "quantity",
      header: "Quantity",
      align: "right",
      render: (item) =>
        item.quantity <= item.reorderLevel ? (
          <span className="inline-flex items-center justify-end gap-2">
            <span className="text-ink">{item.quantity}</span>
            <StatusPill status="low" label="Low" />
          </span>
        ) : (
          <span className="text-ink">{item.quantity}</span>
        ),
      value: (item) => item.quantity,
    },
    {
      key: "reorderLevel",
      header: "Reorder level",
      align: "right",
      value: (item) => item.reorderLevel,
      hideBelow: "md",
    },
    {
      key: "unitCost",
      header: "Unit cost",
      align: "right",
      render: (item) => formatGHS(item.unitCost),
      value: (item) => item.unitCost,
      hideBelow: "sm",
    },
    {
      key: "value",
      header: "Value",
      align: "right",
      render: (item) => formatGHS(item.quantity * item.unitCost),
      value: (item) => item.quantity * item.unitCost,
    },
    {
      key: "supplier",
      header: "Supplier",
      render: (item) => supplierName(item.supplierId),
      value: (item) => supplierName(item.supplierId),
      hideBelow: "lg",
    },
  ];

  const openNewItem = () => {
    setEditingItemId(null);
    setItemForm(emptyItem());
    setItemOpen(true);
  };

  const openEditItem = (item: InventoryItem) => {
    setEditingItemId(item.id);
    setItemForm({
      sku: item.sku,
      name: item.name,
      category: item.category,
      unit: item.unit,
      quantity: String(item.quantity),
      reorderLevel: String(item.reorderLevel),
      unitCost: String(item.unitCost),
      location: item.location,
      supplierId: item.supplierId ?? "",
    });
    setItemOpen(true);
  };

  const saveItem = async () => {
    if (!itemForm.name.trim()) {
      toast({ title: "Add an item name", variant: "error" });
      return;
    }
    setSaving(true);
    await withLatency(null);
    const payload = {
      sku: itemForm.sku.trim() || `RIG-${Date.now().toString().slice(-6)}`,
      name: itemForm.name.trim(),
      category: itemForm.category.trim() || "Uncategorised",
      unit: itemForm.unit.trim() || "piece",
      quantity: Number(itemForm.quantity) || 0,
      reorderLevel: Number(itemForm.reorderLevel) || 0,
      unitCost: Number(itemForm.unitCost) || 0,
      location: itemForm.location.trim() || "Main store",
      supplierId: itemForm.supplierId || null,
    };
    if (editingItemId) {
      updateRow("inventoryItems", editingItemId, payload);
    } else {
      insertRow("inventoryItems", payload);
    }
    logAudit({
      actorName,
      action: editingItemId ? "updated" : "created",
      entity: "Inventory item",
      entityId: editingItemId ?? payload.sku,
      detail: `${editingItemId ? "Updated" : "Created"} item ${payload.name}`,
    });
    setSaving(false);
    setItemOpen(false);
    toast({ title: editingItemId ? "Item updated" : "Item added", variant: "success" });
  };

  const deleteItem = async (item: InventoryItem) => {
    setSaving(true);
    await withLatency(null);
    deleteRow("inventoryItems", item.id);
    logAudit({
      actorName,
      action: "deleted",
      entity: "Inventory item",
      entityId: item.sku,
      detail: `Deleted item ${item.name}`,
    });
    setSaving(false);
    toast({ title: "Item deleted", variant: "success" });
  };

  /* -------------------------------------------------- stock movements */

  const openAdjust = (itemId: string) => {
    setAdjustForm({ ...emptyAdjust(), itemId });
    setAdjustOpen(true);
  };

  const saveAdjustment = async () => {
    if (!adjustForm.itemId) {
      toast({ title: "Select an item", variant: "error" });
      return;
    }
    const quantity = Number(adjustForm.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast({ title: "Enter a quantity greater than zero", variant: "error" });
      return;
    }
    const item = db.inventoryItems.find((row) => row.id === adjustForm.itemId);
    if (!item) {
      toast({ title: "Item not found", variant: "error" });
      return;
    }
    setSaving(true);
    await withLatency(null);
    insertRow("stockMovements", {
      itemId: item.id,
      kind: adjustForm.kind as StockMovement["kind"],
      quantity,
      reason: adjustForm.reason.trim() || "Manual adjustment",
      workOrderId: adjustForm.workOrderId || null,
      by: actorName,
    });
    const nextQuantity =
      adjustForm.kind === "in"
        ? item.quantity + quantity
        : adjustForm.kind === "out"
          ? Math.max(0, item.quantity - quantity)
          : quantity;
    updateRow("inventoryItems", item.id, { quantity: nextQuantity });
    logAudit({
      actorName,
      action: "created",
      entity: "Stock movement",
      entityId: item.sku,
      detail: `${adjustForm.kind} ${quantity} × ${item.name}`,
    });
    setSaving(false);
    setAdjustOpen(false);
    toast({
      title: "Stock updated",
      description: `${item.name} now at ${nextQuantity}`,
      variant: "success",
    });
  };

  const filteredMovements = useMemo(
    () =>
      kindFilter === "all"
        ? db.stockMovements
        : db.stockMovements.filter((movement) => movement.kind === kindFilter),
    [db.stockMovements, kindFilter]
  );

  const movementColumns: Column<StockMovement>[] = [
    {
      key: "item",
      header: "Item",
      render: (movement) => <span className="font-medium text-ink">{itemName(movement.itemId)}</span>,
      value: (movement) => itemName(movement.itemId),
    },
    {
      key: "kind",
      header: "Kind",
      render: (movement) => <StatusPill status={movement.kind} />,
      value: (movement) => movement.kind,
    },
    {
      key: "quantity",
      header: "Quantity",
      align: "right",
      render: (movement) => (
        <span
          className={
            movement.kind === "in"
              ? "font-medium text-emerald-600"
              : movement.kind === "out"
                ? "font-medium text-brand"
                : "font-medium text-ink"
          }
        >
          {movement.kind === "in" ? "+" : movement.kind === "out" ? "−" : "="}
          {movement.quantity}
        </span>
      ),
      value: (movement) => movement.quantity,
    },
    { key: "reason", header: "Reason", value: (movement) => movement.reason, hideBelow: "md" },
    {
      key: "workOrder",
      header: "Work order",
      render: (movement) => workOrderRef(movement.workOrderId),
      value: (movement) => workOrderRef(movement.workOrderId),
      hideBelow: "lg",
    },
    { key: "by", header: "By", value: (movement) => movement.by, hideBelow: "sm" },
    {
      key: "date",
      header: "Date",
      render: (movement) => formatDate(new Date(movement.createdAt)),
      value: (movement) => movement.createdAt,
      hideBelow: "md",
    },
  ];

  /* --------------------------------------------------- purchase orders */

  const nextPoNumber = () => {
    const max = db.purchaseOrders.reduce((acc, po) => {
      const n = Number(po.number.replace(/\D/g, ""));
      return Number.isFinite(n) ? Math.max(acc, n) : acc;
    }, 6000);
    return `PO-${max + 1}`;
  };

  const openNewPo = () => {
    setPoForm({ supplierId: "", orderedAt: todayIso(), expectedAt: addDaysIso(7), lines: [] });
    setPoOpen(true);
  };

  const updatePOLine = (index: number, patch: Partial<POLine>) => {
    setPoForm((form) => ({
      ...form,
      lines: form.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    }));
  };

  const selectPoItem = (index: number, itemId: string) => {
    const item = db.inventoryItems.find((row) => row.id === itemId);
    updatePOLine(index, {
      itemId,
      name: item?.name ?? "",
      unitCost: item ? String(item.unitCost) : "",
    });
  };

  const poTotal = useMemo(
    () =>
      poForm.lines.reduce(
        (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitCost) || 0),
        0
      ),
    [poForm.lines]
  );

  const savePo = async () => {
    if (!poForm.supplierId) {
      toast({ title: "Select a supplier", variant: "error" });
      return;
    }
    const lines = poForm.lines
      .filter((line) => line.itemId && (Number(line.quantity) || 0) > 0)
      .map((line) => ({
        itemId: line.itemId,
        name: line.name,
        quantity: Number(line.quantity) || 0,
        unitCost: Number(line.unitCost) || 0,
      }));
    if (lines.length === 0) {
      toast({ title: "Add at least one line item", variant: "error" });
      return;
    }
    setSaving(true);
    await withLatency(null);
    const number = nextPoNumber();
    const total = lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0);
    insertRow("purchaseOrders", {
      number,
      supplierId: poForm.supplierId,
      status: "draft",
      orderedAt: poForm.orderedAt ? new Date(poForm.orderedAt).toISOString() : new Date().toISOString(),
      expectedAt: poForm.expectedAt ? new Date(poForm.expectedAt).toISOString() : new Date().toISOString(),
      total,
      lines,
    });
    logAudit({
      actorName,
      action: "created",
      entity: "Purchase order",
      entityId: number,
      detail: `Created ${number} (${lines.length} lines)`,
    });
    setSaving(false);
    setPoOpen(false);
    toast({ title: "Purchase order created", description: number, variant: "success" });
  };

  const markReceived = async (po: PurchaseOrder) => {
    setSaving(true);
    await withLatency(null);
    updateRow("purchaseOrders", po.id, { status: "received" });
    po.lines.forEach((line) => {
      insertRow("stockMovements", {
        itemId: line.itemId,
        kind: "in",
        quantity: line.quantity,
        reason: `PO ${po.number} received`,
        workOrderId: null,
        by: actorName,
      });
      const item = db.inventoryItems.find((row) => row.id === line.itemId);
      if (item) {
        updateRow("inventoryItems", item.id, { quantity: item.quantity + line.quantity });
      }
    });
    logAudit({
      actorName,
      action: "updated",
      entity: "Purchase order",
      entityId: po.number,
      detail: `Received ${po.number} — stock incremented`,
    });
    setSaving(false);
    setDetailPo(null);
    toast({
      title: "Purchase order received",
      description: `${po.lines.length} line${po.lines.length === 1 ? "" : "s"} added to stock`,
      variant: "success",
    });
  };

  const cancelPo = async (po: PurchaseOrder) => {
    setSaving(true);
    await withLatency(null);
    updateRow("purchaseOrders", po.id, { status: "cancelled" });
    logAudit({
      actorName,
      action: "updated",
      entity: "Purchase order",
      entityId: po.number,
      detail: `Cancelled ${po.number}`,
    });
    setSaving(false);
    setDetailPo(null);
    toast({ title: "Purchase order cancelled", variant: "success" });
  };

  const deletePo = async (po: PurchaseOrder) => {
    setSaving(true);
    await withLatency(null);
    deleteRow("purchaseOrders", po.id);
    logAudit({
      actorName,
      action: "deleted",
      entity: "Purchase order",
      entityId: po.number,
      detail: `Deleted ${po.number}`,
    });
    setSaving(false);
    toast({ title: "Purchase order deleted", variant: "success" });
  };

  const poColumns: Column<PurchaseOrder>[] = [
    {
      key: "number",
      header: "Number",
      render: (po) => <span className="font-medium text-ink">{po.number}</span>,
      value: (po) => po.number,
    },
    {
      key: "supplier",
      header: "Supplier",
      render: (po) => supplierName(po.supplierId),
      value: (po) => supplierName(po.supplierId),
    },
    {
      key: "status",
      header: "Status",
      render: (po) => <StatusPill status={po.status} />,
      value: (po) => po.status,
    },
    {
      key: "orderedAt",
      header: "Ordered",
      render: (po) => formatDate(new Date(po.orderedAt)),
      value: (po) => po.orderedAt,
      hideBelow: "md",
    },
    {
      key: "expectedAt",
      header: "Expected",
      render: (po) => formatDate(new Date(po.expectedAt)),
      value: (po) => po.expectedAt,
      hideBelow: "md",
    },
    {
      key: "lines",
      header: "Lines",
      align: "right",
      render: (po) => po.lines.length,
      value: (po) => po.lines.length,
      hideBelow: "sm",
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      render: (po) => formatGHS(po.total),
      value: (po) => po.total,
    },
  ];

  /* ------------------------------------------------------- suppliers */

  const supplierColumns: Column<Supplier>[] = [
    {
      key: "name",
      header: "Name",
      render: (supplier) => <span className="font-medium text-ink">{supplier.name}</span>,
      value: (supplier) => supplier.name,
    },
    { key: "contact", header: "Contact", value: (supplier) => supplier.contact, hideBelow: "sm" },
    { key: "phone", header: "Phone", value: (supplier) => supplier.phone, hideBelow: "md" },
    { key: "email", header: "Email", value: (supplier) => supplier.email, hideBelow: "lg" },
    { key: "category", header: "Category", value: (supplier) => supplier.category },
    {
      key: "leadTimeDays",
      header: "Lead time (days)",
      align: "right",
      value: (supplier) => supplier.leadTimeDays,
    },
  ];

  const openNewSupplier = () => {
    setEditingSupplierId(null);
    setSupplierForm(emptySupplier());
    setSupplierOpen(true);
  };

  const openEditSupplier = (supplier: Supplier) => {
    setEditingSupplierId(supplier.id);
    setSupplierForm({
      name: supplier.name,
      contact: supplier.contact,
      phone: supplier.phone,
      email: supplier.email,
      category: supplier.category,
      leadTimeDays: String(supplier.leadTimeDays),
    });
    setSupplierOpen(true);
  };

  const saveSupplier = async () => {
    if (!supplierForm.name.trim()) {
      toast({ title: "Add a supplier name", variant: "error" });
      return;
    }
    setSaving(true);
    await withLatency(null);
    const payload = {
      name: supplierForm.name.trim(),
      contact: supplierForm.contact.trim(),
      phone: supplierForm.phone.trim(),
      email: supplierForm.email.trim(),
      category: supplierForm.category.trim() || "General",
      leadTimeDays: Number(supplierForm.leadTimeDays) || 0,
    };
    if (editingSupplierId) {
      updateRow("suppliers", editingSupplierId, payload);
    } else {
      insertRow("suppliers", payload);
    }
    logAudit({
      actorName,
      action: editingSupplierId ? "updated" : "created",
      entity: "Supplier",
      entityId: editingSupplierId ?? payload.name,
      detail: `${editingSupplierId ? "Updated" : "Created"} supplier ${payload.name}`,
    });
    setSaving(false);
    setSupplierOpen(false);
    toast({ title: editingSupplierId ? "Supplier updated" : "Supplier added", variant: "success" });
  };

  const deleteSupplier = async (supplier: Supplier) => {
    setSaving(true);
    await withLatency(null);
    deleteRow("suppliers", supplier.id);
    logAudit({
      actorName,
      action: "deleted",
      entity: "Supplier",
      entityId: supplier.id,
      detail: `Deleted supplier ${supplier.name}`,
    });
    setSaving(false);
    toast({ title: "Supplier deleted", variant: "success" });
  };

  /* ----------------------------------------------------------- view */

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Parts and consumables, stock movements, purchasing and suppliers."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Total items"
          value={String(db.inventoryItems.length)}
          sub="Active SKUs tracked"
          icon={Boxes}
        />
        <KpiCard
          label="Low stock"
          value={String(metrics.lowStock.length)}
          sub="At or below reorder level"
          icon={AlertTriangle}
          tone={metrics.lowStock.length ? "warning" : "neutral"}
        />
        <KpiCard
          label="Stock value"
          value={formatGHS(metrics.stockValue)}
          sub="Quantity × unit cost"
          icon={CircleDollarSign}
        />
        <KpiCard
          label="Open purchase orders"
          value={String(metrics.openPos.length)}
          sub="Draft or ordered"
          icon={ShoppingCart}
          tone={metrics.openPos.length ? "warning" : "neutral"}
        />
      </div>

      <div className="mt-6">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      {tab === "items" && (
        <DataTable<InventoryItem>
          columns={itemColumns}
          rows={filteredItems}
          searchFields={(item) => `${item.sku} ${item.name} ${item.category}`}
          searchPlaceholder="Search SKU, name or category…"
          exportFilename="inventory-items.csv"
          initialSort={{ key: "name", dir: "asc" }}
          emptyTitle="No items match"
          emptyDescription="Adjust the filter or add a new item."
          toolbar={
            <Button size="sm" onClick={openNewItem}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add item
            </Button>
          }
          filters={
            <FilterSelect
              label="Category"
              value={categoryFilter}
              options={["all", ...categories]}
              onChange={setCategoryFilter}
            />
          }
          rowActions={(item) => (
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                aria-label={`Adjust stock for ${item.name}`}
                onClick={() => openAdjust(item.id)}
                className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Edit ${item.name}`}
                onClick={() => openEditItem(item)}
                className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {canDelete && (
                <button
                  type="button"
                  aria-label={`Delete ${item.name}`}
                  onClick={() => setDeletingItem(item)}
                  className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-brand"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        />
      )}

      {tab === "movements" && (
        <DataTable<StockMovement>
          columns={movementColumns}
          rows={filteredMovements}
          searchFields={(movement) => `${itemName(movement.itemId)} ${movement.reason} ${movement.by}`}
          searchPlaceholder="Search item, reason or user…"
          exportFilename="stock-movements.csv"
          initialSort={{ key: "date", dir: "desc" }}
          emptyTitle="No stock movements"
          emptyDescription="Record a movement to start tracking inventory changes."
          toolbar={
            <Button size="sm" onClick={() => openAdjust(db.inventoryItems[0]?.id ?? "")}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Record movement
            </Button>
          }
          filters={
            <FilterSelect
              label="Kind"
              value={kindFilter}
              options={["all", ...MOVEMENT_KINDS]}
              onChange={setKindFilter}
            />
          }
        />
      )}

      {tab === "orders" && (
        <DataTable<PurchaseOrder>
          columns={poColumns}
          rows={db.purchaseOrders}
          searchFields={(po) => `${po.number} ${supplierName(po.supplierId)}`}
          searchPlaceholder="Search PO number or supplier…"
          exportFilename="purchase-orders.csv"
          initialSort={{ key: "orderedAt", dir: "desc" }}
          onRowClick={(po) => setDetailPo(po)}
          emptyTitle="No purchase orders"
          emptyDescription="Raise a purchase order to replenish stock."
          toolbar={
            <Button size="sm" onClick={openNewPo}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              New purchase order
            </Button>
          }
          rowActions={(po) => (
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                aria-label={`View ${po.number}`}
                onClick={() => setDetailPo(po)}
                className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              {po.status !== "received" && po.status !== "cancelled" && (
                <button
                  type="button"
                  aria-label={`Mark ${po.number} received`}
                  disabled={saving}
                  onClick={() => void markReceived(po)}
                  className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-emerald-600 disabled:opacity-40"
                >
                  <Truck className="h-3.5 w-3.5" />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  aria-label={`Delete ${po.number}`}
                  onClick={() => setDeletingPo(po)}
                  className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-brand"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        />
      )}

      {tab === "suppliers" && (
        <DataTable<Supplier>
          columns={supplierColumns}
          rows={db.suppliers}
          searchFields={(supplier) => `${supplier.name} ${supplier.contact} ${supplier.email}`}
          searchPlaceholder="Search suppliers…"
          exportFilename="suppliers.csv"
          emptyTitle="No suppliers yet"
          emptyDescription="Add the vendors you buy parts and consumables from."
          toolbar={
            <Button size="sm" onClick={openNewSupplier}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add supplier
            </Button>
          }
          rowActions={(supplier) => (
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                aria-label={`Edit ${supplier.name}`}
                onClick={() => openEditSupplier(supplier)}
                className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {canDelete && (
                <button
                  type="button"
                  aria-label={`Delete ${supplier.name}`}
                  onClick={() => setDeletingSupplier(supplier)}
                  className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-brand"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        />
      )}

      {/* -------- item form -------- */}
      <SlideOver
        open={itemOpen}
        onClose={() => setItemOpen(false)}
        title={editingItemId ? "Edit item" : "Add item"}
        description="Parts, consumables and accessories held in stock."
        footer={
          <>
            <Button variant="ghost" onClick={() => setItemOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void saveItem()} disabled={saving}>
              {saving ? "Saving…" : editingItemId ? "Save changes" : "Add item"}
            </Button>
          </>
        }
      >
        <Section title="Item">
          <Field label="Name" className="sm:col-span-2">
            <TextInput
              value={itemForm.name}
              onChange={(event) => setItemForm((form) => ({ ...form, name: event.target.value }))}
            />
          </Field>
          <Field label="SKU" hint="Leave blank to auto-generate">
            <TextInput
              value={itemForm.sku}
              onChange={(event) => setItemForm((form) => ({ ...form, sku: event.target.value }))}
            />
          </Field>
          <Field label="Category">
            <TextInput
              value={itemForm.category}
              list="inventory-categories"
              onChange={(event) =>
                setItemForm((form) => ({ ...form, category: event.target.value }))
              }
            />
            <datalist id="inventory-categories">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </Field>
          <Field label="Unit" hint="piece, set, bottle…">
            <TextInput
              value={itemForm.unit}
              onChange={(event) => setItemForm((form) => ({ ...form, unit: event.target.value }))}
            />
          </Field>
          <Field label="Location">
            <TextInput
              value={itemForm.location}
              onChange={(event) =>
                setItemForm((form) => ({ ...form, location: event.target.value }))
              }
            />
          </Field>
          <Field label="Supplier">
            <SelectInput
              value={itemForm.supplierId}
              onChange={(event) =>
                setItemForm((form) => ({ ...form, supplierId: event.target.value }))
              }
            >
              <option value="">No supplier</option>
              {db.suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </SelectInput>
          </Field>
        </Section>

        <Section title="Stock & pricing">
          <Field label="Quantity">
            <TextInput
              type="number"
              min={0}
              value={itemForm.quantity}
              onChange={(event) =>
                setItemForm((form) => ({ ...form, quantity: event.target.value }))
              }
            />
          </Field>
          <Field label="Reorder level">
            <TextInput
              type="number"
              min={0}
              value={itemForm.reorderLevel}
              onChange={(event) =>
                setItemForm((form) => ({ ...form, reorderLevel: event.target.value }))
              }
            />
          </Field>
          <Field label="Unit cost (GHS)">
            <TextInput
              type="number"
              min={0}
              value={itemForm.unitCost}
              onChange={(event) =>
                setItemForm((form) => ({ ...form, unitCost: event.target.value }))
              }
            />
          </Field>
        </Section>
      </SlideOver>

      {/* -------- adjust stock / record movement -------- */}
      <SlideOver
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title="Record stock movement"
        description="Adjust the quantity and log why it changed."
        width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdjustOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void saveAdjustment()} disabled={saving}>
              {saving ? "Saving…" : "Save movement"}
            </Button>
          </>
        }
      >
        <Section title="Movement">
          <Field label="Item" className="sm:col-span-2">
            <SelectInput
              value={adjustForm.itemId}
              onChange={(event) =>
                setAdjustForm((form) => ({ ...form, itemId: event.target.value }))
              }
            >
              <option value="">Select item</option>
              {db.inventoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.quantity} {item.unit}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Kind">
            <SelectInput
              value={adjustForm.kind}
              onChange={(event) =>
                setAdjustForm((form) => ({ ...form, kind: event.target.value }))
              }
            >
              {MOVEMENT_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind === "in" ? "Stock in" : kind === "out" ? "Stock out" : "Set quantity"}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Quantity">
            <TextInput
              type="number"
              min={1}
              value={adjustForm.quantity}
              onChange={(event) =>
                setAdjustForm((form) => ({ ...form, quantity: event.target.value }))
              }
            />
          </Field>
          <Field label="Reason" className="sm:col-span-2">
            <TextInput
              value={adjustForm.reason}
              placeholder="e.g. Used on brake job"
              onChange={(event) =>
                setAdjustForm((form) => ({ ...form, reason: event.target.value }))
              }
            />
          </Field>
          <Field label="Work order" hint="Optional" className="sm:col-span-2">
            <SelectInput
              value={adjustForm.workOrderId}
              onChange={(event) =>
                setAdjustForm((form) => ({ ...form, workOrderId: event.target.value }))
              }
            >
              <option value="">No work order</option>
              {db.maintenanceOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.reference} · {vehicleName(order.vehicleId)}
                </option>
              ))}
            </SelectInput>
          </Field>
        </Section>
      </SlideOver>

      {/* -------- new purchase order -------- */}
      <SlideOver
        open={poOpen}
        onClose={() => setPoOpen(false)}
        title="New purchase order"
        description={`Draft ${nextPoNumber()} — add the items you want to order.`}
        width="lg"
        footer={
          <>
            <span className="mr-auto self-center text-sm text-muted">
              Total <span className="font-semibold text-ink">{formatGHS(poTotal)}</span>
            </span>
            <Button variant="ghost" onClick={() => setPoOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void savePo()} disabled={saving}>
              {saving ? "Saving…" : "Create purchase order"}
            </Button>
          </>
        }
      >
        <Section title="Order">
          <Field label="Supplier">
            <SelectInput
              value={poForm.supplierId}
              onChange={(event) => setPoForm((form) => ({ ...form, supplierId: event.target.value }))}
            >
              <option value="">Select supplier</option>
              {db.suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Ordered">
            <TextInput
              type="date"
              value={poForm.orderedAt}
              onChange={(event) => setPoForm((form) => ({ ...form, orderedAt: event.target.value }))}
            />
          </Field>
          <Field label="Expected">
            <TextInput
              type="date"
              value={poForm.expectedAt}
              onChange={(event) =>
                setPoForm((form) => ({ ...form, expectedAt: event.target.value }))
              }
            />
          </Field>
        </Section>

        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Line items</p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              setPoForm((form) => ({
                ...form,
                lines: [...form.lines, { itemId: "", name: "", quantity: "1", unitCost: "" }],
              }))
            }
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add line
          </Button>
        </div>

        {poForm.lines.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-xs text-muted">
            No lines yet. Add at least one item to order.
          </p>
        ) : (
          <div className="space-y-3">
            {poForm.lines.map((line, index) => {
              const lineTotal = (Number(line.quantity) || 0) * (Number(line.unitCost) || 0);
              return (
                <div
                  key={index}
                  className="grid grid-cols-1 items-end gap-3 rounded-xl border border-line p-3 sm:grid-cols-12"
                >
                  <Field label="Item" className="sm:col-span-4">
                    <SelectInput
                      value={line.itemId}
                      onChange={(event) => selectPoItem(index, event.target.value)}
                    >
                      <option value="">Select item</option>
                      {db.inventoryItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label="Qty" className="sm:col-span-2">
                    <TextInput
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(event) => updatePOLine(index, { quantity: event.target.value })}
                    />
                  </Field>
                  <Field label="Unit cost" className="sm:col-span-2">
                    <TextInput
                      type="number"
                      min={0}
                      value={line.unitCost}
                      onChange={(event) => updatePOLine(index, { unitCost: event.target.value })}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-medium text-ink">Line total</span>
                    <p className="py-2 text-sm font-medium text-ink">{formatGHS(lineTotal)}</p>
                  </div>
                  <div className="flex justify-end sm:col-span-2">
                    <button
                      type="button"
                      aria-label="Remove line"
                      onClick={() =>
                        setPoForm((form) => ({
                          ...form,
                          lines: form.lines.filter((_, i) => i !== index),
                        }))
                      }
                      className="rounded-lg border border-line p-2 text-muted transition-colors hover:text-brand"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SlideOver>

      {/* -------- purchase order detail -------- */}
      <SlideOver
        open={Boolean(detailPo)}
        onClose={() => setDetailPo(null)}
        title={detailPo ? `Purchase order ${detailPo.number}` : "Purchase order"}
        description={detailPo ? supplierName(detailPo.supplierId) : undefined}
        footer={
          detailPo ? (
            <>
              <Button variant="ghost" onClick={() => setDetailPo(null)}>
                Close
              </Button>
              {detailPo.status !== "received" && detailPo.status !== "cancelled" && (
                <Button
                  variant="dark"
                  onClick={() => void cancelPo(detailPo)}
                  disabled={saving}
                >
                  Cancel order
                </Button>
              )}
              {detailPo.status !== "received" && detailPo.status !== "cancelled" && (
                <Button
                  variant="primary"
                  onClick={() => void markReceived(detailPo)}
                  disabled={saving}
                >
                  {saving ? "Working…" : "Mark received"}
                </Button>
              )}
            </>
          ) : null
        }
      >
        {detailPo && (
          <>
            <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-[11px] text-muted">Status</p>
                <div className="mt-1">
                  <StatusPill status={detailPo.status} />
                </div>
              </div>
              <div>
                <p className="text-[11px] text-muted">Ordered</p>
                <p className="mt-1 text-sm text-ink">{formatDate(new Date(detailPo.orderedAt))}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted">Expected</p>
                <p className="mt-1 text-sm text-ink">{formatDate(new Date(detailPo.expectedAt))}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted">Total</p>
                <p className="mt-1 text-sm font-semibold text-ink">{formatGHS(detailPo.total)}</p>
              </div>
            </div>

            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
              Lines ({detailPo.lines.length})
            </p>
            <div className="overflow-hidden rounded-xl border border-line">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-mist">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Item
                    </th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Qty
                    </th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Unit cost
                    </th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Line total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {detailPo.lines.map((line, index) => (
                    <tr key={`${line.itemId}-${index}`}>
                      <td className="px-4 py-3 text-ink">{line.name}</td>
                      <td className="px-4 py-3 text-right text-ink">{line.quantity}</td>
                      <td className="px-4 py-3 text-right text-ink">{formatGHS(line.unitCost)}</td>
                      <td className="px-4 py-3 text-right font-medium text-ink">
                        {formatGHS(line.quantity * line.unitCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SlideOver>

      {/* -------- supplier form -------- */}
      <SlideOver
        open={supplierOpen}
        onClose={() => setSupplierOpen(false)}
        title={editingSupplierId ? "Edit supplier" : "Add supplier"}
        description="Who you buy parts, tyres, oils and consumables from."
        width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSupplierOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void saveSupplier()} disabled={saving}>
              {saving ? "Saving…" : editingSupplierId ? "Save changes" : "Add supplier"}
            </Button>
          </>
        }
      >
        <Section title="Supplier">
          <Field label="Name" className="sm:col-span-2">
            <TextInput
              value={supplierForm.name}
              onChange={(event) =>
                setSupplierForm((form) => ({ ...form, name: event.target.value }))
              }
            />
          </Field>
          <Field label="Contact person">
            <TextInput
              value={supplierForm.contact}
              onChange={(event) =>
                setSupplierForm((form) => ({ ...form, contact: event.target.value }))
              }
            />
          </Field>
          <Field label="Phone">
            <TextInput
              value={supplierForm.phone}
              onChange={(event) =>
                setSupplierForm((form) => ({ ...form, phone: event.target.value }))
              }
            />
          </Field>
          <Field label="Email">
            <TextInput
              type="email"
              value={supplierForm.email}
              onChange={(event) =>
                setSupplierForm((form) => ({ ...form, email: event.target.value }))
              }
            />
          </Field>
          <Field label="Category">
            <TextInput
              value={supplierForm.category}
              placeholder="Spare parts, Tyres, Oils…"
              onChange={(event) =>
                setSupplierForm((form) => ({ ...form, category: event.target.value }))
              }
            />
          </Field>
          <Field label="Lead time (days)">
            <TextInput
              type="number"
              min={0}
              value={supplierForm.leadTimeDays}
              onChange={(event) =>
                setSupplierForm((form) => ({ ...form, leadTimeDays: event.target.value }))
              }
            />
          </Field>
        </Section>
      </SlideOver>

      <ConfirmDialog
        open={Boolean(deletingItem)}
        title="Delete item"
        description={`This permanently removes ${deletingItem?.name ?? "this item"} from inventory.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deletingItem) void deleteItem(deletingItem);
        }}
        onClose={() => setDeletingItem(null)}
      />
      <ConfirmDialog
        open={Boolean(deletingPo)}
        title="Delete purchase order"
        description={`This permanently removes ${deletingPo?.number ?? "this purchase order"}.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deletingPo) void deletePo(deletingPo);
        }}
        onClose={() => setDeletingPo(null)}
      />
      <ConfirmDialog
        open={Boolean(deletingSupplier)}
        title="Delete supplier"
        description={`This permanently removes ${deletingSupplier?.name ?? "this supplier"}.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deletingSupplier) void deleteSupplier(deletingSupplier);
        }}
        onClose={() => setDeletingSupplier(null)}
      />
    </>
  );
}
