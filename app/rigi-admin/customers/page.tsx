"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Ban, Pencil, Plus, ShieldCheck, ShieldOff, Star, Trash2 } from "lucide-react";
import {
  Checkbox,
  ConfirmDialog,
  DataTable,
  Field,
  FilterSelect,
  KpiCard,
  PageHeader,
  SelectInput,
  SensitiveValue,
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
import { hasCapability, maskId } from "@/lib/permissions";
import {
  deleteRow,
  insertRow,
  logAudit,
  updateRow,
  useDb,
  withLatency,
} from "@/lib/mock/store";
import type { Customer, CustomerTier, Review } from "@/lib/mock/types";
import { cn, formatDate, formatGHS } from "@/lib/utils";

const TIERS: CustomerTier[] = ["new", "silver", "gold", "platinum"];
const NATIONALITIES: Customer["nationality"][] = ["Ghana resident", "International visitor"];
const ID_TYPES: Customer["idType"][] = ["Ghana Card", "Passport", "National ID"];

interface CustomerForm {
  name: string;
  email: string;
  phone: string;
  phoneAlt: string;
  city: string;
  address: string;
  nationality: Customer["nationality"];
  idType: Customer["idType"];
  idNumber: string;
  licenceNumber: string;
  licenceExpiry: string;
  dateOfBirth: string;
  tier: CustomerTier;
  tags: string;
  segment: string;
  verified: boolean;
  blacklisted: boolean;
  blacklistReason: string;
  totalSpend: string;
  rentals: string;
  notes: string;
}

function defaultCustomerForm(): CustomerForm {
  return {
    name: "",
    email: "",
    phone: "",
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
    tags: "",
    segment: "New",
    verified: false,
    blacklisted: false,
    blacklistReason: "",
    totalSpend: "0",
    rentals: "0",
    notes: "",
  };
}

function toCustomerForm(customer: Customer): CustomerForm {
  return {
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    phoneAlt: customer.phoneAlt,
    city: customer.city,
    address: customer.address,
    nationality: customer.nationality,
    idType: customer.idType,
    idNumber: customer.idNumber,
    licenceNumber: customer.licenceNumber,
    licenceExpiry: customer.licenceExpiry,
    dateOfBirth: customer.dateOfBirth,
    tier: customer.tier,
    tags: customer.tags.join(", "),
    segment: customer.segment,
    verified: customer.verified,
    blacklisted: customer.blacklisted,
    blacklistReason: customer.blacklistReason,
    totalSpend: String(customer.totalSpend),
    rentals: String(customer.rentals),
    notes: customer.notes,
  };
}

const num = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={cn(
            "h-3.5 w-3.5",
            value <= rating ? "fill-amber-400 text-amber-400" : "text-line"
          )}
        />
      ))}
    </span>
  );
}

