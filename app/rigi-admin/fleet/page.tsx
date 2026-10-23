"use client";

// Fleet operations: the vehicle register, check-out/check-in inspections,
// driver roster and vehicle documents. Everything is backed by the in-browser
// mock store so writes persist to localStorage and re-render subscribers.

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Car,
  CheckCircle2,
  Gauge,
  Pencil,
  Plus,
  RotateCw,
  Trash2,
  Wrench,
} from "lucide-react";
import {
  Checkbox,
  ConfirmDialog,
  DataTable,
  Field,
  FilterSelect,
  KpiCard,
  PageHeader,
  ProgressBar,
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
  nextId,
  updateRow,
  useDb,
  withLatency,
} from "@/lib/mock/store";
import type { Driver, Inspection, Vehicle, VehicleDocument } from "@/lib/mock/types";
import { formatDate, formatGHS } from "@/lib/utils";

const VEHICLE_STATUSES = [
  "available",
  "rented",
  "reserved",
  "in_maintenance",
  "out_of_service",
] as const;
const VEHICLE_CATEGORIES = ["economy", "sedan", "suv", "luxury", "van"] as const;
const DOC_TYPES = ["Insurance", "Registration", "Roadworthy", "Inspection", "Other"] as const;
const INSPECTION_KINDS = ["check_out", "check_in"] as const;
const DEFAULT_CHECKLIST = [
  "Tyres",
  "Brakes",
  "Lights",
  "Windscreen",
  "Mirrors",
  "Spare wheel",
  "Jack & tools",
  "Fuel cap",
  "Interior clean",
];

const EXPIRY_WINDOW_DAYS = 30;

/* --------------------------------------------------------------- helpers */

function num(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function daysUntil(value: string): number {
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) return Number.POSITIVE_INFINITY;
  return Math.ceil((parsed - Date.now()) / 86_400_000);
}

function expiringSoon(value: string): boolean {
  const days = daysUntil(value);
  return days <= EXPIRY_WINDOW_DAYS;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

interface VehicleForm {
  name: string;
  brand: string;
  year: string;
  category: string;
  plate: string;
  vin: string;
  colour: string;
  seats: string;
  transmission: string;
  fuel: string;
  odometerKm: string;
  status: string;
  pricePerDay: string;
  deposit: string;
  location: string;
  minAge: string;
  insuranceExpiry: string;
  registrationExpiry: string;
  roadworthyExpiry: string;
  nextServiceKm: string;
  nextServiceDate: string;
  utilisation: string;
}

function toVehicleForm(vehicle: Vehicle): VehicleForm {
  return {
    name: vehicle.name,
    brand: vehicle.brand,
    year: String(vehicle.year),
    category: vehicle.category,
    plate: vehicle.plate,
    vin: vehicle.vin,
    colour: vehicle.colour,
    seats: String(vehicle.seats),
    transmission: vehicle.transmission,
    fuel: vehicle.fuel,
    odometerKm: String(vehicle.odometerKm),
    status: vehicle.status,
    pricePerDay: String(vehicle.pricePerDay),
    deposit: String(vehicle.deposit),
    location: vehicle.location,
    minAge: String(vehicle.minAge),
    insuranceExpiry: vehicle.insuranceExpiry,
    registrationExpiry: vehicle.registrationExpiry,
    roadworthyExpiry: vehicle.roadworthyExpiry,
    nextServiceKm: String(vehicle.nextServiceKm),
    nextServiceDate: vehicle.nextServiceDate,
    utilisation: String(vehicle.utilisation),
  };
}

function emptyVehicleForm(): VehicleForm {
  const inAYear = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);
  return {
    name: "",
    brand: "",
    year: String(new Date().getFullYear()),
    category: "sedan",
    plate: "",
    vin: "",
    colour: "",
    seats: "5",
    transmission: "Automatic",
    fuel: "Petrol",
    odometerKm: "0",
    status: "available",
    pricePerDay: "0",
    deposit: "0",
    location: "Accra Airport (KIA)",
    minAge: "21",
    insuranceExpiry: inAYear,
    registrationExpiry: inAYear,
    roadworthyExpiry: inAYear,
    nextServiceKm: "0",
    nextServiceDate: inAYear,
    utilisation: "0",
  };
}

interface InspectionForm {
  bookingId: string;
  vehicleId: string;
  kind: string;
  odometerKm: string;
  fuelLevel: string;
  damage: string;
}

function emptyInspectionForm(): InspectionForm {
  return {
    bookingId: "",
    vehicleId: "",
    kind: "check_out",
    odometerKm: "",
    fuelLevel: "100",
    damage: "",
  };
}

interface DriverForm {
  name: string;
  phone: string;
  licenceNumber: string;
  licenceExpiry: string;
  assignedVehicleId: string;
  available: boolean;
  rating: string;
  trips: string;
}

function toDriverForm(driver: Driver): DriverForm {
  return {
    name: driver.name,
    phone: driver.phone,
    licenceNumber: driver.licenceNumber,
    licenceExpiry: driver.licenceExpiry,
    assignedVehicleId: driver.assignedVehicleId ?? "",
    available: driver.available,
    rating: String(driver.rating),
    trips: String(driver.trips),
  };
}

function emptyDriverForm(): DriverForm {
  return {
    name: "",
    phone: "",
    licenceNumber: "",
    licenceExpiry: new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10),
    assignedVehicleId: "",
    available: true,
    rating: "5",
    trips: "0",
  };
}

interface DocumentForm {
  vehicleId: string;
  type: string;
  reference: string;
  expiresAt: string;
  fileId: string;
}

