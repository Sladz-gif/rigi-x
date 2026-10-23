"use client";

// Settings module: staff & roles, locations, platform settings and the audit log.
// Staff passwords are simulated — accounts sign in with the demo password and are
// forced to change it on first login (see lib/mock/auth.ts).

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CreditCard,
  Database,
  KeyRound,
  Lock,
  MapPin,
  Plus,
  Power,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import {
  AdminCard,
  Checkbox,
  ConfirmDialog,
  DataTable,
  Field,
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
  clearPersistence,
  deleteRow,
  insertRow,
  logAudit,
  resetDb,
  updateRow,
  useDb,
  withLatency,
} from "@/lib/mock/store";
import {
  ADMIN_MODULES,
  ROLES,
  ROLE_LABELS,
  canAccessModule,
  hasCapability,
  type Role,
} from "@/lib/permissions";
import { DEV_PASSWORD, STRONG_DEMO_PASSWORD } from "@/lib/mock/auth";
import type { AuditLog, Location, Setting, StaffUser } from "@/lib/mock/types";
import { siteConfig } from "@/lib/site-config";
import { formatDate } from "@/lib/utils";

const TAB_IDS = ["staff", "locations", "platform", "audit"];
const LOCATION_TYPES: Location["type"][] = ["office", "airport", "partner"];