export default function AdminCustomersPage() {
  const db = useDb();
  const { toast } = useToast();
  const session = useOptionalAdminSession();
  const role = session?.role;
  const actorName = session?.session.name ?? "Admin";
  const canReveal = role ? hasCapability(role, "reveal_sensitive") : false;
  const canDelete = role ? hasCapability(role, "delete_records") : false;

  const [tab, setTab] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [verifiedFilter, setVerifiedFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CustomerForm>(() => defaultCustomerForm());
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState<CustomerForm | null>(null);
  const [revealed, setRevealed] = useState({ idNumber: false, licenceNumber: false });

  const [blacklistTarget, setBlacklistTarget] = useState<Customer | null>(null);
  const [blacklistReason, setBlacklistReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const handledQuery = useRef(false);
  useEffect(() => {
    if (handledQuery.current || typeof window === "undefined") return;
    handledQuery.current = true;
    const requested = new URLSearchParams(window.location.search).get("new");
    if (requested !== "client" && requested !== "customer") return;
    // Deferred so the external query-param read never triggers a cascading render.
    queueMicrotask(() => {
      setTab("all");
      setCreateForm(defaultCustomerForm());
      setCreateOpen(true);
    });
  }, []);

  const customers = db.customers;
  const reviews = db.reviews;

  const customerName = (id: string) => customers.find((customer) => customer.id === id)?.name ?? "Guest";
  const vehicleName = (id: string | null) =>
    id ? db.vehicles.find((vehicle) => vehicle.id === id)?.name ?? "—" : "—";

  const verifiedCustomers = useMemo(() => customers.filter((c) => c.verified), [customers]);
  const blacklistedCustomers = useMemo(() => customers.filter((c) => c.blacklisted), [customers]);
  const totalSpend = useMemo(
    () => customers.reduce((sum, customer) => sum + customer.totalSpend, 0),
    [customers]
  );

  const filteredCustomers = useMemo(
    () =>
      customers.filter(
        (customer) =>
          (tierFilter === "all" || customer.tier === tierFilter) &&
          (verifiedFilter === "all" ||
            customer.verified === (verifiedFilter === "verified"))
      ),
    [customers, tierFilter, verifiedFilter]
  );

  const tabs: TabDef[] = [
    { id: "all", label: "All customers", count: customers.length },
    { id: "verified", label: "Verified", count: verifiedCustomers.length },
    { id: "blacklist", label: "Blacklist", count: blacklistedCustomers.length },
    { id: "reviews", label: "Reviews", count: reviews.length },
  ];

  /* --------------------------------------------------------- mutations */
  const saveCustomer = async () => {
    setSaving(true);
    try {
      const form = editCustomer ? editForm : createForm;
      if (!form) throw new Error("Nothing to save.");
      if (!form.name.trim()) throw new Error("Enter the customer name.");
      if (!form.email.trim()) throw new Error("Enter an email address.");
      await withLatency(null, 500);

      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        phoneAlt: form.phoneAlt.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        nationality: form.nationality,
        idType: form.idType,
        idNumber: form.idNumber.trim(),
        licenceNumber: form.licenceNumber.trim(),
        licenceExpiry: form.licenceExpiry,
        dateOfBirth: form.dateOfBirth,
        tier: form.tier,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        segment: form.segment.trim() || "New",
        verified: form.verified,
        blacklisted: form.blacklisted,
        blacklistReason: form.blacklistReason.trim(),
        totalSpend: num(form.totalSpend),
        rentals: num(form.rentals),
        notes: form.notes.trim(),
      };

      if (editCustomer) {
        updateRow("customers", editCustomer.id, payload);
        logAudit({
          actorName,
          action: "updated",
          entity: "Customer",
          entityId: editCustomer.id,
          detail: `Updated ${payload.name}`,
        });
        toast({ title: "Customer updated", description: payload.name });
        setEditCustomer(null);
        setEditForm(null);
      } else {
        const created = insertRow("customers", payload);
        logAudit({
          actorName,
          action: "created",
          entity: "Customer",
          entityId: created.id,
          detail: `Created ${created.name}`,
        });
        toast({ title: "Customer created", description: created.name });
        setCreateOpen(false);
        setCreateForm(defaultCustomerForm());
      }
    } catch (error) {
      toast({
        title: "Could not save customer",
        description: error instanceof Error ? error.message : "Unexpected error.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleVerified = async (customer: Customer) => {
    const verified = !customer.verified;
    await withLatency(null, 350);
    updateRow("customers", customer.id, { verified });
    logAudit({
      actorName,
      action: "updated",
      entity: "Customer",
      entityId: customer.id,
      detail: `${verified ? "Verified" : "Unverified"} ${customer.name}`,
    });
    toast({
      title: verified ? "Customer verified" : "Customer unverified",
      description: customer.name,
    });
  };

  const confirmBlacklist = async () => {
    if (!blacklistTarget) return;
    const reason = blacklistReason.trim();
    if (!reason) {
      toast({ title: "A reason is required", variant: "error" });
      return;
    }
    setSaving(true);
    try {
      await withLatency(null, 450);
      updateRow("customers", blacklistTarget.id, { blacklisted: true, blacklistReason: reason });
      logAudit({
        actorName,
        action: "updated",
        entity: "Customer",
        entityId: blacklistTarget.id,
        detail: `Blacklisted ${blacklistTarget.name}`,
      });
      toast({ title: "Customer blacklisted", description: blacklistTarget.name });
      setBlacklistTarget(null);
      setBlacklistReason("");
    } finally {
      setSaving(false);
    }
  };

  const removeFromBlacklist = async (customer: Customer) => {
    await withLatency(null, 350);
    updateRow("customers", customer.id, { blacklisted: false, blacklistReason: "" });
    logAudit({
      actorName,
      action: "updated",
      entity: "Customer",
      entityId: customer.id,
      detail: `Removed ${customer.name} from blacklist`,
    });
    toast({ title: "Removed from blacklist", description: customer.name });
  };

  const confirmDelete = async (customer: Customer) => {
    await withLatency(null, 400);
    deleteRow("customers", customer.id);
    logAudit({
      actorName,
      action: "deleted",
      entity: "Customer",
      entityId: customer.id,
      detail: `Deleted ${customer.name}`,
    });
    toast({ title: "Customer deleted", description: customer.name, variant: "info" });
  };

  const setReviewPublished = async (review: Review, approved: boolean) => {
    await withLatency(null, 350);
    updateRow("reviews", review.id, {
      approved,
      publishedAt: approved ? new Date().toISOString() : null,
    });
    logAudit({
      actorName,
      action: "updated",
      entity: "Review",
      entityId: review.id,
      detail: `${approved ? "Published" : "Unpublished"} review "${review.title}"`,
    });
    toast({
      title: approved ? "Review published" : "Review unpublished",
      description: review.title,
    });
  };

  const deleteReview = async (review: Review) => {
    await withLatency(null, 400);
    deleteRow("reviews", review.id);
    logAudit({
      actorName,
      action: "deleted",
      entity: "Review",
      entityId: review.id,
      detail: `Deleted review "${review.title}"`,
    });
    toast({ title: "Review deleted", description: review.title, variant: "info" });
  };

  const openEdit = (customer: Customer) => {
    setRevealed({ idNumber: false, licenceNumber: false });
    setEditCustomer(customer);
    setEditForm(toCustomerForm(customer));
  };

  /* ----------------------------------------------------------- columns */
  const customerColumns: Column<Customer>[] = [
    {
      key: "name",
      header: "Name",
      render: (customer) => <span className="font-medium">{customer.name}</span>,
    },
    { key: "email", header: "Email", hideBelow: "md", value: (customer) => customer.email },
    { key: "phone", header: "Phone", hideBelow: "lg", value: (customer) => customer.phone },
    { key: "city", header: "City", hideBelow: "sm", value: (customer) => customer.city },
    {
      key: "tier",
      header: "Tier",
      value: (customer) => customer.tier,
      render: (customer) => <StatusPill status={customer.tier} />,
    },
    {
      key: "rentals",
      header: "Rentals",
      align: "right",
      hideBelow: "md",
      value: (customer) => customer.rentals,
    },
    {
      key: "totalSpend",
      header: "Total spend",
      align: "right",
      value: (customer) => customer.totalSpend,
      render: (customer) => formatGHS(customer.totalSpend),
    },
    {
      key: "verified",
      header: "Verified",
      value: (customer) => (customer.verified ? "Verified" : "Unverified"),
      render: (customer) => <StatusPill status={customer.verified ? "verified" : "unverified"} />,
    },
    {
      key: "tags",
      header: "Tags",
      hideBelow: "lg",
      value: (customer) => customer.tags.join(", "),
      render: (customer) => (
        <span className="flex flex-wrap gap-1">
          {customer.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-mist px-2 py-0.5 text-[10px] text-muted">
              {tag}
            </span>
          ))}
        </span>
      ),
    },
  ];

  const blacklistColumns: Column<Customer>[] = [
    {
      key: "name",
      header: "Name",
      render: (customer) => <span className="font-medium">{customer.name}</span>,
    },
    { key: "email", header: "Email", hideBelow: "md", value: (customer) => customer.email },
    { key: "phone", header: "Phone", hideBelow: "lg", value: (customer) => customer.phone },
    {
      key: "blacklistReason",
      header: "Reason",
      value: (customer) => customer.blacklistReason,
      render: (customer) => customer.blacklistReason || "—",
    },
    {
      key: "totalSpend",
      header: "Total spend",
      align: "right",
      hideBelow: "sm",
      value: (customer) => customer.totalSpend,
      render: (customer) => formatGHS(customer.totalSpend),
    },
  ];

  const reviewColumns: Column<Review>[] = [
    {
      key: "body",
      header: "Review",
      value: (review) => review.body,
      render: (review) => (
        <span className="block max-w-[280px] truncate text-muted">{review.body}</span>
      ),
    },
    {
      key: "customerId",
      header: "Customer",
      hideBelow: "sm",
      value: (review) => customerName(review.customerId),
      render: (review) => customerName(review.customerId),
    },
    {
      key: "vehicleId",
      header: "Vehicle",
      hideBelow: "md",
      value: (review) => vehicleName(review.vehicleId),
      render: (review) => vehicleName(review.vehicleId),
    },
    {
      key: "rating",
      header: "Rating",
      value: (review) => review.rating,
      render: (review) => <Stars rating={review.rating} />,
    },
    {
      key: "title",
      header: "Title",
      hideBelow: "md",
      value: (review) => review.title,
      render: (review) => <span className="font-medium">{review.title}</span>,
    },
    {
      key: "publishedAt",
      header: "Published",
      value: (review) => review.publishedAt ?? "Draft",
      render: (review) =>
        review.publishedAt ? (
          formatDate(new Date(review.publishedAt))
        ) : (
          <StatusPill status="draft" label="Unpublished" />
        ),
    },
  ];

  const rowActionClass =
    "rounded-lg p-1.5 text-muted transition-colors hover:bg-mist hover:text-ink";

  const iconActionClass =
    "rounded-lg p-1.5 text-muted transition-colors hover:bg-brand/5 hover:text-brand";

  const customerRowActions = (customer: Customer, mode: "all" | "verified" | "blacklist") => (
    <div className="flex items-center justify-end gap-0.5">
      {mode === "blacklist" ? (
        <button
          type="button"
          aria-label={`Remove ${customer.name} from blacklist`}
          onClick={() => void removeFromBlacklist(customer)}
          className={rowActionClass}
        >
          <ShieldOff className="h-3.5 w-3.5" />
        </button>
      ) : (
        <>
          <button
            type="button"
            aria-label={`View or edit ${customer.name}`}
            onClick={() => openEdit(customer)}
            className={rowActionClass}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label={`${customer.verified ? "Unverify" : "Verify"} ${customer.name}`}
            onClick={() => void toggleVerified(customer)}
            className={rowActionClass}
          >
            {customer.verified ? (
              <ShieldOff className="h-3.5 w-3.5" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
          </button>
          {!customer.blacklisted && (
            <button
              type="button"
              aria-label={`Blacklist ${customer.name}`}
              onClick={() => {
                setBlacklistReason("");
                setBlacklistTarget(customer);
              }}
              className={iconActionClass}
            >
              <Ban className="h-3.5 w-3.5" />
            </button>
          )}
        </>
      )}
      {canDelete && (
        <button
          type="button"
          aria-label={`Delete ${customer.name}`}
          onClick={() => setDeleteTarget(customer)}
          className={iconActionClass}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  const renderCustomerFields = (
    form: CustomerForm,
    update: (patch: Partial<CustomerForm>) => void,
    sensitiveId?: string
  ) => (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Identity</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Full name">
            <TextInput
              value={form.name}
              onChange={(event) => update({ name: event.target.value })}
            />
          </Field>
          <Field label="Email">
            <TextInput
              type="email"
              value={form.email}
              onChange={(event) => update({ email: event.target.value })}
            />
          </Field>
          <Field label="Phone">
            <TextInput
              value={form.phone}
              onChange={(event) => update({ phone: event.target.value })}
            />
          </Field>
          <Field label="Alternative phone">
            <TextInput
              value={form.phoneAlt}
              onChange={(event) => update({ phoneAlt: event.target.value })}
            />
          </Field>
          <Field label="City">
            <TextInput
              value={form.city}
              onChange={(event) => update({ city: event.target.value })}
            />
          </Field>
          <Field label="Address">
            <TextInput
              value={form.address}
              onChange={(event) => update({ address: event.target.value })}
            />
          </Field>
          <Field label="Nationality">
            <SelectInput
              value={form.nationality}
              onChange={(event) =>
                update({ nationality: event.target.value as Customer["nationality"] })
              }
            >
              {NATIONALITIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="ID type">
            <SelectInput
              value={form.idType}
              onChange={(event) => update({ idType: event.target.value as Customer["idType"] })}
            >
              {ID_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Documents
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="ID number" hint={sensitiveId ? "Sensitive — reveal to view." : undefined}>
            {sensitiveId ? (
              <span className="flex items-center rounded-xl border border-line bg-mist/50 px-3 py-2">
                <SensitiveValue
                  value={form.idNumber}
                  masked={maskId(form.idNumber)}
                  revealed={revealed.idNumber}
                  onReveal={
                    canReveal
                      ? () => {
                          setRevealed((prev) => ({ ...prev, idNumber: true }));
                          logAudit({
                            actorName,
                            action: "revealed",
                            entity: "Customer",
                            entityId: sensitiveId,
                            detail: `Revealed ID number for ${form.name}`,
                          });
                        }
                      : undefined
                  }
                />
              </span>
            ) : (
              <TextInput
                value={form.idNumber}
                onChange={(event) => update({ idNumber: event.target.value })}
              />
            )}
          </Field>
          <Field
            label="Licence number"
            hint={sensitiveId ? "Sensitive — reveal to view." : undefined}
          >
            {sensitiveId ? (
              <span className="flex items-center rounded-xl border border-line bg-mist/50 px-3 py-2">
                <SensitiveValue
                  value={form.licenceNumber}
                  masked={maskId(form.licenceNumber)}
                  revealed={revealed.licenceNumber}
                  onReveal={
                    canReveal
                      ? () => {
                          setRevealed((prev) => ({ ...prev, licenceNumber: true }));
                          logAudit({
                            actorName,
                            action: "revealed",
                            entity: "Customer",
                            entityId: sensitiveId,
                            detail: `Revealed licence number for ${form.name}`,
                          });
                        }
                      : undefined
                  }
                />
              </span>
            ) : (
              <TextInput
                value={form.licenceNumber}
                onChange={(event) => update({ licenceNumber: event.target.value })}
              />
            )}
          </Field>
          <Field label="Licence expiry">
            <TextInput
              type="date"
              value={form.licenceExpiry}
              onChange={(event) => update({ licenceExpiry: event.target.value })}
            />
          </Field>
          <Field label="Date of birth">
            <TextInput
              type="date"
              value={form.dateOfBirth}
              onChange={(event) => update({ dateOfBirth: event.target.value })}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Commercial
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Tier">
            <SelectInput
              value={form.tier}
              onChange={(event) => update({ tier: event.target.value as CustomerTier })}
            >
              {TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Segment">
            <TextInput
              value={form.segment}
              onChange={(event) => update({ segment: event.target.value })}
            />
          </Field>
          <Field label="Tags" hint="Comma separated">
            <TextInput
              value={form.tags}
              onChange={(event) => update({ tags: event.target.value })}
              placeholder="VIP, corporate"
            />
          </Field>
          <Field label="Lifetime spend (GHS)">
            <TextInput
              type="number"
              value={form.totalSpend}
              onChange={(event) => update({ totalSpend: event.target.value })}
            />
          </Field>
          <Field label="Rentals">
            <TextInput
              type="number"
              value={form.rentals}
              onChange={(event) => update({ rentals: event.target.value })}
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-4">
          <Checkbox
            label="Verified"
            checked={form.verified}
            onChange={(event) => update({ verified: event.target.checked })}
          />
          <Checkbox
            label="Blacklisted"
            checked={form.blacklisted}
            onChange={(event) => update({ blacklisted: event.target.checked })}
          />
        </div>
        {form.blacklisted && (
          <Field label="Blacklist reason">
            <TextArea
              value={form.blacklistReason}
              onChange={(event) => update({ blacklistReason: event.target.value })}
            />
          </Field>
        )}
        <Field label="Notes">
          <TextArea
            value={form.notes}
            onChange={(event) => update({ notes: event.target.value })}
          />
        </Field>
      </section>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Customers"
        description="Every renter, their verification status and their reviews."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setCreateForm(defaultCustomerForm());
              setCreateOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New customer
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Total customers" value={String(customers.length)} sub="In the database" />
        <KpiCard
          label="Verified"
          value={String(verifiedCustomers.length)}
          sub="ID and licence checked"
          tone="positive"
        />
        <KpiCard
          label="Blacklisted"
          value={String(blacklistedCustomers.length)}
          sub="Blocked from renting"
          tone={blacklistedCustomers.length ? "danger" : "neutral"}
        />
        <KpiCard
          label="Total lifetime spend"
          value={formatGHS(totalSpend)}
          sub="Across all customers"
        />
      </div>

      <div className="mt-5">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      {tab === "all" && (
        <DataTable<Customer>
          columns={customerColumns}
          rows={filteredCustomers}
          exportFilename="customers.csv"
          searchPlaceholder="Search name, email, phone, city…"
          searchFields={(customer) =>
            [customer.name, customer.email, customer.phone, customer.phoneAlt, customer.city]
              .filter(Boolean)
              .join(" ")
          }
          filters={
            <>
              <FilterSelect
                label="Tier"
                value={tierFilter}
                options={["all", ...TIERS]}
                onChange={setTierFilter}
              />
              <FilterSelect
                label="Verification"
                value={verifiedFilter}
                options={["all", "verified", "unverified"]}
                onChange={setVerifiedFilter}
              />
            </>
          }
          onRowClick={openEdit}
          rowActions={(customer) => customerRowActions(customer, "all")}
          emptyTitle="No customers match these filters"
          emptyDescription="Adjust the tier or verification filters, or add a new customer."
        />
      )}

      {tab === "verified" && (
        <DataTable<Customer>
          columns={customerColumns}
          rows={verifiedCustomers}
          exportFilename="verified-customers.csv"
          searchPlaceholder="Search verified customers…"
          searchFields={(customer) =>
            [customer.name, customer.email, customer.phone, customer.city].filter(Boolean).join(" ")
          }
          onRowClick={openEdit}
          rowActions={(customer) => customerRowActions(customer, "verified")}
          emptyTitle="No verified customers"
          emptyDescription="Verify a customer's ID and licence to see them here."
        />
      )}

      {tab === "blacklist" && (
        <DataTable<Customer>
          columns={blacklistColumns}
          rows={blacklistedCustomers}
          exportFilename="blacklist.csv"
          searchPlaceholder="Search blacklisted customers…"
          searchFields={(customer) =>
            [customer.name, customer.email, customer.blacklistReason].filter(Boolean).join(" ")
          }
          rowActions={(customer) => customerRowActions(customer, "blacklist")}
          emptyTitle="No blacklisted customers"
          emptyDescription="Customers you blacklist, with their reasons, appear here."
        />
      )}

      {tab === "reviews" && (
        <DataTable<Review>
          columns={reviewColumns}
          rows={reviews}
          exportFilename="reviews.csv"
          searchPlaceholder="Search reviews, customers, vehicles…"
          searchFields={(review) =>
            [
              review.title,
              review.body,
              customerName(review.customerId),
              vehicleName(review.vehicleId),
            ]
              .filter(Boolean)
              .join(" ")
          }
          rowActions={(review) => (
            <div className="flex items-center justify-end gap-0.5">
              <button
                type="button"
                aria-label={`${review.approved ? "Unpublish" : "Approve and publish"} review ${
                  review.title
                }`}
                onClick={() => void setReviewPublished(review, !review.approved)}
                className={rowActionClass}
              >
                {review.approved ? (
                  <ShieldOff className="h-3.5 w-3.5" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
              </button>
              {canDelete && (
                <button
                  type="button"
                  aria-label={`Delete review ${review.title}`}
                  onClick={() => void deleteReview(review)}
                  className={iconActionClass}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          emptyTitle="No reviews yet"
          emptyDescription="Customer reviews captured on the site appear here for moderation."
        />
      )}

      {/* ------------------------------------------ create customer */}
      <SlideOver
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New customer"
        description="Add a renter to the database."
        width="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveCustomer()} disabled={saving}>
              {saving ? "Saving…" : "Create customer"}
            </Button>
          </>
        }
      >
        {renderCustomerFields(createForm, (patch) =>
          setCreateForm((prev) => ({ ...prev, ...patch }))
        )}
      </SlideOver>

      {/* -------------------------------------------- edit customer */}
      <SlideOver
        open={editCustomer !== null && editForm !== null}
        onClose={() => {
          setEditCustomer(null);
          setEditForm(null);
        }}
        title={editCustomer ? editCustomer.name : "Customer"}
        description={editCustomer ? editCustomer.email : undefined}
        width="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setEditCustomer(null);
                setEditForm(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => void saveCustomer()} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </>
        }
      >
        {editForm &&
          editCustomer &&
          renderCustomerFields(
            editForm,
            (patch) => setEditForm((prev) => (prev ? { ...prev, ...patch } : prev)),
            editCustomer.id
          )}
      </SlideOver>

      {/* ---------------------------------------------- blacklist */}
      <SlideOver
        open={blacklistTarget !== null}
        onClose={() => {
          setBlacklistTarget(null);
          setBlacklistReason("");
        }}
        title="Blacklist customer"
        description={
          blacklistTarget
            ? `${blacklistTarget.name} will be blocked from renting.`
            : undefined
        }
        width="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setBlacklistTarget(null);
                setBlacklistReason("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => void confirmBlacklist()} disabled={saving}>
              {saving ? "Saving…" : "Blacklist"}
            </Button>
          </>
        }
      >
        <Field label="Reason" hint="Stored on the customer record for the team to see.">
          <TextArea
            value={blacklistReason}
            onChange={(event) => setBlacklistReason(event.target.value)}
            placeholder="e.g. Unpaid damage claim from RGX-100016"
          />
        </Field>
      </SlideOver>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete customer?"
        description={`${deleteTarget?.name ?? "This customer"} will be removed permanently. This cannot be undone.`}
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