function emptyDocumentForm(): DocumentForm {
  return {
    vehicleId: "",
    type: "Insurance",
    reference: "",
    expiresAt: new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10),
    fileId: "",
  };
}

type DeleteTarget = {
  collection: "drivers" | "vehicleDocuments";
  id: string;
  label: string;
};

/* ----------------------------------------------------------------- page */

export default function AdminFleetPage() {
  const db = useDb();
  const { toast } = useToast();
  const session = useOptionalAdminSession();
  const actorName = session?.session.name ?? "Fleet";
  const actorId = session?.session.userId;
  const canDelete = session ? hasCapability(session.role, "delete_records") : false;

  const [tab, setTab] = useState("vehicles");

  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [vehicleEditingId, setVehicleEditingId] = useState<string | null>(null);
  const [vehicleForm, setVehicleForm] = useState<VehicleForm>(emptyVehicleForm);
  const [savingVehicle, setSavingVehicle] = useState(false);

  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [inspectionForm, setInspectionForm] = useState<InspectionForm>(emptyInspectionForm);
  const [inspectionChecklist, setInspectionChecklist] = useState<{ label: string; ok: boolean }[]>(
    DEFAULT_CHECKLIST.map((label) => ({ label, ok: true }))
  );
  const [savingInspection, setSavingInspection] = useState(false);
  const [viewInspectionId, setViewInspectionId] = useState<string | null>(null);

  const [driverOpen, setDriverOpen] = useState(false);
  const [driverEditingId, setDriverEditingId] = useState<string | null>(null);
  const [driverForm, setDriverForm] = useState<DriverForm>(emptyDriverForm);
  const [savingDriver, setSavingDriver] = useState(false);

  const [documentOpen, setDocumentOpen] = useState(false);
  const [documentForm, setDocumentForm] = useState<DocumentForm>(emptyDocumentForm);
  const [savingDocument, setSavingDocument] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<DeleteTarget | null>(null);

  /* -------------------------------------------------- deep link (?vehicle) */

  const handledVehicleRef = useRef(false);
  useEffect(() => {
    if (handledVehicleRef.current || typeof window === "undefined") return;
    handledVehicleRef.current = true;
    const id = new URLSearchParams(window.location.search).get("vehicle");
    if (!id) return;
    const vehicle = db.vehicles.find((item) => item.id === id);
    if (!vehicle) return;
    // Deferred so the external query-param read never triggers a cascading render.
    queueMicrotask(() => {
      setTab("vehicles");
      setVehicleEditingId(vehicle.id);
      setVehicleForm(toVehicleForm(vehicle));
      setVehicleOpen(true);
    });
  }, [db]);

  /* ------------------------------------------------------------ lookups */

  const bookingReference = (id: string) =>
    db.bookings.find((booking) => booking.id === id)?.reference ?? "—";
  const vehicleName = (id: string) =>
    db.vehicles.find((vehicle) => vehicle.id === id)?.name ?? "—";

  const uniqueSlug = (name: string) => {
    const base = slugify(name) || "vehicle";
    const existing = new Set(db.vehicles.map((vehicle) => vehicle.slug));
    let candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    let suffix = 1;
    while (existing.has(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  };

  /* -------------------------------------------------------------- state */

  const availableCount = db.vehicles.filter((vehicle) => vehicle.status === "available").length;
  const maintenanceCount = db.vehicles.filter(
    (vehicle) => vehicle.status === "in_maintenance"
  ).length;
  const averageUtilisation = db.vehicles.length
    ? Math.round(
        db.vehicles.reduce((sum, vehicle) => sum + vehicle.utilisation, 0) / db.vehicles.length
      )
    : 0;

  const tabs: TabDef[] = [
    { id: "vehicles", label: "Vehicles" },
    { id: "inspections", label: "Inspections" },
    { id: "drivers", label: "Drivers" },
    { id: "documents", label: "Documents" },
  ];

  const vehicleRows = db.vehicles.filter(
    (vehicle) =>
      (statusFilter === "all" || vehicle.status === statusFilter) &&
      (categoryFilter === "all" || vehicle.category === categoryFilter)
  );

  const viewInspection = db.inspections.find((item) => item.id === viewInspectionId);
  const selectedBooking = db.bookings.find(
    (booking) => booking.id === inspectionForm.bookingId
  );

  /* ------------------------------------------------------ vehicle actions */

  function openCreateVehicle() {
    setVehicleEditingId(null);
    setVehicleForm(emptyVehicleForm());
    setVehicleOpen(true);
  }

  function openEditVehicle(vehicle: Vehicle) {
    setVehicleEditingId(vehicle.id);
    setVehicleForm(toVehicleForm(vehicle));
    setVehicleOpen(true);
  }

  async function saveVehicle() {
    if (!vehicleForm.name.trim() || !vehicleForm.brand.trim()) {
      toast({
        title: "Missing details",
        description: "Name and brand are required.",
        variant: "error",
      });
      return;
    }
    setSavingVehicle(true);
    await withLatency(null, 500);

    const payload = {
      name: vehicleForm.name.trim(),
      brand: vehicleForm.brand.trim(),
      year: num(vehicleForm.year, new Date().getFullYear()),
      category: vehicleForm.category as Vehicle["category"],
      plate: vehicleForm.plate.trim(),
      vin: vehicleForm.vin.trim(),
      colour: vehicleForm.colour.trim(),
      seats: num(vehicleForm.seats, 5),
      transmission: vehicleForm.transmission.trim() || "Automatic",
      fuel: vehicleForm.fuel.trim() || "Petrol",
      odometerKm: num(vehicleForm.odometerKm, 0),
      status: vehicleForm.status as Vehicle["status"],
      pricePerDay: num(vehicleForm.pricePerDay, 0),
      deposit: num(vehicleForm.deposit, 0),
      location: vehicleForm.location.trim() || "Accra Airport (KIA)",
      minAge: num(vehicleForm.minAge, 21),
      insuranceExpiry: vehicleForm.insuranceExpiry,
      registrationExpiry: vehicleForm.registrationExpiry,
      roadworthyExpiry: vehicleForm.roadworthyExpiry,
      nextServiceKm: num(vehicleForm.nextServiceKm, 0),
      nextServiceDate: vehicleForm.nextServiceDate,
      utilisation: clamp(num(vehicleForm.utilisation, 0), 0, 100),
    };

    if (vehicleEditingId) {
      updateRow("vehicles", vehicleEditingId, payload);
      logAudit({
        actorName,
        actorId,
        action: "updated",
        entity: "Vehicle",
        entityId: vehicleEditingId,
        detail: `Updated ${payload.name}`,
      });
      toast({ title: "Vehicle updated", description: payload.name, variant: "success" });
    } else {
      const row = insertRow("vehicles", { slug: uniqueSlug(payload.name), ...payload });
      logAudit({
        actorName,
        actorId,
        action: "created",
        entity: "Vehicle",
        entityId: row.id,
        detail: `Added ${row.name}`,
      });
      toast({ title: "Vehicle added", description: row.name, variant: "success" });
    }

    setSavingVehicle(false);
    setVehicleOpen(false);
    setVehicleEditingId(null);
    setVehicleForm(emptyVehicleForm());
  }

  async function cycleStatus(vehicle: Vehicle) {
    const index = VEHICLE_STATUSES.indexOf(vehicle.status);
    const next = VEHICLE_STATUSES[(index + 1) % VEHICLE_STATUSES.length];
    await withLatency(null, 300);
    updateRow("vehicles", vehicle.id, { status: next });
    logAudit({
      actorName,
      actorId,
      action: "updated",
      entity: "Vehicle",
      entityId: vehicle.id,
      detail: `Status ${vehicle.status} → ${next}`,
    });
    toast({ title: "Status updated", description: `${vehicle.name} → ${next}`, variant: "success" });
  }

  /* -------------------------------------------------- inspection actions */

  function openInspection() {
    setInspectionForm(emptyInspectionForm());
    setInspectionChecklist(DEFAULT_CHECKLIST.map((label) => ({ label, ok: true })));
    setInspectionOpen(true);
  }

  function selectInspectionBooking(bookingId: string) {
    const booking = db.bookings.find((item) => item.id === bookingId);
    setInspectionForm((prev) => ({
      ...prev,
      bookingId,
      vehicleId: booking ? booking.vehicleId : prev.vehicleId,
    }));
  }

  function toggleChecklist(index: number) {
    setInspectionChecklist((prev) =>
      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ok: !item.ok } : item))
    );
  }

  async function saveInspection() {
    if (!inspectionForm.vehicleId) {
      toast({
        title: "Missing details",
        description: "Choose a vehicle for this inspection.",
        variant: "error",
      });
      return;
    }
    if (!inspectionForm.bookingId) {
      toast({
        title: "Missing details",
        description: "Choose the booking this inspection belongs to.",
        variant: "error",
      });
      return;
    }
    setSavingInspection(true);
    await withLatency(null, 500);
    const row = insertRow("inspections", {
      bookingId: inspectionForm.bookingId,
      vehicleId: inspectionForm.vehicleId,
      kind: inspectionForm.kind as Inspection["kind"],
      odometerKm: num(inspectionForm.odometerKm, 0),
      fuelLevel: clamp(num(inspectionForm.fuelLevel, 0), 0, 100),
      damage: inspectionForm.damage.trim(),
      checklist: inspectionChecklist,
      by: actorName,
    });
    logAudit({
      actorName,
      actorId,
      action: "created",
      entity: "Inspection",
      entityId: row.id,
      detail: `${row.kind} inspection for ${vehicleName(row.vehicleId)}`,
    });
    toast({ title: "Inspection recorded", variant: "success" });
    setSavingInspection(false);
    setInspectionOpen(false);
  }

  /* ------------------------------------------------------ driver actions */

  function openCreateDriver() {
    setDriverEditingId(null);
    setDriverForm(emptyDriverForm());
    setDriverOpen(true);
  }

  function openEditDriver(driver: Driver) {
    setDriverEditingId(driver.id);
    setDriverForm(toDriverForm(driver));
    setDriverOpen(true);
  }

  async function saveDriver() {
    if (!driverForm.name.trim()) {
      toast({ title: "Missing details", description: "A name is required.", variant: "error" });
      return;
    }
    setSavingDriver(true);
    await withLatency(null, 450);
    const payload = {
      name: driverForm.name.trim(),
      phone: driverForm.phone.trim(),
      licenceNumber: driverForm.licenceNumber.trim(),
      licenceExpiry: driverForm.licenceExpiry,
      assignedVehicleId: driverForm.assignedVehicleId || null,
      available: driverForm.available,
      rating: clamp(num(driverForm.rating, 5), 0, 5),
      trips: num(driverForm.trips, 0),
    };
    if (driverEditingId) {
      updateRow("drivers", driverEditingId, payload);
      logAudit({
        actorName,
        actorId,
        action: "updated",
        entity: "Driver",
        entityId: driverEditingId,
        detail: `Updated ${payload.name}`,
      });
      toast({ title: "Driver updated", description: payload.name, variant: "success" });
    } else {
      const row = insertRow("drivers", payload);
      logAudit({
        actorName,
        actorId,
        action: "created",
        entity: "Driver",
        entityId: row.id,
        detail: `Added ${row.name}`,
      });
      toast({ title: "Driver added", description: row.name, variant: "success" });
    }
    setSavingDriver(false);
    setDriverOpen(false);
    setDriverEditingId(null);
    setDriverForm(emptyDriverForm());
  }

  /* ---------------------------------------------------- document actions */

  function openCreateDocument() {
    setDocumentForm({ ...emptyDocumentForm(), fileId: nextId("file") });
    setDocumentOpen(true);
  }

  async function saveDocument() {
    if (!documentForm.vehicleId || !documentForm.reference.trim()) {
      toast({
        title: "Missing details",
        description: "A vehicle and reference are required.",
        variant: "error",
      });
      return;
    }
    setSavingDocument(true);
    await withLatency(null, 450);
    const row = insertRow("vehicleDocuments", {
      vehicleId: documentForm.vehicleId,
      type: documentForm.type as VehicleDocument["type"],
      reference: documentForm.reference.trim(),
      expiresAt: documentForm.expiresAt,
      fileId: documentForm.fileId.trim() || nextId("file"),
    });
    logAudit({
      actorName,
      actorId,
      action: "created",
      entity: "Vehicle document",
      entityId: row.id,
      detail: `Added ${row.type} document for ${vehicleName(row.vehicleId)}`,
    });
    toast({ title: "Document added", variant: "success" });
    setSavingDocument(false);
    setDocumentOpen(false);
    setDocumentForm(emptyDocumentForm());
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { collection, id, label } = pendingDelete;
    await withLatency(null, 350);
    deleteRow(collection, id);
    logAudit({ actorName, actorId, action: "deleted", entity: label });
    toast({ title: "Deleted", description: label, variant: "success" });
  }

  /* ------------------------------------------------------------ columns */

  const vehicleColumns: Column<Vehicle>[] = [
    {
      key: "name",
      header: "Vehicle",
      render: (vehicle) => {
        const warning =
          expiringSoon(vehicle.insuranceExpiry) ||
          expiringSoon(vehicle.registrationExpiry) ||
          expiringSoon(vehicle.roadworthyExpiry);
        return (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-ink">{vehicle.name}</span>
              {warning && (
                <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  <AlertTriangle className="h-3 w-3" />
                  Expiring
                </span>
              )}
            </div>
            <span className="text-[11px] text-muted">
              {vehicle.brand} · {vehicle.year}
            </span>
          </div>
        );
      },
      value: (vehicle) => vehicle.name,
    },
    { key: "plate", header: "Plate", hideBelow: "sm" },
    {
      key: "category",
      header: "Category",
      render: (vehicle) => <span className="capitalize">{vehicle.category}</span>,
      value: (vehicle) => vehicle.category,
      hideBelow: "md",
    },
    {
      key: "status",
      header: "Status",
      render: (vehicle) => <StatusPill status={vehicle.status} />,
      value: (vehicle) => vehicle.status,
    },
    {
      key: "odometerKm",
      header: "Odometer",
      align: "right",
      render: (vehicle) => `${vehicle.odometerKm.toLocaleString()} km`,
      value: (vehicle) => vehicle.odometerKm,
      hideBelow: "md",
    },
    {
      key: "pricePerDay",
      header: "Price/day",
      align: "right",
      render: (vehicle) => formatGHS(vehicle.pricePerDay),
      value: (vehicle) => vehicle.pricePerDay,
    },
    { key: "location", header: "Location", hideBelow: "lg" },
    {
      key: "utilisation",
      header: "Utilisation",
      render: (vehicle) => (
        <div className="w-28">
          <ProgressBar value={vehicle.utilisation} label="Used" />
        </div>
      ),
      value: (vehicle) => vehicle.utilisation,
      hideBelow: "lg",
    },
  ];

  const inspectionColumns: Column<Inspection>[] = [
    {
      key: "bookingId",
      header: "Booking",
      render: (inspection) => bookingReference(inspection.bookingId),
      value: (inspection) => bookingReference(inspection.bookingId),
    },
    {
      key: "vehicleId",
      header: "Vehicle",
      render: (inspection) => vehicleName(inspection.vehicleId),
      value: (inspection) => vehicleName(inspection.vehicleId),
    },
    {
      key: "kind",
      header: "Kind",
      render: (inspection) => <StatusPill status={inspection.kind} />,
      value: (inspection) => inspection.kind,
    },
    {
      key: "odometerKm",
      header: "Odometer",
      align: "right",
      render: (inspection) => `${inspection.odometerKm.toLocaleString()} km`,
      value: (inspection) => inspection.odometerKm,
      hideBelow: "md",
    },
    {
      key: "fuelLevel",
      header: "Fuel %",
      align: "right",
      render: (inspection) => `${inspection.fuelLevel}%`,
      value: (inspection) => inspection.fuelLevel,
    },
    {
      key: "damage",
      header: "Damage",
      render: (inspection) => (
        <span className="block max-w-[200px] truncate text-muted">
          {inspection.damage || "None recorded"}
        </span>
      ),
      value: (inspection) => inspection.damage,
      hideBelow: "lg",
    },
    { key: "by", header: "By", hideBelow: "md" },
    {
      key: "createdAt",
      header: "Date",
      render: (inspection) => formatDate(new Date(inspection.createdAt)),
      value: (inspection) => inspection.createdAt,
      hideBelow: "lg",
    },
  ];

  const driverColumns: Column<Driver>[] = [
    { key: "name", header: "Name", value: (driver) => driver.name },
    { key: "phone", header: "Phone", hideBelow: "md" },
    { key: "licenceNumber", header: "Licence", hideBelow: "lg" },
    {
      key: "licenceExpiry",
      header: "Expiry",
      render: (driver) => {
        const expired = daysUntil(driver.licenceExpiry) < 0;
        return (
          <span className={expired ? "font-medium text-brand" : undefined}>
            {formatDate(new Date(driver.licenceExpiry))}
          </span>
        );
      },
      value: (driver) => driver.licenceExpiry,
      hideBelow: "md",
    },
    {
      key: "assignedVehicleId",
      header: "Assigned vehicle",
      render: (driver) => (driver.assignedVehicleId ? vehicleName(driver.assignedVehicleId) : "—"),
      value: (driver) =>
        driver.assignedVehicleId ? vehicleName(driver.assignedVehicleId) : "—",
      hideBelow: "lg",
    },
    {
      key: "available",
      header: "Availability",
      render: (driver) => (
        <StatusPill status={driver.available ? "available" : "unavailable"} />
      ),
      value: (driver) => (driver.available ? "available" : "unavailable"),
    },
    {
      key: "rating",
      header: "Rating",
      align: "right",
      render: (driver) => `${driver.rating.toFixed(1)} ★`,
      value: (driver) => driver.rating,
    },
    { key: "trips", header: "Trips", align: "right", value: (driver) => driver.trips },
  ];

  const documentColumns: Column<VehicleDocument>[] = [
    {
      key: "vehicleId",
      header: "Vehicle",
      render: (document) => vehicleName(document.vehicleId),
      value: (document) => vehicleName(document.vehicleId),
    },
    {
      key: "type",
      header: "Type",
      render: (document) => <StatusPill status={document.type} />,
      value: (document) => document.type,
    },
    { key: "reference", header: "Reference" },
    {
      key: "expiresAt",
      header: "Expires",
      render: (document) => {
        const soon = expiringSoon(document.expiresAt);
        return (
          <span className="inline-flex items-center gap-2">
            <span className={soon ? "font-medium text-brand" : undefined}>
              {formatDate(new Date(document.expiresAt))}
            </span>
            {soon && (
              <span className="whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                Expiring soon
              </span>
            )}
          </span>
        );
      },
      value: (document) => document.expiresAt,
    },
    { key: "fileId", header: "File", hideBelow: "md" },
  ];

  let headerAction: React.ReactNode;
  if (tab === "vehicles") {
    headerAction = (
      <Button className="gap-1.5" onClick={openCreateVehicle}>
        <Plus className="h-3.5 w-3.5" />
        Add vehicle
      </Button>
    );
  } else if (tab === "inspections") {
    headerAction = (
      <Button className="gap-1.5" onClick={openInspection}>
        <Plus className="h-3.5 w-3.5" />
        New inspection
      </Button>
    );
  } else if (tab === "drivers") {
    headerAction = (
      <Button className="gap-1.5" onClick={openCreateDriver}>
        <Plus className="h-3.5 w-3.5" />
        Add driver
      </Button>
    );
  } else if (tab === "documents") {
    headerAction = (
      <Button className="gap-1.5" onClick={openCreateDocument}>
        <Plus className="h-3.5 w-3.5" />
        Add document
      </Button>
    );
  }

  return (
    <>
      <PageHeader
        title="Fleet"
        description="Vehicles, inspections, drivers and compliance documents."
        actions={headerAction}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Total vehicles" value={String(db.vehicles.length)} icon={Car} />
        <KpiCard
          label="Available"
          value={String(availableCount)}
          sub="Ready to rent"
          icon={CheckCircle2}
          tone="positive"
        />
        <KpiCard
          label="In maintenance"
          value={String(maintenanceCount)}
          sub="Off the road"
          icon={Wrench}
          tone={maintenanceCount ? "warning" : "neutral"}
        />
        <KpiCard
          label="Average utilisation"
          value={`${averageUtilisation}%`}
          sub="Across the fleet"
          icon={Gauge}
        />
      </div>

      <div className="mt-6">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      {tab === "vehicles" && (
        <DataTable<Vehicle>
          columns={vehicleColumns}
          rows={vehicleRows}
          searchFields={(vehicle) =>
            `${vehicle.name} ${vehicle.plate} ${vehicle.vin} ${vehicle.brand}`
          }
          searchPlaceholder="Search vehicles…"
          exportFilename="fleet-vehicles.csv"
          onRowClick={openEditVehicle}
          emptyTitle="No vehicles"
          emptyDescription="Add a vehicle to start building the fleet."
          emptyAction={
            <Button className="gap-1.5" onClick={openCreateVehicle}>
              <Plus className="h-3.5 w-3.5" />
              Add vehicle
            </Button>
          }
          filters={
            <>
              <FilterSelect
                label="Status"
                value={statusFilter}
                options={["all", ...VEHICLE_STATUSES]}
                onChange={setStatusFilter}
              />
              <FilterSelect
                label="Category"
                value={categoryFilter}
                options={["all", ...VEHICLE_CATEGORIES]}
                onChange={setCategoryFilter}
              />
            </>
          }
          rowActions={(vehicle) => (
            <>
              <button
                type="button"
                aria-label={`Edit ${vehicle.name}`}
                onClick={() => openEditVehicle(vehicle)}
                className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Cycle status for ${vehicle.name}`}
                onClick={() => cycleStatus(vehicle)}
                className="ml-1 rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        />
      )}

      {tab === "inspections" && (
        <DataTable<Inspection>
          columns={inspectionColumns}
          rows={db.inspections}
          searchFields={(inspection) =>
            `${bookingReference(inspection.bookingId)} ${vehicleName(inspection.vehicleId)} ${inspection.by}`
          }
          searchPlaceholder="Search inspections…"
          exportFilename="fleet-inspections.csv"
          onRowClick={(inspection) => setViewInspectionId(inspection.id)}
          emptyTitle="No inspections"
          emptyDescription="Record a check-out or check-in to get started."
          emptyAction={
            <Button className="gap-1.5" onClick={openInspection}>
              <Plus className="h-3.5 w-3.5" />
              New inspection
            </Button>
          }
        />
      )}

      {tab === "drivers" && (
        <DataTable<Driver>
          columns={driverColumns}
          rows={db.drivers}
          searchFields={(driver) => `${driver.name} ${driver.phone} ${driver.licenceNumber}`}
          searchPlaceholder="Search drivers…"
          exportFilename="fleet-drivers.csv"
          emptyTitle="No drivers"
          emptyDescription="Add a driver to assign vehicles."
          emptyAction={
            <Button className="gap-1.5" onClick={openCreateDriver}>
              <Plus className="h-3.5 w-3.5" />
              Add driver
            </Button>
          }
          rowActions={(driver) => (
            <>
              <button
                type="button"
                aria-label={`Edit ${driver.name}`}
                onClick={() => openEditDriver(driver)}
                className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {canDelete && (
                <button
                  type="button"
                  aria-label={`Delete ${driver.name}`}
                  onClick={() =>
                    setPendingDelete({
                      collection: "drivers",
                      id: driver.id,
                      label: `driver ${driver.name}`,
                    })
                  }
                  className="ml-1 rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-brand"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}
        />
      )}

      {tab === "documents" && (
        <DataTable<VehicleDocument>
          columns={documentColumns}
          rows={db.vehicleDocuments}
          searchFields={(document) =>
            `${vehicleName(document.vehicleId)} ${document.reference} ${document.type}`
          }
          searchPlaceholder="Search documents…"
          exportFilename="fleet-documents.csv"
          emptyTitle="No documents"
          emptyDescription="Track insurance, registration and roadworthy papers here."
          emptyAction={
            <Button className="gap-1.5" onClick={openCreateDocument}>
              <Plus className="h-3.5 w-3.5" />
              Add document
            </Button>
          }
          rowActions={(document) =>
            canDelete ? (
              <button
                type="button"
                aria-label={`Delete ${document.type} document`}
                onClick={() =>
                  setPendingDelete({
                    collection: "vehicleDocuments",
                    id: document.id,
                    label: `${document.type} document ${document.reference}`,
                  })
                }
                className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-brand"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null
          }
        />
      )}

      {/* ------------------------------------------------ vehicle editor */}
      <SlideOver
        open={vehicleOpen}
        onClose={() => setVehicleOpen(false)}
        title={vehicleEditingId ? "Edit vehicle" : "Add vehicle"}
        description="Specs, pricing and compliance dates."
        width="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setVehicleOpen(false)}>
              Cancel
            </Button>
            <Button className="gap-1.5" onClick={saveVehicle} disabled={savingVehicle}>
              {savingVehicle ? "Saving…" : vehicleEditingId ? "Save changes" : "Add vehicle"}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <Section title="Identity">
            <Field label="Name">
              <TextInput
                value={vehicleForm.name}
                onChange={(event) =>
                  setVehicleForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </Field>
            <Field label="Brand">
              <TextInput
                value={vehicleForm.brand}
                onChange={(event) =>
                  setVehicleForm((prev) => ({ ...prev, brand: event.target.value }))
                }
              />
            </Field>
            <Field label="Year">
              <TextInput
                type="number"
                value={vehicleForm.year}
                onChange={(event) =>
                  setVehicleForm((prev) => ({ ...prev, year: event.target.value }))
                }
              />
            </Field>
            <Field label="Category">
              <SelectInput
                value={vehicleForm.category}
                onChange={(event) =>
                  setVehicleForm((prev) => ({ ...prev, category: event.target.value }))
                }
              >
                {VEHICLE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Plate">
              <TextInput
                value={vehicleForm.plate}
                onChange={(event) =>
                  setVehicleForm((prev) => ({ ...prev, plate: event.target.value }))
                }
              />
            </Field>
            <Field label="VIN">
              <TextInput
                value={vehicleForm.vin}
                onChange={(event) =>
                  setVehicleForm((prev) => ({ ...prev, vin: event.target.value }))
                }
              />
            </Field>
            <Field label="Colour">
              <TextInput
                value={vehicleForm.colour}
                onChange={(event) =>
                  setVehicleForm((prev) => ({ ...prev, colour: event.target.value }))
                }
              />
            </Field>
            <Field label="Seats">
              <TextInput
                type="number"
                value={vehicleForm.seats}
                onChange={(event) =>
                  setVehicleForm((prev) => ({ ...prev, seats: event.target.value }))
                }
              />
            </Field>
          </Section>

          <Section title="Mechanics & status">
            <Field label="Transmission">
              <TextInput
                value={vehicleForm.transmission}
                onChange={(event) =>
                  setVehicleForm((prev) => ({ ...prev, transmission: event.target.value }))
                }
              />
            </Field>
            <Field label="Fuel">
              <TextInput
                value={vehicleForm.fuel}
                onChange={(event) =>
                  setVehicleForm((prev) => ({ ...prev, fuel: event.target.value }))
                }
              />
            </Field>
            <Field label="Odometer (km)">
              <TextInput
                type="number"
                value={vehicleForm.odometerKm}
                onChange={(event) =>
                  setVehicleForm((prev) => ({ ...prev, odometerKm: event.target.value }))
                }
              />
            </Field>
            <Field label="Status">
              <SelectInput
                value={vehicleForm.status}
                onChange={(event) =>
                  setVehicleForm((prev) => ({ ...prev, status: event.target.value }))
                }
              >
                {VEHICLE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Utilisation (%)">
              <TextInput
                type="number"
                value={vehicleForm.utilisation}
                onChange={(event) =>
                  setVehicleForm((prev) => ({ ...prev, utilisation: event.target.value }))
                }
              />
            </Field>
            <Field label="Minimum age">
              <TextInput
                type="number"
                value={vehicleForm.minAge}
                onChange={(event) =>
                  setVehicleForm((prev) => ({ ...prev, minAge: event.target.value }))
                }
              />
            </Field>
          </Section>

          <Section title="Pricing & location">
            <Field label="Price per day (GHS)">
              <TextInput
                type="number"
                value={vehicleForm.pricePerDay}
                onChange={(event) =>
                  setVehicleForm((prev) => ({ ...prev, pricePerDay: event.target.value }))
                }
              />
            </Field>
            <Field label="Deposit (GHS)">
              <TextInput
                type="number"
                value={vehicleForm.deposit}
                onChange={(event) =>
                  setVehicleForm((prev) => ({ ...prev, deposit: event.target.value }))
                }
              />
            </Field>
            <Field label="Location" className="sm:col-span-2">
              <TextInput
                value={vehicleForm.location}
                onChange={(event) =>
                  setVehicleForm((prev) => ({ ...prev, location: event.target.value }))
                }
              />
            </Field>
          </Section>

          <Section title="Compliance & servicing">
            <Field label="Insurance expiry">
              <TextInput
                type="date"
                value={vehicleForm.insuranceExpiry}
                onChange={(event) =>
                  setVehicleForm((prev) => ({ ...prev, insuranceExpiry: event.target.value }))
                }
              />
            </Field>
            <Field label="Registration expiry">
              <TextInput
                type="date"
                value={vehicleForm.registrationExpiry}
                onChange={(event) =>
                  setVehicleForm((prev) => ({ ...prev, registrationExpiry: event.target.value }))
                }
              />
            </Field>
            <Field label="Roadworthy expiry">
              <TextInput
                type="date"
                value={vehicleForm.roadworthyExpiry}
                onChange={(event) =>
                  setVehicleForm((prev) => ({ ...prev, roadworthyExpiry: event.target.value }))
                }
              />
            </Field>
            <Field label="Next service (km)">
              <TextInput
                type="number"
                value={vehicleForm.nextServiceKm}
                onChange={(event) =>
                  setVehicleForm((prev) => ({ ...prev, nextServiceKm: event.target.value }))
                }
              />
            </Field>
            <Field label="Next service date">
              <TextInput
                type="date"
                value={vehicleForm.nextServiceDate}
                onChange={(event) =>
                  setVehicleForm((prev) => ({ ...prev, nextServiceDate: event.target.value }))
                }
              />
            </Field>
          </Section>
        </div>
      </SlideOver>

      {/* ---------------------------------------------- inspection create */}
      <SlideOver
        open={inspectionOpen}
        onClose={() => setInspectionOpen(false)}
        title="New inspection"
        description="Record the vehicle condition at check-out or check-in."
        width="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setInspectionOpen(false)}>
              Cancel
            </Button>
            <Button className="gap-1.5" onClick={saveInspection} disabled={savingInspection}>
              {savingInspection ? "Saving…" : "Save inspection"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Booking">
              <SelectInput
                value={inspectionForm.bookingId}
                onChange={(event) => selectInspectionBooking(event.target.value)}
              >
                <option value="">Select a booking</option>
                {db.bookings.map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    {booking.reference}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Vehicle" hint={selectedBooking ? "Auto-filled from booking" : undefined}>
              <SelectInput
                value={inspectionForm.vehicleId}
                onChange={(event) =>
                  setInspectionForm((prev) => ({ ...prev, vehicleId: event.target.value }))
                }
              >
                <option value="">Select a vehicle</option>
                {db.vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Kind">
              <SelectInput
                value={inspectionForm.kind}
                onChange={(event) =>
                  setInspectionForm((prev) => ({ ...prev, kind: event.target.value }))
                }
              >
                {INSPECTION_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Odometer (km)">
              <TextInput
                type="number"
                value={inspectionForm.odometerKm}
                onChange={(event) =>
                  setInspectionForm((prev) => ({ ...prev, odometerKm: event.target.value }))
                }
              />
            </Field>
            <Field label="Fuel level (%)">
              <TextInput
                type="number"
                min={0}
                max={100}
                value={inspectionForm.fuelLevel}
                onChange={(event) =>
                  setInspectionForm((prev) => ({ ...prev, fuelLevel: event.target.value }))
                }
              />
            </Field>
          </div>

          <Field label="Damage notes">
            <TextArea
              value={inspectionForm.damage}
              onChange={(event) =>
                setInspectionForm((prev) => ({ ...prev, damage: event.target.value }))
              }
              placeholder="Describe any scratches, dents or missing items…"
            />
          </Field>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Checklist
            </h3>
            <div className="grid grid-cols-1 gap-2 rounded-xl border border-line p-3 sm:grid-cols-2">
              {inspectionChecklist.map((item, index) => (
                <Checkbox
                  key={item.label}
                  label={item.label}
                  checked={item.ok}
                  onChange={() => toggleChecklist(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </SlideOver>

      {/* --------------------------------------------- inspection viewer */}
      <SlideOver
        open={!!viewInspection}
        onClose={() => setViewInspectionId(null)}
        title="Inspection record"
        description={
          viewInspection
            ? `${bookingReference(viewInspection.bookingId)} · ${vehicleName(viewInspection.vehicleId)}`
            : undefined
        }
      >
        {viewInspection && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kind">
                <StatusPill status={viewInspection.kind} />
              </Field>
              <Field label="By">
                <span className="text-sm text-ink">{viewInspection.by}</span>
              </Field>
              <Field label="Odometer">
                <span className="text-sm text-ink">
                  {viewInspection.odometerKm.toLocaleString()} km
                </span>
              </Field>
              <Field label="Fuel level">
                <span className="text-sm text-ink">{viewInspection.fuelLevel}%</span>
              </Field>
              <Field label="Date" className="col-span-2">
                <span className="text-sm text-ink">
                  {formatDate(new Date(viewInspection.createdAt))}
                </span>
              </Field>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Checklist
              </h3>
              <ul className="divide-y divide-line rounded-xl border border-line">
                {viewInspection.checklist.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <span className="text-ink">{item.label}</span>
                    <span className={item.ok ? "text-emerald-600" : "text-brand"}>
                      {item.ok ? "OK" : "Needs attention"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {viewInspection.damage && (
              <p className="rounded-xl bg-mist p-3 text-xs text-ink">{viewInspection.damage}</p>
            )}
          </div>
        )}
      </SlideOver>

      {/* -------------------------------------------------- driver editor */}
      <SlideOver
        open={driverOpen}
        onClose={() => setDriverOpen(false)}
        title={driverEditingId ? "Edit driver" : "Add driver"}
        description="Contact details, licence and vehicle assignment."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDriverOpen(false)}>
              Cancel
            </Button>
            <Button className="gap-1.5" onClick={saveDriver} disabled={savingDriver}>
              {savingDriver ? "Saving…" : driverEditingId ? "Save changes" : "Add driver"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Name">
              <TextInput
                value={driverForm.name}
                onChange={(event) =>
                  setDriverForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </Field>
            <Field label="Phone">
              <TextInput
                value={driverForm.phone}
                onChange={(event) =>
                  setDriverForm((prev) => ({ ...prev, phone: event.target.value }))
                }
              />
            </Field>
            <Field label="Licence number">
              <TextInput
                value={driverForm.licenceNumber}
                onChange={(event) =>
                  setDriverForm((prev) => ({ ...prev, licenceNumber: event.target.value }))
                }
              />
            </Field>
            <Field label="Licence expiry">
              <TextInput
                type="date"
                value={driverForm.licenceExpiry}
                onChange={(event) =>
                  setDriverForm((prev) => ({ ...prev, licenceExpiry: event.target.value }))
                }
              />
            </Field>
            <Field label="Assigned vehicle">
              <SelectInput
                value={driverForm.assignedVehicleId}
                onChange={(event) =>
                  setDriverForm((prev) => ({ ...prev, assignedVehicleId: event.target.value }))
                }
              >
                <option value="">Unassigned</option>
                {db.vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Rating (0–5)">
              <TextInput
                type="number"
                step="0.1"
                value={driverForm.rating}
                onChange={(event) =>
                  setDriverForm((prev) => ({ ...prev, rating: event.target.value }))
                }
              />
            </Field>
            <Field label="Trips completed">
              <TextInput
                type="number"
                value={driverForm.trips}
                onChange={(event) =>
                  setDriverForm((prev) => ({ ...prev, trips: event.target.value }))
                }
              />
            </Field>
          </div>
          <Checkbox
            label="Available"
            checked={driverForm.available}
            onChange={(event) =>
              setDriverForm((prev) => ({ ...prev, available: event.target.checked }))
            }
          />
        </div>
      </SlideOver>

      {/* ------------------------------------------------ document editor */}
      <SlideOver
        open={documentOpen}
        onClose={() => setDocumentOpen(false)}
        title="Add document"
        description="Attach a compliance paper to a vehicle."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDocumentOpen(false)}>
              Cancel
            </Button>
            <Button className="gap-1.5" onClick={saveDocument} disabled={savingDocument}>
              {savingDocument ? "Saving…" : "Add document"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Vehicle">
            <SelectInput
              value={documentForm.vehicleId}
              onChange={(event) =>
                setDocumentForm((prev) => ({ ...prev, vehicleId: event.target.value }))
              }
            >
              <option value="">Select a vehicle</option>
              {db.vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Type">
              <SelectInput
                value={documentForm.type}
                onChange={(event) =>
                  setDocumentForm((prev) => ({ ...prev, type: event.target.value }))
                }
              >
                {DOC_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Reference">
              <TextInput
                value={documentForm.reference}
                onChange={(event) =>
                  setDocumentForm((prev) => ({ ...prev, reference: event.target.value }))
                }
                placeholder="e.g. INS-4021"
              />
            </Field>
            <Field label="Expires">
              <TextInput
                type="date"
                value={documentForm.expiresAt}
                onChange={(event) =>
                  setDocumentForm((prev) => ({ ...prev, expiresAt: event.target.value }))
                }
              />
            </Field>
            <Field label="File">
              <TextInput
                value={documentForm.fileId}
                onChange={(event) =>
                  setDocumentForm((prev) => ({ ...prev, fileId: event.target.value }))
                }
              />
            </Field>
          </div>
        </div>
      </SlideOver>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete record"
        description={
          pendingDelete ? `Delete ${pendingDelete.label}? This cannot be undone.` : ""
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
