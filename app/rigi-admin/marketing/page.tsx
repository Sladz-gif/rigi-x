"use client";

// Marketing module: campaigns, email templates, the outbox, audience segments,
// promo codes and the content board. Every write goes through the mock store,
// which persists to localStorage and re-renders every subscriber.

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Eye,
  Mail,
  MailOpen,
  Megaphone,
  Plus,
  RefreshCw,
  Send,
  Tag,
  Trash2,
} from "lucide-react";
import {
  AdminCard,
  ChartCard,
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
import type {
  Campaign,
  ContentItem,
  EmailOutbox,
  EmailTemplate,
  PromoCode,
  Segment,
} from "@/lib/mock/types";
import { formatDate, formatGHS } from "@/lib/utils";

const CategoryBarChart = dynamic(
  () => import("@/components/admin/charts").then((mod) => mod.CategoryBarChart),
  { ssr: false, loading: () => <TableSkeleton rows={4} cols={2} /> }
);
const ShareDonutChart = dynamic(
  () => import("@/components/admin/charts").then((mod) => mod.ShareDonutChart),
  { ssr: false, loading: () => <TableSkeleton rows={4} cols={2} /> }
);

const TAB_IDS = ["campaigns", "templates", "outbox", "segments", "promos", "content"];

const CAMPAIGN_STATUSES: Campaign["status"][] = ["draft", "scheduled", "sent", "paused"];
const EMAIL_CATEGORIES: EmailTemplate["category"][] = [
  "promo",
  "reminder",
  "thank_you",
  "win_back",
  "newsletter",
  "transactional",
];
const OUTBOX_STATUSES: EmailOutbox["status"][] = ["queued", "sent", "failed"];
const OUTBOX_PROVIDERS: EmailOutbox["provider"][] = ["mock", "resend"];
const PROMO_KINDS: PromoCode["kind"][] = ["percent", "fixed"];
const CONTENT_CHANNELS: ContentItem["channel"][] = ["email", "instagram", "blog", "whatsapp"];
const CONTENT_STATUSES: ContentItem["status"][] = ["idea", "draft", "scheduled", "published"];

function useActor() {
  const optional = useOptionalAdminSession();
  return {
    name: optional?.session.name ?? "System",
    id: optional?.session.userId ?? "usr-1",
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

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function openRateOf(campaign: Campaign): number {
  return campaign.recipients ? (campaign.opens / campaign.recipients) * 100 : 0;
}

/* ============================================================== campaigns */

function CampaignsTab() {
  const db = useDb();
  const { toast } = useToast();
  const actor = useActor();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [audience, setAudience] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [status, setStatus] = useState("draft");
  const [scheduledAt, setScheduledAt] = useState("");

  const audienceOptions = db.segments.map((segment) => segment.name);

  function openCreate() {
    setEditing(null);
    setName("");
    setSubject("");
    setAudience(audienceOptions[0] ?? "");
    setTemplateId("");
    setStatus("draft");
    setScheduledAt("");
    setOpen(true);
  }

  function openEdit(campaign: Campaign) {
    setEditing(campaign);
    setName(campaign.name);
    setSubject(campaign.subject);
    setAudience(campaign.audience);
    setTemplateId(campaign.templateId ?? "");
    setStatus(campaign.status);
    setScheduledAt(toLocalInput(campaign.scheduledAt));
    setOpen(true);
  }

  async function handleSave() {
    if (!name.trim() || !subject.trim()) {
      toast({ title: "Name and subject are required", variant: "error" });
      return;
    }
    setSaving(true);
    await withLatency(null);
    const payload = {
      name: name.trim(),
      subject: subject.trim(),
      audience,
      templateId: templateId || null,
      status: status as Campaign["status"],
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    };
    if (editing) {
      updateRow("campaigns", editing.id, payload);
      logAudit({
        actorName: actor.name,
        actorId: actor.id,
        action: "updated",
        entity: "Campaign",
        entityId: editing.id,
        detail: `Updated campaign "${payload.name}"`,
      });
      toast({ title: "Campaign updated", description: payload.name });
    } else {
      const row = insertRow("campaigns", {
        ...payload,
        sentAt: null,
        recipients: 0,
        opens: 0,
        clicks: 0,
      });
      logAudit({
        actorName: actor.name,
        actorId: actor.id,
        action: "created",
        entity: "Campaign",
        entityId: row.id,
        detail: `Created campaign "${payload.name}"`,
      });
      toast({ title: "Campaign created", description: payload.name });
    }
    setSaving(false);
    setOpen(false);
  }

  async function handleSend(campaign: Campaign) {
    setSendingId(campaign.id);
    await withLatency(null);
    const segment = db.segments.find((item) => item.name === campaign.audience);
    const recipients = segment?.members ?? 250;
    const sentAt = new Date().toISOString();
    updateRow("campaigns", campaign.id, { status: "sent", sentAt, recipients });

    const template = db.emailTemplates.find((item) => item.id === campaign.templateId);
    const body = template?.body ?? `<p>${campaign.subject}</p>`;
    const targets = db.customers.slice(0, 5);
    targets.forEach((customer) => {
      insertRow("emailOutbox", {
        to: customer.email,
        subject: campaign.subject,
        body,
        templateId: campaign.templateId,
        status: "sent",
        provider: "mock",
        sentAt,
      });
    });

    logAudit({
      actorName: actor.name,
      actorId: actor.id,
      action: "sent",
      entity: "Campaign",
      entityId: campaign.id,
      detail: `Sent campaign "${campaign.name}" to ${recipients} recipients`,
    });
    setSendingId(null);
    toast({
      title: `Campaign sent to ${recipients} recipients`,
      description: `Queued ${targets.length} preview email(s) in the outbox.`,
    });
  }

  async function handleDelete(campaign: Campaign) {
    setSaving(true);
    await withLatency(null);
    deleteRow("campaigns", campaign.id);
    logAudit({
      actorName: actor.name,
      actorId: actor.id,
      action: "deleted",
      entity: "Campaign",
      entityId: campaign.id,
      detail: `Deleted campaign "${campaign.name}"`,
    });
    setSaving(false);
    toast({ title: "Campaign deleted" });
  }

  const rows = db.campaigns.filter(
    (campaign) => statusFilter === "all" || campaign.status === statusFilter
  );
  const sentCampaigns = db.campaigns.filter(
    (campaign) => campaign.status === "sent" && campaign.recipients > 0
  );
  const openRateData = sentCampaigns.map((campaign) => ({
    label: campaign.name.length > 22 ? `${campaign.name.slice(0, 20)}…` : campaign.name,
    value: Math.round(openRateOf(campaign) * 10) / 10,
  }));

  const columns: Column<Campaign>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => <span className="font-medium text-ink">{row.name}</span>,
    },
    { key: "subject", header: "Subject", hideBelow: "sm" },
    { key: "audience", header: "Audience", hideBelow: "lg" },
    { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
    {
      key: "scheduledAt",
      header: "Scheduled",
      hideBelow: "md",
      render: (row) => formatDateTime(row.scheduledAt),
    },
    {
      key: "recipients",
      header: "Recipients",
      align: "right",
      value: (row) => row.recipients,
    },
    { key: "opens", header: "Opens", align: "right", value: (row) => row.opens },
    {
      key: "clicks",
      header: "Clicks",
      align: "right",
      hideBelow: "md",
      value: (row) => row.clicks,
    },
    {
      key: "openRate",
      header: "Open rate",
      align: "right",
      value: (row) => Math.round(openRateOf(row) * 10) / 10,
      render: (row) => `${openRateOf(row).toFixed(1)}%`,
    },
  ];

  return (
    <div className="space-y-4">
      {openRateData.length > 0 && (
        <ChartCard title="Campaign performance" subtitle="Open rate by sent campaign (%)" height={240}>
          <div
            role="img"
            aria-label="Open rate by sent campaign"
            className="h-full w-full"
          >
            <CategoryBarChart data={openRateData} label="Open rate" unit="%" horizontal />
          </div>
        </ChartCard>
      )}

      <DataTable<Campaign>
        columns={columns}
        rows={rows}
        searchFields={(row) => `${row.name} ${row.subject} ${row.audience}`}
        searchPlaceholder="Search campaigns…"
        exportFilename="campaigns.csv"
        onRowClick={openEdit}
        emptyTitle="No campaigns"
        emptyDescription="Create a campaign to reach your audience."
        toolbar={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New campaign
          </Button>
        }
        filters={
          <FilterSelect
            label="Status"
            value={statusFilter}
            options={["all", ...CAMPAIGN_STATUSES]}
            onChange={setStatusFilter}
          />
        }
        rowActions={(row) => (
          <div className="flex items-center justify-end gap-1">
            {row.status !== "sent" && (
              <button
                type="button"
                aria-label={`Send campaign ${row.name} now`}
                disabled={sendingId === row.id}
                onClick={() => handleSend(row)}
                className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              aria-label={`Delete campaign ${row.name}`}
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
        title={editing ? "Edit campaign" : "New campaign"}
        description="Email campaigns are simulated — nothing leaves the browser."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create campaign"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name">
            <TextInput
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Christmas self-drive offer"
            />
          </Field>
          <Field label="Subject">
            <TextInput
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Your next Rigi-X rental, on us"
            />
          </Field>
          <Field label="Audience" hint="Recipients are matched from the segment rule.">
            <SelectInput value={audience} onChange={(event) => setAudience(event.target.value)}>
              {audience === "" && <option value="">Select audience…</option>}
              {audienceOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              {audience && !audienceOptions.includes(audience) && (
                <option value={audience}>{audience}</option>
              )}
            </SelectInput>
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Template">
              <SelectInput
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
              >
                <option value="">None</option>
                {db.emailTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Status">
              <SelectInput value={status} onChange={(event) => setStatus(event.target.value)}>
                {CAMPAIGN_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <Field label="Scheduled" hint="Leave empty to send manually.">
            <TextInput
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
          </Field>
        </div>
      </SlideOver>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete campaign"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" will be removed permanently.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) void handleDelete(deleteTarget);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

/* ============================================================== templates */

function TemplatesTab() {
  const db = useDb();
  const { toast } = useToast();
  const actor = useActor();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("promo");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  function openCreate() {
    setEditing(null);
    setName("");
    setCategory("promo");
    setSubject("");
    setBody("");
    setOpen(true);
  }

  function openEdit(template: EmailTemplate) {
    setEditing(template);
    setName(template.name);
    setCategory(template.category);
    setSubject(template.subject);
    setBody(template.body);
    setOpen(true);
  }

  async function handleSave() {
    if (!name.trim() || !subject.trim()) {
      toast({ title: "Name and subject are required", variant: "error" });
      return;
    }
    setSaving(true);
    await withLatency(null);
    const payload = {
      name: name.trim(),
      category: category as EmailTemplate["category"],
      subject: subject.trim(),
      body,
      updatedBy: actor.name,
    };
    if (editing) {
      updateRow("emailTemplates", editing.id, payload);
      logAudit({
        actorName: actor.name,
        actorId: actor.id,
        action: "updated",
        entity: "Email template",
        entityId: editing.id,
        detail: `Updated template "${payload.name}"`,
      });
      toast({ title: "Template updated", description: payload.name });
    } else {
      const row = insertRow("emailTemplates", payload);
      logAudit({
        actorName: actor.name,
        actorId: actor.id,
        action: "created",
        entity: "Email template",
        entityId: row.id,
        detail: `Created template "${payload.name}"`,
      });
      toast({ title: "Template created", description: payload.name });
    }
    setSaving(false);
    setOpen(false);
  }

  async function handleDelete(template: EmailTemplate) {
    setSaving(true);
    await withLatency(null);
    deleteRow("emailTemplates", template.id);
    logAudit({
      actorName: actor.name,
      actorId: actor.id,
      action: "deleted",
      entity: "Email template",
      entityId: template.id,
      detail: `Deleted template "${template.name}"`,
    });
    setSaving(false);
    toast({ title: "Template deleted" });
  }

  const preview = db.emailTemplates.find((template) => template.id === previewId) ?? null;

  const columns: Column<EmailTemplate>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => <span className="font-medium text-ink">{row.name}</span>,
    },
    {
      key: "category",
      header: "Category",
      render: (row) => <StatusPill status={row.category} />,
    },
    { key: "subject", header: "Subject", hideBelow: "md" },
    { key: "updatedBy", header: "Updated by", hideBelow: "lg" },
    {
      key: "updatedAt",
      header: "Updated",
      value: (row) => row.updatedAt,
      render: (row) => formatDate(new Date(row.updatedAt)),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable<EmailTemplate>
        columns={columns}
        rows={db.emailTemplates}
        searchFields={(row) => `${row.name} ${row.subject} ${row.category}`}
        searchPlaceholder="Search templates…"
        exportFilename="email-templates.csv"
        onRowClick={openEdit}
        emptyTitle="No templates"
        emptyDescription="Create a reusable email template."
        toolbar={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New template
          </Button>
        }
        rowActions={(row) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              aria-label={`Preview template ${row.name}`}
              onClick={() => setPreviewId(row.id)}
              className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label={`Delete template ${row.name}`}
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
        title={editing ? "Edit template" : "New template"}
        description="Templates use plain placeholders such as {{first_name}}."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create template"}
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
                placeholder="Booking confirmation"
              />
            </Field>
            <Field label="Category">
              <SelectInput
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {EMAIL_CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option.replace(/_/g, " ")}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <Field label="Subject">
            <TextInput
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Your Rigi-X booking {{reference}} is confirmed"
            />
          </Field>
          <Field label="Body" hint="Stored as HTML source — rendered as plain text in the preview.">
            <TextArea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={8}
              placeholder="<p>Hi {{first_name}}, …</p>"
            />
          </Field>
        </div>
      </SlideOver>

      <SlideOver
        open={!!preview}
        onClose={() => setPreviewId(null)}
        title={preview?.name ?? "Template preview"}
        description={preview ? `Category: ${preview.category.replace(/_/g, " ")}` : undefined}
        width="lg"
      >
        {preview && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted">Subject</p>
              <p className="mt-1 text-sm text-ink">{preview.subject}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Body</p>
              <pre className="mt-1 whitespace-pre-wrap break-words rounded-xl border border-line bg-mist p-3 font-mono text-xs text-ink">
                {preview.body}
              </pre>
            </div>
            <p className="text-[11px] text-muted">
              Shown as plain text on purpose — no HTML is rendered.
            </p>
          </div>
        )}
      </SlideOver>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete template"
        description={
          deleteTarget ? `"${deleteTarget.name}" will be removed permanently.` : ""
        }
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) void handleDelete(deleteTarget);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

/* ================================================================ outbox */

function OutboxTab() {
  const db = useDb();
  const { toast } = useToast();
  const actor = useActor();

  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<EmailOutbox | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleResend(message: EmailOutbox) {
    setBusyId(message.id);
    await withLatency(null);
    updateRow("emailOutbox", message.id, { status: "sent", sentAt: new Date().toISOString() });
    logAudit({
      actorName: actor.name,
      actorId: actor.id,
      action: "resent",
      entity: "Email",
      entityId: message.id,
      detail: `Resent "${message.subject}" to ${message.to}`,
    });
    setBusyId(null);
    toast({ title: "Email resent", description: message.to });
  }

  async function handleDelete(message: EmailOutbox) {
    setBusyId(message.id);
    await withLatency(null);
    deleteRow("emailOutbox", message.id);
    logAudit({
      actorName: actor.name,
      actorId: actor.id,
      action: "deleted",
      entity: "Email",
      entityId: message.id,
      detail: `Deleted outbox message "${message.subject}"`,
    });
    setBusyId(null);
    toast({ title: "Message deleted" });
  }

  const rows = db.emailOutbox.filter(
    (message) =>
      (statusFilter === "all" || message.status === statusFilter) &&
      (providerFilter === "all" || message.provider === providerFilter)
  );

  const statusData = OUTBOX_STATUSES.map((status) => ({
    label: status,
    value: db.emailOutbox.filter((message) => message.status === status).length,
  })).filter((entry) => entry.value > 0);

  const columns: Column<EmailOutbox>[] = [
    {
      key: "to",
      header: "To",
      render: (row) => <span className="font-medium text-ink">{row.to}</span>,
    },
    { key: "subject", header: "Subject", hideBelow: "sm" },
    { key: "provider", header: "Provider", hideBelow: "md" },
    { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
    {
      key: "sentAt",
      header: "Sent at",
      hideBelow: "md",
      value: (row) => row.sentAt ?? "",
      render: (row) => formatDateTime(row.sentAt),
    },
  ];

  return (
    <div className="space-y-4">
      {statusData.length > 0 && (
        <ChartCard title="Outbox by status" subtitle="Every simulated send" height={240}>
          <div role="img" aria-label="Outbox messages grouped by status" className="h-full w-full">
            <ShareDonutChart data={statusData} />
          </div>
        </ChartCard>
      )}

      <DataTable<EmailOutbox>
        columns={columns}
        rows={rows}
        searchFields={(row) => `${row.to} ${row.subject} ${row.provider} ${row.status}`}
        searchPlaceholder="Search outbox…"
        exportFilename="email-outbox.csv"
        emptyTitle="Outbox is empty"
        emptyDescription="Sent and queued emails will appear here."
        filters={
          <>
            <FilterSelect
              label="Status"
              value={statusFilter}
              options={["all", ...OUTBOX_STATUSES]}
              onChange={setStatusFilter}
            />
            <FilterSelect
              label="Provider"
              value={providerFilter}
              options={["all", ...OUTBOX_PROVIDERS]}
              onChange={setProviderFilter}
            />
          </>
        }
        rowActions={(row) => (
          <div className="flex items-center justify-end gap-1">
            {row.status === "failed" && (
              <button
                type="button"
                aria-label={`Resend email to ${row.to}`}
                disabled={busyId === row.id}
                onClick={() => handleResend(row)}
                className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink disabled:opacity-40"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              aria-label={`Delete outbox message to ${row.to}`}
              disabled={busyId === row.id}
              onClick={() => setDeleteTarget(row)}
              className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-brand disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete message"
        description={deleteTarget ? `The email to ${deleteTarget.to} will be removed.` : ""}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) void handleDelete(deleteTarget);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

/* ============================================================== segments */

function SegmentsTab() {
  const db = useDb();
  const { toast } = useToast();
  const actor = useActor();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Segment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Segment | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rule, setRule] = useState("");
  const [members, setMembers] = useState("0");

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setRule("");
    setMembers("0");
    setOpen(true);
  }

  function openEdit(segment: Segment) {
    setEditing(segment);
    setName(segment.name);
    setDescription(segment.description);
    setRule(segment.rule);
    setMembers(String(segment.members));
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
      description: description.trim(),
      rule: rule.trim(),
      members: Number(members) || 0,
    };
    if (editing) {
      updateRow("segments", editing.id, payload);
      logAudit({
        actorName: actor.name,
        actorId: actor.id,
        action: "updated",
        entity: "Segment",
        entityId: editing.id,
        detail: `Updated segment "${payload.name}"`,
      });
      toast({ title: "Segment updated", description: payload.name });
    } else {
      const row = insertRow("segments", payload);
      logAudit({
        actorName: actor.name,
        actorId: actor.id,
        action: "created",
        entity: "Segment",
        entityId: row.id,
        detail: `Created segment "${payload.name}"`,
      });
      toast({ title: "Segment created", description: payload.name });
    }
    setSaving(false);
    setOpen(false);
  }

  async function handleDelete(segment: Segment) {
    setSaving(true);
    await withLatency(null);
    deleteRow("segments", segment.id);
    logAudit({
      actorName: actor.name,
      actorId: actor.id,
      action: "deleted",
      entity: "Segment",
      entityId: segment.id,
      detail: `Deleted segment "${segment.name}"`,
    });
    setSaving(false);
    toast({ title: "Segment deleted" });
  }

  const columns: Column<Segment>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => <span className="font-medium text-ink">{row.name}</span>,
    },
    { key: "description", header: "Description", hideBelow: "sm" },
    {
      key: "rule",
      header: "Rule",
      hideBelow: "md",
      render: (row) => <code className="rounded bg-mist px-1.5 py-0.5 text-xs text-ink">{row.rule}</code>,
    },
    { key: "members", header: "Members", align: "right", value: (row) => row.members },
  ];

  return (
    <div className="space-y-4">
      <DataTable<Segment>
        columns={columns}
        rows={db.segments}
        searchFields={(row) => `${row.name} ${row.description} ${row.rule}`}
        searchPlaceholder="Search segments…"
        exportFilename="segments.csv"
        onRowClick={openEdit}
        emptyTitle="No segments"
        emptyDescription="Group customers to target campaigns."
        toolbar={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New segment
          </Button>
        }
        rowActions={(row) => (
          <button
            type="button"
            aria-label={`Delete segment ${row.name}`}
            onClick={() => setDeleteTarget(row)}
            className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-brand"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      />

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit segment" : "New segment"}
        description="Segments describe an audience rule used by campaigns."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create segment"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name">
            <TextInput
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Repeat renters"
            />
          </Field>
          <Field label="Description">
            <TextInput
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Customers with more than 3 completed rentals"
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Rule" hint="A short machine-readable expression.">
              <TextInput
                value={rule}
                onChange={(event) => setRule(event.target.value)}
                placeholder="rentals > 3"
              />
            </Field>
            <Field label="Members">
              <TextInput
                type="number"
                min={0}
                value={members}
                onChange={(event) => setMembers(event.target.value)}
              />
            </Field>
          </div>
        </div>
      </SlideOver>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete segment"
        description={deleteTarget ? `"${deleteTarget.name}" will be removed permanently.` : ""}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) void handleDelete(deleteTarget);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

/* ================================================================ promos */

function PromosTab() {
  const db = useDb();
  const { toast } = useToast();
  const actor = useActor();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PromoCode | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState("");
  const [kind, setKind] = useState("percent");
  const [value, setValue] = useState("0");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [usageLimit, setUsageLimit] = useState("100");
  const [used, setUsed] = useState("0");
  const [active, setActive] = useState(true);

  function openCreate() {
    setEditing(null);
    setCode("");
    setKind("percent");
    setValue("0");
    setStartsAt(new Date().toISOString().slice(0, 10));
    setExpiresAt("");
    setUsageLimit("100");
    setUsed("0");
    setActive(true);
    setOpen(true);
  }

  function openEdit(promo: PromoCode) {
    setEditing(promo);
    setCode(promo.code);
    setKind(promo.kind);
    setValue(String(promo.value));
    setStartsAt(promo.startsAt.slice(0, 10));
    setExpiresAt(promo.expiresAt.slice(0, 10));
    setUsageLimit(String(promo.usageLimit));
    setUsed(String(promo.used));
    setActive(promo.active);
    setOpen(true);
  }

  async function handleSave() {
    if (!code.trim() || !startsAt || !expiresAt) {
      toast({ title: "Code, start and expiry dates are required", variant: "error" });
      return;
    }
    setSaving(true);
    await withLatency(null);
    const payload = {
      code: code.trim().toUpperCase(),
      kind: kind as PromoCode["kind"],
      value: Number(value) || 0,
      startsAt,
      expiresAt,
      usageLimit: Number(usageLimit) || 0,
      used: Number(used) || 0,
      active,
    };
    if (editing) {
      updateRow("promoCodes", editing.id, payload);
      logAudit({
        actorName: actor.name,
        actorId: actor.id,
        action: "updated",
        entity: "Promo code",
        entityId: editing.id,
        detail: `Updated promo ${payload.code}`,
      });
      toast({ title: "Promo code updated", description: payload.code });
    } else {
      const row = insertRow("promoCodes", payload);
      logAudit({
        actorName: actor.name,
        actorId: actor.id,
        action: "created",
        entity: "Promo code",
        entityId: row.id,
        detail: `Created promo ${payload.code}`,
      });
      toast({ title: "Promo code created", description: payload.code });
    }
    setSaving(false);
    setOpen(false);
  }

  async function handleToggle(promo: PromoCode) {
    setBusyId(promo.id);
    await withLatency(null);
    updateRow("promoCodes", promo.id, { active: !promo.active });
    logAudit({
      actorName: actor.name,
      actorId: actor.id,
      action: promo.active ? "disabled" : "enabled",
      entity: "Promo code",
      entityId: promo.id,
      detail: `${promo.active ? "Disabled" : "Enabled"} promo ${promo.code}`,
    });
    setBusyId(null);
    toast({ title: promo.active ? "Promo disabled" : "Promo enabled", description: promo.code });
  }

  async function handleDelete(promo: PromoCode) {
    setSaving(true);
    await withLatency(null);
    deleteRow("promoCodes", promo.id);
    logAudit({
      actorName: actor.name,
      actorId: actor.id,
      action: "deleted",
      entity: "Promo code",
      entityId: promo.id,
      detail: `Deleted promo ${promo.code}`,
    });
    setSaving(false);
    toast({ title: "Promo code deleted" });
  }

  const columns: Column<PromoCode>[] = [
    {
      key: "code",
      header: "Code",
      render: (row) => <span className="font-mono text-xs font-medium text-ink">{row.code}</span>,
    },
    { key: "kind", header: "Kind", render: (row) => <StatusPill status={row.kind} /> },
    {
      key: "value",
      header: "Value",
      value: (row) => row.value,
      render: (row) => (row.kind === "percent" ? `${row.value}%` : formatGHS(row.value)),
    },
    {
      key: "startsAt",
      header: "Starts",
      hideBelow: "md",
      value: (row) => row.startsAt,
      render: (row) => formatDate(new Date(row.startsAt)),
    },
    {
      key: "expiresAt",
      header: "Expires",
      hideBelow: "md",
      value: (row) => row.expiresAt,
      render: (row) => formatDate(new Date(row.expiresAt)),
    },
    {
      key: "usage",
      header: "Used / limit",
      align: "right",
      value: (row) => row.used,
      render: (row) => `${row.used} / ${row.usageLimit}`,
    },
    {
      key: "active",
      header: "Active",
      render: (row) => <StatusPill status={row.active ? "active" : "disabled"} />,
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable<PromoCode>
        columns={columns}
        rows={db.promoCodes}
        searchFields={(row) => `${row.code} ${row.kind}`}
        searchPlaceholder="Search promo codes…"
        exportFilename="promo-codes.csv"
        onRowClick={openEdit}
        emptyTitle="No promo codes"
        emptyDescription="Create a code to run a discount."
        toolbar={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New promo code
          </Button>
        }
        rowActions={(row) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              aria-label={`${row.active ? "Disable" : "Enable"} promo ${row.code}`}
              disabled={busyId === row.id}
              onClick={() => handleToggle(row)}
              className="rounded-lg border border-line px-2 py-1.5 text-[11px] font-medium text-muted transition-colors hover:text-ink disabled:opacity-40"
            >
              {row.active ? "Disable" : "Enable"}
            </button>
            <button
              type="button"
              aria-label={`Delete promo ${row.code}`}
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
        title={editing ? "Edit promo code" : "New promo code"}
        description="Codes are upper-cased automatically."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create promo code"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Code">
              <TextInput
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="ONLINE15"
              />
            </Field>
            <Field label="Kind">
              <SelectInput value={kind} onChange={(event) => setKind(event.target.value)}>
                {PROMO_KINDS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Value" hint={kind === "percent" ? "Percentage off." : "Fixed amount in GHS."}>
              <TextInput
                type="number"
                min={0}
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
            </Field>
            <Field label="Usage limit">
              <TextInput
                type="number"
                min={0}
                value={usageLimit}
                onChange={(event) => setUsageLimit(event.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Starts">
              <TextInput
                type="date"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </Field>
            <Field label="Expires">
              <TextInput
                type="date"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Times used">
              <TextInput
                type="number"
                min={0}
                value={used}
                onChange={(event) => setUsed(event.target.value)}
              />
            </Field>
            <div className="flex items-end pb-2">
              <Checkbox
                label="Active"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />
            </div>
          </div>
        </div>
      </SlideOver>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete promo code"
        description={deleteTarget ? `"${deleteTarget.code}" will be removed permanently.` : ""}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) void handleDelete(deleteTarget);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

/* =============================================================== content */

function ContentTab() {
  const db = useDb();
  const { toast } = useToast();
  const actor = useActor();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContentItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState("email");
  const [publishAt, setPublishAt] = useState("");
  const [status, setStatus] = useState("idea");
  const [owner, setOwner] = useState("");

  function openCreate() {
    setEditing(null);
    setTitle("");
    setChannel("email");
    setPublishAt(new Date().toISOString().slice(0, 10));
    setStatus("idea");
    setOwner(actor.name);
    setOpen(true);
  }

  function openEdit(item: ContentItem) {
    setEditing(item);
    setTitle(item.title);
    setChannel(item.channel);
    setPublishAt(item.publishAt.slice(0, 10));
    setStatus(item.status);
    setOwner(item.owner);
    setOpen(true);
  }

  async function handleSave() {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "error" });
      return;
    }
    setSaving(true);
    await withLatency(null);
    const payload = {
      title: title.trim(),
      channel: channel as ContentItem["channel"],
      publishAt,
      status: status as ContentItem["status"],
      owner: owner.trim() || actor.name,
    };
    if (editing) {
      updateRow("contentItems", editing.id, payload);
      logAudit({
        actorName: actor.name,
        actorId: actor.id,
        action: "updated",
        entity: "Content",
        entityId: editing.id,
        detail: `Updated content "${payload.title}"`,
      });
      toast({ title: "Content updated", description: payload.title });
    } else {
      const row = insertRow("contentItems", payload);
      logAudit({
        actorName: actor.name,
        actorId: actor.id,
        action: "created",
        entity: "Content",
        entityId: row.id,
        detail: `Created content "${payload.title}"`,
      });
      toast({ title: "Content created", description: payload.title });
    }
    setSaving(false);
    setOpen(false);
  }

  async function handleStatus(item: ContentItem, next: string) {
    setBusyId(item.id);
    await withLatency(null);
    updateRow("contentItems", item.id, { status: next as ContentItem["status"] });
    logAudit({
      actorName: actor.name,
      actorId: actor.id,
      action: "updated",
      entity: "Content",
      entityId: item.id,
      detail: `Moved "${item.title}" to ${next}`,
    });
    setBusyId(null);
  }

  async function handleDelete(item: ContentItem) {
    setSaving(true);
    await withLatency(null);
    deleteRow("contentItems", item.id);
    logAudit({
      actorName: actor.name,
      actorId: actor.id,
      action: "deleted",
      entity: "Content",
      entityId: item.id,
      detail: `Deleted content "${item.title}"`,
    });
    setSaving(false);
    toast({ title: "Content deleted" });
  }

  const groups = CONTENT_STATUSES.map((columnStatus) => ({
    status: columnStatus,
    items: db.contentItems.filter((item) => item.status === columnStatus),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{db.contentItems.length} content ideas in the pipeline.</p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New content
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {groups.map((group) => (
          <AdminCard
            key={group.status}
            title={group.status.replace(/\b\w/g, (char) => char.toUpperCase())}
            description={`${group.items.length} item${group.items.length === 1 ? "" : "s"}`}
          >
            <div className="space-y-3">
              {group.items.length === 0 && (
                <p className="py-6 text-center text-xs text-muted">Nothing here yet.</p>
              )}
              {group.items.map((item) => (
                <div key={item.id} className="rounded-xl border border-line p-3">
                  <p className="text-sm font-medium text-ink">{item.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusPill status={item.channel} />
                    <span className="text-[11px] text-muted">{item.publishAt}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">Owner: {item.owner}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <SelectInput
                      value={item.status}
                      aria-label={`Status for ${item.title}`}
                      onChange={(event) => handleStatus(item, event.target.value)}
                      className="py-1.5 text-xs"
                    >
                      {CONTENT_STATUSES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </SelectInput>
                    <button
                      type="button"
                      aria-label={`Edit content ${item.title}`}
                      onClick={() => openEdit(item)}
                      className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete content ${item.title}`}
                      disabled={busyId === item.id}
                      onClick={() => setDeleteTarget(item)}
                      className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-brand disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>
        ))}
      </div>

      <SlideOver
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit content" : "New content"}
        description="Plan a blog post, email or social update."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create content"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Title">
            <TextInput
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Top 5 weekend getaways from Accra"
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Channel">
              <SelectInput value={channel} onChange={(event) => setChannel(event.target.value)}>
                {CONTENT_CHANNELS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Status">
              <SelectInput value={status} onChange={(event) => setStatus(event.target.value)}>
                {CONTENT_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Publish at">
              <TextInput
                type="date"
                value={publishAt}
                onChange={(event) => setPublishAt(event.target.value)}
              />
            </Field>
            <Field label="Owner">
              <TextInput
                value={owner}
                onChange={(event) => setOwner(event.target.value)}
                placeholder="Marketing owner"
              />
            </Field>
          </div>
        </div>
      </SlideOver>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete content"
        description={deleteTarget ? `"${deleteTarget.title}" will be removed.` : ""}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) void handleDelete(deleteTarget);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

/* ================================================================== page */

export default function AdminMarketingPage() {
  const db = useDb();
  const initialised = useRef(false);
  const [tab, setTab] = useState("campaigns");

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
    { id: "campaigns", label: "Campaigns", count: db.campaigns.length },
    { id: "templates", label: "Templates", count: db.emailTemplates.length },
    { id: "outbox", label: "Outbox", count: db.emailOutbox.length },
    { id: "segments", label: "Segments", count: db.segments.length },
    { id: "promos", label: "Promo codes", count: db.promoCodes.length },
    { id: "content", label: "Content", count: db.contentItems.length },
  ];

  const activeCampaigns = db.campaigns.filter(
    (campaign) => campaign.status === "scheduled" || campaign.status === "sent"
  ).length;
  const emailsSent = db.emailOutbox.filter((message) => message.status === "sent").length;
  const totals = db.campaigns
    .filter((campaign) => campaign.status === "sent")
    .reduce(
      (acc, campaign) => ({
        opens: acc.opens + campaign.opens,
        recipients: acc.recipients + campaign.recipients,
      }),
      { opens: 0, recipients: 0 }
    );
  const openRate = totals.recipients ? (totals.opens / totals.recipients) * 100 : 0;
  const activePromos = db.promoCodes.filter((promo) => promo.active).length;

  return (
    <>
      <PageHeader
        title="Marketing"
        description="Campaigns, templates, audiences, promo codes and the content board."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Active campaigns"
          value={String(activeCampaigns)}
          sub="Scheduled or sent"
          icon={Megaphone}
        />
        <KpiCard
          label="Emails sent"
          value={String(emailsSent)}
          sub="Across every simulated send"
          icon={Mail}
          tone="positive"
        />
        <KpiCard
          label="Average open rate"
          value={`${openRate.toFixed(1)}%`}
          sub="Sent campaigns only"
          icon={MailOpen}
        />
        <KpiCard
          label="Active promo codes"
          value={String(activePromos)}
          sub="Currently redeemable"
          icon={Tag}
        />
      </div>

      <div className="mt-5">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      {tab === "campaigns" && <CampaignsTab />}
      {tab === "templates" && <TemplatesTab />}
      {tab === "outbox" && <OutboxTab />}
      {tab === "segments" && <SegmentsTab />}
      {tab === "promos" && <PromosTab />}
      {tab === "content" && <ContentTab />}
    </>
  );
}
