"use client";

// Customer service: support tickets with a live conversation thread, customer
// reviews moderation and the public FAQ library. Reads/writes the in-browser
// mock store, so every action re-renders subscribers immediately.

import { useState } from "react";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  LifeBuoy,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  Star,
  Trash2,
} from "lucide-react";
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
import type { FaqArticle, Review, Ticket } from "@/lib/mock/types";
import { cn, formatDate } from "@/lib/utils";

const STATUSES = ["open", "pending", "resolved", "closed"] as const;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
const CHANNELS = ["whatsapp", "email", "phone", "web"] as const;
const CATEGORIES = ["booking", "payment", "vehicle", "damage", "general"] as const;

/* --------------------------------------------------------------- helpers */

function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn("h-3.5 w-3.5", index < rating ? "text-amber-500" : "text-line")}
          fill={index < rating ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

function Detail({
  label,
  value,
  node,
}: {
  label: string;
  value?: string;
  node?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line p-2.5">
      <p className="text-[11px] text-muted">{label}</p>
      <div className="mt-0.5 truncate text-xs font-medium text-ink">
        {node ?? value ?? "—"}
      </div>
    </div>
  );
}

interface TicketForm {
  subject: string;
  customerId: string;
  channel: string;
  category: string;
  priority: string;
  summary: string;
  assigneeId: string;
  slaDueAt: string;
}

interface FaqForm {
  question: string;
  answer: string;
  category: string;
  published: boolean;
}

function emptyTicketForm(): TicketForm {
  return {
    subject: "",
    customerId: "",
    channel: "email",
    category: "general",
    priority: "normal",
    summary: "",
    assigneeId: "",
    slaDueAt: toLocalInput(new Date(Date.now() + 86_400_000).toISOString()),
  };
}

function emptyFaqForm(): FaqForm {
  return { question: "", answer: "", category: "Booking", published: false };
}

type DeleteTarget = {
  collection: "tickets" | "reviews" | "faqs";
  id: string;
  label: string;
};

/* ----------------------------------------------------------------- page */

export default function AdminSupportPage() {
  const db = useDb();
  const { toast } = useToast();
  const session = useOptionalAdminSession();
  const actorName = session?.session.name ?? "Support";
  const actorId = session?.session.userId;
  const canDelete = session ? hasCapability(session.role, "delete_records") : false;

  const [tab, setTab] = useState("tickets");

  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [patching, setPatching] = useState(false);

  const [replyBody, setReplyBody] = useState("");
  const [replyInternal, setReplyInternal] = useState(false);
  const [sending, setSending] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState<TicketForm>(emptyTicketForm);
  const [creating, setCreating] = useState(false);

  const [faqOpen, setFaqOpen] = useState(false);
  const [faqEditingId, setFaqEditingId] = useState<string | null>(null);
  const [faqForm, setFaqForm] = useState<FaqForm>(emptyFaqForm);
  const [savingFaq, setSavingFaq] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<DeleteTarget | null>(null);

  /* ------------------------------------------------------------ lookups */

  const customerName = (id: string) =>
    db.customers.find((customer) => customer.id === id)?.name ?? "Guest";
  const vehicleName = (id: string | null) =>
    id ? db.vehicles.find((vehicle) => vehicle.id === id)?.name ?? "—" : "—";
  const staffName = (id: string | null) =>
    id ? db.staff.find((member) => member.id === id)?.name ?? "Unassigned" : "Unassigned";

  const nextReference = () => {
    const numbers = db.tickets
      .map((ticket) => Number(ticket.reference.replace(/\D/g, "")))
      .filter((value) => Number.isFinite(value));
    const max = numbers.length ? Math.max(...numbers) : 1000;
    return `TKT-${max + 1}`;
  };

  /* -------------------------------------------------------------- state */

  const openCount = db.tickets.filter(
    (ticket) => ticket.status === "open" || ticket.status === "pending"
  ).length;
  const urgentCount = db.tickets.filter(
    (ticket) => ticket.priority === "urgent" || ticket.priority === "high"
  ).length;
  const unpublishedCount = db.reviews.filter((review) => !review.approved).length;
  const averageRating = db.reviews.length
    ? db.reviews.reduce((sum, review) => sum + review.rating, 0) / db.reviews.length
    : 0;

  const tabs: TabDef[] = [
    { id: "tickets", label: "Tickets", count: openCount },
    { id: "reviews", label: "Reviews", count: unpublishedCount },
    { id: "faqs", label: "FAQs" },
  ];

  const ticketRows = db.tickets.filter(
    (ticket) =>
      (statusFilter === "all" || ticket.status === statusFilter) &&
      (priorityFilter === "all" || ticket.priority === priorityFilter)
  );

  const selectedTicket = db.tickets.find((ticket) => ticket.id === selectedTicketId);
  const messages = selectedTicket
    ? db.ticketMessages
        .filter((message) => message.ticketId === selectedTicket.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    : [];

  /* ------------------------------------------------------------ actions */

  async function patchTicket(patch: Partial<Ticket>, detail: string) {
    if (!selectedTicket) return;
    setPatching(true);
    await withLatency(null, 400);
    updateRow("tickets", selectedTicket.id, patch);
    logAudit({
      actorName,
      actorId,
      action: "updated",
      entity: "Support ticket",
      entityId: selectedTicket.reference,
      detail,
    });
    toast({ title: "Ticket updated", description: detail, variant: "success" });
    setPatching(false);
  }

  async function sendReply() {
    if (!selectedTicket) return;
    if (!replyBody.trim()) {
      toast({ title: "Add a message", description: "Write a reply first.", variant: "error" });
      return;
    }
    setSending(true);
    await withLatency(null, 450);
    insertRow("ticketMessages", {
      ticketId: selectedTicket.id,
      author: actorName,
      internal: replyInternal,
      body: replyBody.trim(),
    });
    logAudit({
      actorName,
      actorId,
      action: "replied",
      entity: "Support ticket",
      entityId: selectedTicket.reference,
      detail: replyInternal ? "Added an internal note" : "Replied to the customer",
    });
    toast({
      title: replyInternal ? "Internal note added" : "Reply sent",
      variant: "success",
    });
    setReplyBody("");
    setReplyInternal(false);
    setSending(false);
  }

  async function createTicket() {
    if (!ticketForm.subject.trim() || !ticketForm.customerId) {
      toast({
        title: "Missing details",
        description: "A subject and customer are required.",
        variant: "error",
      });
      return;
    }
    setCreating(true);
    await withLatency(null, 500);
    const slaDate = new Date(ticketForm.slaDueAt);
    const row = insertRow("tickets", {
      reference: nextReference(),
      subject: ticketForm.subject.trim(),
      customerId: ticketForm.customerId,
      channel: ticketForm.channel as Ticket["channel"],
      status: "open",
      priority: ticketForm.priority as Ticket["priority"],
      assigneeId: ticketForm.assigneeId || null,
      slaDueAt: Number.isNaN(slaDate.getTime())
        ? new Date(Date.now() + 86_400_000).toISOString()
        : slaDate.toISOString(),
      category: ticketForm.category as Ticket["category"],
      summary: ticketForm.summary.trim(),
    });
    logAudit({
      actorName,
      actorId,
      action: "created",
      entity: "Support ticket",
      entityId: row.reference,
      detail: `Opened ticket "${row.subject}"`,
    });
    toast({ title: "Ticket created", description: row.reference, variant: "success" });
    setCreating(false);
    setCreateOpen(false);
    setTicketForm(emptyTicketForm());
  }

  async function toggleReview(review: Review) {
    await withLatency(null, 350);
    const nextApproved = !review.approved;
    updateRow("reviews", review.id, {
      approved: nextApproved,
      publishedAt: nextApproved ? new Date().toISOString() : null,
    });
    const detail = nextApproved ? "Published a review" : "Unpublished a review";
    logAudit({
      actorName,
      actorId,
      action: "updated",
      entity: "Review",
      entityId: review.id,
      detail,
    });
    toast({ title: detail, variant: "success" });
  }

  async function saveFaq() {
    if (!faqForm.question.trim() || !faqForm.answer.trim()) {
      toast({
        title: "Missing details",
        description: "Question and answer are required.",
        variant: "error",
      });
      return;
    }
    setSavingFaq(true);
    await withLatency(null, 450);
    if (faqEditingId) {
      updateRow("faqs", faqEditingId, {
        question: faqForm.question.trim(),
        answer: faqForm.answer.trim(),
        category: faqForm.category.trim() || "General",
        published: faqForm.published,
      });
      logAudit({
        actorName,
        actorId,
        action: "updated",
        entity: "FAQ",
        entityId: faqEditingId,
        detail: "Updated an FAQ article",
      });
      toast({ title: "FAQ updated", variant: "success" });
    } else {
      insertRow("faqs", {
        question: faqForm.question.trim(),
        answer: faqForm.answer.trim(),
        category: faqForm.category.trim() || "General",
        published: faqForm.published,
        views: 0,
      });
      logAudit({
        actorName,
        actorId,
        action: "created",
        entity: "FAQ",
        detail: "Created an FAQ article",
      });
      toast({ title: "FAQ created", variant: "success" });
    }
    setSavingFaq(false);
    setFaqOpen(false);
    setFaqEditingId(null);
    setFaqForm(emptyFaqForm());
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { collection, id, label } = pendingDelete;
    await withLatency(null, 350);
    deleteRow(collection, id);
    logAudit({ actorName, actorId, action: "deleted", entity: label });
    toast({ title: "Deleted", description: label, variant: "success" });
  }

  function openCreateFaq() {
    setFaqEditingId(null);
    setFaqForm(emptyFaqForm());
    setFaqOpen(true);
  }

  function openEditFaq(faq: FaqArticle) {
    setFaqEditingId(faq.id);
    setFaqForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      published: faq.published,
    });
    setFaqOpen(true);
  }

  /* ------------------------------------------------------------ columns */

  const ticketColumns: Column<Ticket>[] = [
    { key: "reference", header: "Reference", value: (ticket) => ticket.reference },
    {
      key: "subject",
      header: "Subject",
      render: (ticket) => (
        <span className="block max-w-[220px] truncate font-medium text-ink">
          {ticket.subject}
        </span>
      ),
      value: (ticket) => ticket.subject,
    },
    {
      key: "customer",
      header: "Customer",
      render: (ticket) => customerName(ticket.customerId),
      value: (ticket) => customerName(ticket.customerId),
      hideBelow: "md",
    },
    { key: "channel", header: "Channel", hideBelow: "lg" },
    {
      key: "category",
      header: "Category",
      render: (ticket) => <span className="capitalize">{ticket.category}</span>,
      value: (ticket) => ticket.category,
      hideBelow: "lg",
    },
    {
      key: "priority",
      header: "Priority",
      render: (ticket) => <StatusPill status={ticket.priority} />,
      value: (ticket) => ticket.priority,
    },
    {
      key: "status",
      header: "Status",
      render: (ticket) => <StatusPill status={ticket.status} />,
      value: (ticket) => ticket.status,
    },
    {
      key: "assignee",
      header: "Assignee",
      render: (ticket) => staffName(ticket.assigneeId),
      value: (ticket) => staffName(ticket.assigneeId),
      hideBelow: "md",
    },
    {
      key: "slaDueAt",
      header: "SLA due",
      render: (ticket) => {
        const overdue = new Date(ticket.slaDueAt).getTime() < Date.now();
        return (
          <span className={overdue ? "font-medium text-brand" : "text-muted"}>
            {formatDate(new Date(ticket.slaDueAt))}
          </span>
        );
      },
      value: (ticket) => ticket.slaDueAt,
      hideBelow: "sm",
    },
  ];

  const reviewColumns: Column<Review>[] = [
    {
      key: "customer",
      header: "Customer",
      render: (review) => customerName(review.customerId),
      value: (review) => customerName(review.customerId),
    },
    {
      key: "vehicle",
      header: "Vehicle",
      render: (review) => vehicleName(review.vehicleId),
      value: (review) => vehicleName(review.vehicleId),
      hideBelow: "md",
    },
    {
      key: "rating",
      header: "Rating",
      render: (review) => <Stars rating={review.rating} />,
      value: (review) => review.rating,
    },
    { key: "title", header: "Title", hideBelow: "md" },
    {
      key: "body",
      header: "Review",
      render: (review) => (
        <span className="block max-w-[240px] truncate text-muted">{review.body}</span>
      ),
      value: (review) => review.body,
      hideBelow: "lg",
    },
    {
      key: "published",
      header: "Published",
      render: (review) => (
        <StatusPill status={review.approved ? "published" : "draft"} />
      ),
      value: (review) => (review.approved ? "published" : "draft"),
    },
  ];

  const faqColumns: Column<FaqArticle>[] = [
    {
      key: "question",
      header: "Question",
      render: (faq) => (
        <span className="block max-w-[320px] truncate font-medium text-ink">{faq.question}</span>
      ),
      value: (faq) => faq.question,
    },
    { key: "category", header: "Category", hideBelow: "md" },
    {
      key: "published",
      header: "Published",
      render: (faq) => <StatusPill status={faq.published ? "published" : "draft"} />,
      value: (faq) => (faq.published ? "published" : "draft"),
    },
    { key: "views", header: "Views", align: "right", value: (faq) => faq.views },
  ];

  const headerAction =
    tab === "tickets" ? (
      <Button className="gap-1.5" onClick={() => setCreateOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        New ticket
      </Button>
    ) : tab === "faqs" ? (
      <Button className="gap-1.5" onClick={openCreateFaq}>
        <Plus className="h-3.5 w-3.5" />
        New FAQ
      </Button>
    ) : undefined;

  return (
    <>
      <PageHeader
        title="Customer Service"
        description="Tickets, guest reviews and the public FAQ library."
        actions={headerAction}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Open tickets"
          value={String(openCount)}
          sub="Open or pending"
          icon={LifeBuoy}
        />
        <KpiCard
          label="Urgent or high"
          value={String(urgentCount)}
          sub="Need fast attention"
          icon={AlertTriangle}
          tone={urgentCount ? "danger" : "neutral"}
        />
        <KpiCard
          label="Average rating"
          value={`${averageRating.toFixed(1)} ★`}
          sub={`${db.reviews.length} reviews`}
          icon={Star}
          tone="positive"
        />
        <KpiCard
          label="Unpublished reviews"
          value={String(unpublishedCount)}
          sub="Awaiting moderation"
          icon={MessageSquare}
          tone={unpublishedCount ? "warning" : "neutral"}
        />
      </div>

      <div className="mt-6">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      {tab === "tickets" && (
        <DataTable<Ticket>
          columns={ticketColumns}
          rows={ticketRows}
          searchFields={(ticket) =>
            `${ticket.reference} ${ticket.subject} ${customerName(ticket.customerId)}`
          }
          searchPlaceholder="Search tickets…"
          exportFilename="support-tickets.csv"
          initialSort={{ key: "slaDueAt", dir: "asc" }}
          onRowClick={(ticket) => setSelectedTicketId(ticket.id)}
          emptyTitle="No tickets"
          emptyDescription="Create a ticket to start tracking a customer request."
          emptyAction={
            <Button className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              New ticket
            </Button>
          }
          filters={
            <>
              <FilterSelect
                label="Status"
                value={statusFilter}
                options={["all", ...STATUSES]}
                onChange={setStatusFilter}
              />
              <FilterSelect
                label="Priority"
                value={priorityFilter}
                options={["all", ...PRIORITIES]}
                onChange={setPriorityFilter}
              />
            </>
          }
        />
      )}

      {tab === "reviews" && (
        <DataTable<Review>
          columns={reviewColumns}
          rows={db.reviews}
          searchFields={(review) =>
            `${customerName(review.customerId)} ${vehicleName(review.vehicleId)} ${review.title}`
          }
          searchPlaceholder="Search reviews…"
          exportFilename="support-reviews.csv"
          emptyTitle="No reviews yet"
          emptyDescription="Published guest reviews appear here."
          rowActions={(review) => (
            <>
              <button
                type="button"
                aria-label={review.approved ? "Unpublish review" : "Publish review"}
                onClick={() => toggleReview(review)}
                className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink"
              >
                {review.approved ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
              {canDelete && (
                <button
                  type="button"
                  aria-label="Delete review"
                  onClick={() =>
                    setPendingDelete({
                      collection: "reviews",
                      id: review.id,
                      label: `review from ${customerName(review.customerId)}`,
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

      {tab === "faqs" && (
        <DataTable<FaqArticle>
          columns={faqColumns}
          rows={db.faqs}
          searchFields={(faq) => `${faq.question} ${faq.category}`}
          searchPlaceholder="Search FAQs…"
          exportFilename="support-faqs.csv"
          emptyTitle="No FAQs"
          emptyDescription="Add an article to answer common questions."
          emptyAction={
            <Button className="gap-1.5" onClick={openCreateFaq}>
              <Plus className="h-3.5 w-3.5" />
              New FAQ
            </Button>
          }
          rowActions={(faq) => (
            <>
              <button
                type="button"
                aria-label={`Edit ${faq.question}`}
                onClick={() => openEditFaq(faq)}
                className="rounded-lg border border-line p-1.5 text-muted transition-colors hover:text-ink"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {canDelete && (
                <button
                  type="button"
                  aria-label={`Delete ${faq.question}`}
                  onClick={() =>
                    setPendingDelete({
                      collection: "faqs",
                      id: faq.id,
                      label: `FAQ "${faq.question}"`,
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

      {/* ------------------------------------------------ ticket detail */}
      <SlideOver
        open={!!selectedTicket}
        onClose={() => {
          setSelectedTicketId(null);
          setReplyBody("");
          setReplyInternal(false);
        }}
        title={selectedTicket?.reference ?? "Ticket"}
        description={selectedTicket?.subject}
        width="lg"
        footer={
          selectedTicket ? (
            <div className="flex w-full flex-wrap items-end gap-3">
              <Field label="Status" className="min-w-[140px]">
                <SelectInput
                  value={selectedTicket.status}
                  disabled={patching}
                  onChange={(event) =>
                    patchTicket(
                      { status: event.target.value as Ticket["status"] },
                      `Status set to ${event.target.value}`
                    )
                  }
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Priority" className="min-w-[140px]">
                <SelectInput
                  value={selectedTicket.priority}
                  disabled={patching}
                  onChange={(event) =>
                    patchTicket(
                      { priority: event.target.value as Ticket["priority"] },
                      `Priority set to ${event.target.value}`
                    )
                  }
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Assignee" className="min-w-[160px]">
                <SelectInput
                  value={selectedTicket.assigneeId ?? ""}
                  disabled={patching}
                  onChange={(event) =>
                    patchTicket(
                      { assigneeId: event.target.value || null },
                      event.target.value
                        ? `Assigned to ${staffName(event.target.value)}`
                        : "Unassigned"
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
              {canDelete && (
                <div className="ml-auto">
                  <Button
                    variant="ghost"
                    className="gap-1.5"
                    onClick={() =>
                      setPendingDelete({
                        collection: "tickets",
                        id: selectedTicket.id,
                        label: `ticket ${selectedTicket.reference}`,
                      })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          ) : undefined
        }
      >
        {selectedTicket && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Detail label="Customer" value={customerName(selectedTicket.customerId)} />
              <Detail label="Channel" value={selectedTicket.channel} />
              <Detail label="Category" value={selectedTicket.category} />
              <Detail
                label="Priority"
                node={<StatusPill status={selectedTicket.priority} />}
              />
              <Detail label="Status" node={<StatusPill status={selectedTicket.status} />} />
              <Detail label="SLA due" value={formatDate(new Date(selectedTicket.slaDueAt))} />
              <Detail label="Assignee" value={staffName(selectedTicket.assigneeId)} />
              <Detail label="Opened" value={formatDate(new Date(selectedTicket.createdAt))} />
            </div>

            {selectedTicket.summary && (
              <p className="rounded-xl bg-mist p-3 text-xs text-ink">{selectedTicket.summary}</p>
            )}

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Conversation
              </h3>
              <ul className="space-y-3">
                {messages.map((message) => (
                  <li
                    key={message.id}
                    className={cn(
                      "rounded-xl border p-3",
                      message.internal ? "border-amber-200 bg-amber-50/60" : "border-line bg-white"
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-medium text-ink">{message.author}</span>
                      <span className="text-[11px] text-muted">
                        {new Date(message.createdAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {message.internal && (
                      <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        Internal note
                      </span>
                    )}
                    <p className="mt-1.5 whitespace-pre-wrap text-xs text-ink">{message.body}</p>
                  </li>
                ))}
                {messages.length === 0 && (
                  <li className="text-xs text-muted">No messages on this ticket yet.</li>
                )}
              </ul>
            </div>

            <div className="rounded-xl border border-line p-3">
              <Field label="Reply">
                <TextArea
                  value={replyBody}
                  onChange={(event) => setReplyBody(event.target.value)}
                  placeholder="Write a reply to the customer…"
                />
              </Field>
              <div className="mt-2 flex items-center justify-between gap-3">
                <Checkbox
                  label="Internal note"
                  checked={replyInternal}
                  onChange={(event) => setReplyInternal(event.target.checked)}
                />
                <Button className="gap-1.5" onClick={sendReply} disabled={sending}>
                  <Send className="h-3.5 w-3.5" />
                  {sending ? "Sending…" : "Send"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </SlideOver>

      {/* -------------------------------------------------- create ticket */}
      <SlideOver
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New ticket"
        description="Log a customer request and set its service level."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button className="gap-1.5" onClick={createTicket} disabled={creating}>
              <Plus className="h-3.5 w-3.5" />
              {creating ? "Creating…" : "Create ticket"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Subject">
            <TextInput
              value={ticketForm.subject}
              onChange={(event) =>
                setTicketForm((prev) => ({ ...prev, subject: event.target.value }))
              }
              placeholder="Short summary of the request"
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Customer">
              <SelectInput
                value={ticketForm.customerId}
                onChange={(event) =>
                  setTicketForm((prev) => ({ ...prev, customerId: event.target.value }))
                }
              >
                <option value="">Select a customer</option>
                {db.customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Assignee">
              <SelectInput
                value={ticketForm.assigneeId}
                onChange={(event) =>
                  setTicketForm((prev) => ({ ...prev, assigneeId: event.target.value }))
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
            <Field label="Channel">
              <SelectInput
                value={ticketForm.channel}
                onChange={(event) =>
                  setTicketForm((prev) => ({ ...prev, channel: event.target.value }))
                }
              >
                {CHANNELS.map((channel) => (
                  <option key={channel} value={channel}>
                    {channel}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Category">
              <SelectInput
                value={ticketForm.category}
                onChange={(event) =>
                  setTicketForm((prev) => ({ ...prev, category: event.target.value }))
                }
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Priority">
              <SelectInput
                value={ticketForm.priority}
                onChange={(event) =>
                  setTicketForm((prev) => ({ ...prev, priority: event.target.value }))
                }
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="SLA due" hint="Defaults to 24 hours from now">
              <TextInput
                type="datetime-local"
                value={ticketForm.slaDueAt}
                onChange={(event) =>
                  setTicketForm((prev) => ({ ...prev, slaDueAt: event.target.value }))
                }
              />
            </Field>
          </div>
          <Field label="Summary">
            <TextArea
              value={ticketForm.summary}
              onChange={(event) =>
                setTicketForm((prev) => ({ ...prev, summary: event.target.value }))
              }
              placeholder="What does the customer need?"
            />
          </Field>
        </div>
      </SlideOver>

      {/* ------------------------------------------------------ faq form */}
      <SlideOver
        open={faqOpen}
        onClose={() => setFaqOpen(false)}
        title={faqEditingId ? "Edit FAQ" : "New FAQ"}
        description="Answers shown on the public help centre."
        footer={
          <>
            <Button variant="ghost" onClick={() => setFaqOpen(false)}>
              Cancel
            </Button>
            <Button className="gap-1.5" onClick={saveFaq} disabled={savingFaq}>
              {savingFaq ? "Saving…" : "Save FAQ"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Question">
            <TextArea
              value={faqForm.question}
              onChange={(event) =>
                setFaqForm((prev) => ({ ...prev, question: event.target.value }))
              }
              placeholder="e.g. What do I need to rent a car?"
            />
          </Field>
          <Field label="Answer">
            <TextArea
              value={faqForm.answer}
              onChange={(event) =>
                setFaqForm((prev) => ({ ...prev, answer: event.target.value }))
              }
              placeholder="Write a clear answer…"
            />
          </Field>
          <Field label="Category">
            <TextInput
              value={faqForm.category}
              onChange={(event) =>
                setFaqForm((prev) => ({ ...prev, category: event.target.value }))
              }
              placeholder="Booking"
            />
          </Field>
          <Checkbox
            label="Published"
            checked={faqForm.published}
            onChange={(event) =>
              setFaqForm((prev) => ({ ...prev, published: event.target.checked }))
            }
          />
        </div>
      </SlideOver>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete record"
        description={
          pendingDelete
            ? `Delete ${pendingDelete.label}? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </>
  );
}