function useActor() {
  const optional = useOptionalAdminSession();
  return {
    name: optional?.session.name ?? "System",
    id: optional?.session.userId ?? "usr-1",
    role: optional?.role,
  };
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ================================================================= staff */

function StaffTab() {
  const db = useDb();
  const { toast } = useToast();
  const actor = useActor();

  const canManage = actor.role ? hasCapability(actor.role, "manage_users") : false;
  const canDelete =
    actor.role
      ? hasCapability(actor.role, "manage_users") && hasCapability(actor.role, "delete_records")
      : false;

  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffUser | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("support");
  const [active, setActive] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(true);

  function openCreate() {
    setName("");
    setEmail("");
    setPhone("");
    setDepartment("");
    setRole("support");
    setActive(true);
    setMustChangePassword(true);
    setOpen(true);
  }

  async function handleSave() {
    if (!name.trim() || !email.trim()) {
      toast({ title: "Name and email are required", variant: "error" });
      return;
    }
    setSaving(true);
    await withLatency(null);
    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      department: department.trim(),
      role: role as Role,
      active,
      lastLogin: null,
      mustChangePassword,
    };
    const row = insertRow("staff", payload);
    logAudit({
      actorName: actor.name,
      actorId: actor.id,
      action: "created",
      entity: "Staff",
      entityId: row.id,
      detail: `Added staff account ${payload.email}`,
    });
    toast({ title: "Staff account created", description: payload.email });
    setSaving(false);
    setOpen(false);
  }

  async function handleToggle(user: StaffUser) {
    setBusyId(user.id);
    await withLatency(null);
    updateRow("staff", user.id, { active: !user.active });
    logAudit({
      actorName: actor.name,
      actorId: actor.id,
      action: user.active ? "disabled" : "enabled",
      entity: "Staff",
      entityId: user.id,
      detail: `${user.active ? "Disabled" : "Enabled"} ${user.email}`,
    });
    setBusyId(null);
    toast({ title: user.active ? "Account disabled" : "Account enabled", description: user.email });
  }

  async function handleReset(user: StaffUser) {
    setBusyId(user.id);
    await withLatency(null);
    updateRow("staff", user.id, { mustChangePassword: true });
    logAudit({
      actorName: actor.name,
      actorId: actor.id,
      action: "reset password",
      entity: "Staff",
      entityId: user.id,
      detail: `Forced password change for ${user.email}`,
    });
    setBusyId(null);
    toast({ title: "Password reset required", description: `${user.email} must change it at next sign-in.` });
  }

  async function handleDelete(user: StaffUser) {
    setSaving(true);
    await withLatency(null);
    deleteRow("staff", user.id);
    logAudit({
      actorName: actor.name,
      actorId: actor.id,
      action: "deleted",
      entity: "Staff",
      entityId: user.id,
      detail: `Deleted staff account ${user.email}`,
    });
    setSaving(false);
    toast({ title: "Staff account deleted" });
  }

  const columns: Column<StaffUser>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => <span className="font-medium text-ink">{row.name}</span>,
    },
    { key: "email", header: "Email", hideBelow: "sm" },
    {
      key: "role",
      header: "Role",
      render: (row) => ROLE_LABELS[row.role],
    },
    { key: "department", header: "Department", hideBelow: "lg" },
    { key: "phone", header: "Phone", hideBelow: "lg" },
    {
      key: "active",
      header: "Active",
      render: (row) => <StatusPill status={row.active ? "active" : "disabled"} />,
    },
    {
      key: "lastLogin",
      header: "Last login",
      hideBelow: "md",
      value: (row) => row.lastLogin ?? "",
      render: (row) => (row.lastLogin ? formatDate(new Date(row.lastLogin)) : "—"),
    },
    {
      key: "mustChangePassword",
      header: "Must change password",
      hideBelow: "md",
      render: (row) => (
        <StatusPill
          status={row.mustChangePassword ? "pending" : "confirmed"}
          label={row.mustChangePassword ? "Required" : "No"}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable<StaffUser>
        columns={columns}
        rows={db.staff}
        searchFields={(row) => `${row.name} ${row.email} ${row.department}`}
        searchPlaceholder="Search staff…"
        exportFilename="staff.csv"
        emptyTitle="No staff accounts"
        emptyDescription="Add a staff account to grant admin access."
        toolbar={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add staff
          </Button>
        }
        rowActions={(row) => (
          <div className="flex items-center justify-end gap-1">
            {canManage && (
              <button
                type="button"
                aria-label={`${row.active ? "Disable" : "Enable"} ${row.name}`}
                disabled={busyId === row.id}
                onClick={() => handleToggle(row)}
                className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink disabled:opacity-40"
              >
                <Power className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              aria-label={`Reset password for ${row.name}`}
              disabled={busyId === row.id}
              onClick={() => handleReset(row)}
              className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink disabled:opacity-40"
            >
              <KeyRound className="h-3.5 w-3.5" />
            </button>
            {canDelete && (
              <button
                type="button"
                aria-label={`Delete ${row.name}`}
                onClick={() => setDeleteTarget(row)}
                className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-brand"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      />

      <AdminCard
        title="Permission matrix"
        description="Which modules each role can open."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Module
                </th>
                {ROLES.map((roleKey) => (
                  <th
                    key={roleKey}
                    className="whitespace-nowrap px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted"
                  >
                    {ROLE_LABELS[roleKey]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ADMIN_MODULES.map((moduleKey) => (
                <tr key={moduleKey}>
                  <td className="sticky left-0 bg-white px-3 py-2 font-medium capitalize text-ink">
                    {moduleKey}
                  </td>
                  {ROLES.map((roleKey) => (
                    <td key={roleKey} className="px-3 py-2 text-center">
                      {canAccessModule(roleKey, moduleKey) ? (
                        <Check className="mx-auto h-3.5 w-3.5 text-emerald-600" aria-label="Allowed" />
                      ) : (
                        <span className="text-muted" aria-label="Not allowed">
                          —
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title="Add staff"
        description="New accounts sign in with the shared demo password."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Create account"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name">
              <TextInput
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ama Boateng"
              />
            </Field>
            <Field label="Email">
              <TextInput
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@rigi-x.com"
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Phone">
              <TextInput
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+233 53 884 8346"
              />
            </Field>
            <Field label="Department">
              <TextInput
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                placeholder="Operations"
              />
            </Field>
          </div>
          <Field label="Role">
            <SelectInput value={role} onChange={(event) => setRole(event.target.value)}>
              {ROLES.map((roleKey) => (
                <option key={roleKey} value={roleKey}>
                  {ROLE_LABELS[roleKey]}
                </option>
              ))}
            </SelectInput>
          </Field>
          <div className="space-y-3">
            <Checkbox
              label="Active"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
            />
            <Checkbox
              label="Must change password at next sign-in"
              checked={mustChangePassword}
              onChange={(event) => setMustChangePassword(event.target.checked)}
            />
          </div>
          <p className="rounded-xl border border-line bg-mist p-3 text-[11px] text-muted">
            Passwords are not stored in the demo. New staff sign in with
            <span className="mx-1 font-mono text-ink">{DEV_PASSWORD}</span>
            (development) or
            <span className="mx-1 font-mono text-ink">{STRONG_DEMO_PASSWORD}</span>
            (strong demo), and are asked to change it on first login.
          </p>
        </div>
      </SlideOver>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete staff account"
        description={deleteTarget ? `${deleteTarget.name} will lose access immediately.` : ""}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) void handleDelete(deleteTarget);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

/* ============================================================= locations */

function LocationsTab() {
  const db = useDb();
  const { toast } = useToast();
  const actor = useActor();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState("office");
  const [active, setActive] = useState(true);

  function openCreate() {
    setEditing(null);
    setName("");
    setCity("Accra");
    setAddress("");
    setType("office");
    setActive(true);
    setOpen(true);
  }

  function openEdit(location: Location) {
    setEditing(location);
    setName(location.name);
    setCity(location.city);
    setAddress(location.address);
    setType(location.type);
    setActive(location.active);
    setOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "error" });
      return;
    }
    setSaving(true);
    await withLatency(null);
    const payload = {
      name: name.trim(),
      city: city.trim(),
      address: address.trim(),
      type: type as Location["type"],
      active,
    };
    if (editing) {
      updateRow("locations", editing.id, payload);
      logAudit({
        actorName: actor.name,
        actorId: actor.id,
        action: "updated",
        entity: "Location",
        entityId: editing.id,
        detail: `Updated location "${payload.name}"`,
      });
      toast({ title: "Location updated", description: payload.name });
    } else {
      const row = insertRow("locations", payload);
      logAudit({
        actorName: actor.name,
        actorId: actor.id,
        action: "created",
        entity: "Location",
        entityId: row.id,
        detail: `Created location "${payload.name}"`,
      });
      toast({ title: "Location created", description: payload.name });
    }
    setSaving(false);
    setOpen(false);
  }

  async function handleToggle(location: Location) {
    setBusyId(location.id);
    await withLatency(null);
    updateRow("locations", location.id, { active: !location.active });
    logAudit({
      actorName: actor.name,
      actorId: actor.id,
      action: location.active ? "disabled" : "enabled",
      entity: "Location",
      entityId: location.id,
      detail: `${location.active ? "Disabled" : "Enabled"} location "${location.name}"`,
    });
    setBusyId(null);
    toast({ title: location.active ? "Location disabled" : "Location enabled" });
  }

  async function handleDelete(location: Location) {
    setSaving(true);
    await withLatency(null);
    deleteRow("locations", location.id);
    logAudit({
      actorName: actor.name,
      actorId: actor.id,
      action: "deleted",
      entity: "Location",
      entityId: location.id,
      detail: `Deleted location "${location.name}"`,
    });
    setSaving(false);
    toast({ title: "Location deleted" });
  }

  const columns: Column<Location>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => <span className="font-medium text-ink">{row.name}</span>,
    },
    { key: "city", header: "City" },
    { key: "address", header: "Address", hideBelow: "md" },
    { key: "type", header: "Type", render: (row) => <StatusPill status={row.type} /> },
    {
      key: "active",
      header: "Active",
      render: (row) => <StatusPill status={row.active ? "active" : "disabled"} />,
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable<Location>
        columns={columns}
        rows={db.locations}
        searchFields={(row) => `${row.name} ${row.city} ${row.address}`}
        searchPlaceholder="Search locations…"
        exportFilename="locations.csv"
        onRowClick={openEdit}
        emptyTitle="No locations"
        emptyDescription="Add a pickup or office location."
        toolbar={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New location
          </Button>
        }
        rowActions={(row) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              aria-label={`${row.active ? "Disable" : "Enable"} ${row.name}`}
              disabled={busyId === row.id}
              onClick={() => handleToggle(row)}
              className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink disabled:opacity-40"
            >
              <Power className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label={`Delete ${row.name}`}
              onClick={() => setDeleteTarget(row)}
              className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-brand"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      />

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit location" : "New location"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create location"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name">
            <TextInput
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Dzorwulu HQ"
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="City">
              <TextInput
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Accra"
              />
            </Field>
            <Field label="Type">
              <SelectInput value={type} onChange={(event) => setType(event.target.value)}>
                {LOCATION_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <Field label="Address">
            <TextInput
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="C 107/14 Dzorwulu Crescent"
            />
          </Field>
          <Checkbox
            label="Active"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
        </div>
      </SlideOver>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete location"
        description={deleteTarget ? `"${deleteTarget.name}" will be removed.` : ""}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) void handleDelete(deleteTarget);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

/* ============================================================== platform */

function SettingRow({ setting }: { setting: Setting }) {
  const { toast } = useToast();
  const actor = useActor();
  const [value, setValue] = useState(setting.value);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await withLatency(null);
    updateRow("settings", setting.id, { value });
    logAudit({
      actorName: actor.name,
      actorId: actor.id,
      action: "updated",
      entity: "Setting",
      entityId: setting.id,
      detail: `Set ${setting.key} to "${value}"`,
    });
    setSaving(false);
    toast({ title: "Setting saved", description: setting.label });
  }

  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-end sm:gap-3">
      <Field label={setting.label} className="flex-1">
        <TextInput value={value} onChange={(event) => setValue(event.target.value)} />
      </Field>
      <Button
        variant="dark"
        size="sm"
        disabled={saving || value === setting.value}
        onClick={save}
        className="sm:mb-0.5"
      >
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

function PlatformTab() {
  const db = useDb();
  const { toast } = useToast();
  const actor = useActor();

  const [resetOpen, setResetOpen] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, Setting[]>();
    db.settings.forEach((setting) => {
      const list = map.get(setting.group) ?? [];
      list.push(setting);
      map.set(setting.group, list);
    });
    return Array.from(map.entries());
  }, [db.settings]);

  async function handleReset() {
    await withLatency(null);
    resetDb();
    logAudit({
      actorName: actor.name,
      actorId: actor.id,
      action: "reset",
      entity: "Database",
      entityId: "seed",
      detail: "Reset the demo database to seed data",
    });
    toast({ title: "Demo data reset", description: "The store has been restored to seed values." });
  }

  async function handleClear() {
    await withLatency(null);
    clearPersistence();
    toast({
      title: "Local cache cleared",
      description: "Saved changes were removed from localStorage.",
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {groups.map(([groupName, items]) => (
          <AdminCard key={groupName} title={groupName}>
            <div className="divide-y divide-line">
              {items.map((setting) => (
                <SettingRow key={setting.id} setting={setting} />
              ))}
            </div>
          </AdminCard>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AdminCard title="Admin access">
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-brand/10 p-2 text-brand">
              <Lock className="h-4 w-4" />
            </span>
            <div className="text-xs text-muted">
              <p className="font-mono text-sm text-ink">{siteConfig.adminBasePath}</p>
              <p className="mt-1">
                This path is unlisted, excluded from the sitemap and served with a{" "}
                <span className="font-medium text-ink">noindex</span> directive.
              </p>
            </div>
          </div>
        </AdminCard>

        <AdminCard title="Payments">
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-brand/10 p-2 text-brand">
              <CreditCard className="h-4 w-4" />
            </span>
            <div className="text-xs text-muted">
              <p className="text-sm font-medium text-ink">{siteConfig.paymentProvider}</p>
              <p className="mt-1">
                Runs in <span className="font-medium text-ink">DEMO MODE</span> — no live keys and
                no network calls are made.
              </p>
            </div>
          </div>
        </AdminCard>

        <AdminCard title="Demo data">
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-brand/10 p-2 text-brand">
              <Database className="h-4 w-4" />
            </span>
            <div className="flex-1 space-y-3">
              <p className="text-xs text-muted">
                Restore the seed data or clear the local cache that persists changes.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" size="sm" onClick={() => setResetOpen(true)}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Reset demo data
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  Clear local cache
                </Button>
              </div>
            </div>
          </div>
        </AdminCard>
      </div>

      <ConfirmDialog
        open={resetOpen}
        title="Reset demo data"
        description="Every change made in the browser will be discarded and the seed data restored."
        confirmLabel="Reset data"
        onConfirm={() => {
          void handleReset();
        }}
        onClose={() => setResetOpen(false)}
      />
    </div>
  );
}

/* ================================================================= audit */

function AuditTab() {
  const db = useDb();

  const columns: Column<AuditLog>[] = [
    {
      key: "createdAt",
      header: "When",
      value: (row) => row.createdAt,
      render: (row) => formatDateTime(row.createdAt),
    },
    {
      key: "actorName",
      header: "Actor",
      render: (row) => <span className="font-medium text-ink">{row.actorName}</span>,
    },
    { key: "action", header: "Action" },
    { key: "entity", header: "Entity", hideBelow: "sm" },
    {
      key: "entityId",
      header: "Entity ID",
      hideBelow: "md",
      render: (row) => <span className="font-mono text-xs">{row.entityId}</span>,
    },
    { key: "detail", header: "Detail", hideBelow: "lg" },
    {
      key: "ip",
      header: "IP",
      hideBelow: "lg",
      render: (row) => <span className="font-mono text-xs">{row.ip}</span>,
    },
  ];

  return (
    <DataTable<AuditLog>
      columns={columns}
      rows={db.auditLogs}
      searchFields={(row) =>
        `${row.actorName} ${row.action} ${row.entity} ${row.entityId} ${row.detail}`
      }
      searchPlaceholder="Search audit log…"
      exportFilename="audit-log.csv"
      initialSort={{ key: "createdAt", dir: "desc" }}
      emptyTitle="No audit entries"
      emptyDescription="Admin actions will be recorded here."
    />
  );
}

/* ================================================================== page */

export default function AdminSettingsPage() {
  const db = useDb();
  const initialised = useRef(false);
  const [tab, setTab] = useState("staff");

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    if (typeof window === "undefined") return;
    const requested = new URLSearchParams(window.location.search).get("tab");
    if (!requested || !TAB_IDS.includes(requested)) return;
    const timer = window.setTimeout(() => setTab(requested), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const tabs: TabDef[] = [
    { id: "staff", label: "Staff & roles", count: db.staff.length },
    { id: "locations", label: "Locations", count: db.locations.length },
    { id: "platform", label: "Platform", count: db.settings.length },
    { id: "audit", label: "Audit log", count: db.auditLogs.length },
  ];

  const activeStaff = db.staff.filter((member) => member.active).length;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Staff, roles, locations, platform configuration and the audit trail."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Staff accounts"
          value={String(db.staff.length)}
          sub="All admin users"
          icon={Users}
        />
        <KpiCard
          label="Active staff"
          value={String(activeStaff)}
          sub="Able to sign in"
          icon={ShieldCheck}
          tone="positive"
        />
        <KpiCard
          label="Locations"
          value={String(db.locations.length)}
          sub="Pickup and office points"
          icon={MapPin}
        />
        <KpiCard
          label="Audit entries"
          value={String(db.auditLogs.length)}
          sub="Recorded admin actions"
          icon={ScrollText}
        />
      </div>

      <div className="mt-5">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      {tab === "staff" && <StaffTab />}
      {tab === "locations" && <LocationsTab />}
      {tab === "platform" && <PlatformTab />}
      {tab === "audit" && <AuditTab />}
    </>
  );
}
