"use client";

// Shared admin UI kit. Every module page in /rigi-admin is built from these
// pieces so tables, panels, toasts and states look identical everywhere.
// Admin runs a denser, lighter variant of the public site's design language.

import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Inbox,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/csv";
import { Modal } from "@/components/ui/modal";
import { useScrollLock } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------- shells */

export function AdminCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  padded = true,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  padded?: boolean;
}) {
  return (
    <section className={cn("rounded-2xl border border-line bg-white", className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn(padded && "p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "neutral" | "positive" | "warning" | "danger";
}) {
  const tones = {
    neutral: "bg-mist text-ink",
    positive: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-brand/10 text-brand",
  };
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted">{label}</p>
        {Icon && (
          <span className={cn("rounded-lg p-1.5", tones[tone])}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  children,
  height = 260,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  height?: number;
  action?: React.ReactNode;
}) {
  return (
    <AdminCard title={title} description={subtitle} action={action}>
      <div style={{ height }} className="w-full">
        {children}
      </div>
    </AdminCard>
  );
}

/* ---------------------------------------------------------------- tabs */

export interface TabDef {
  id: string;
  label: string;
  count?: number;
}

export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("-mx-1 mb-5 overflow-x-auto px-1", className)}>
      <div
        role="tablist"
        className="flex min-w-max items-center gap-1 border-b border-line pb-px"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn(
                "-mb-px whitespace-nowrap rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-brand text-ink"
                  : "border-transparent text-muted hover:text-ink"
              )}
            >
              {tab.label}
              {typeof tab.count === "number" && (
                <span
                  className={cn(
                    "ml-2 rounded-full px-1.5 py-0.5 text-[11px]",
                    isActive ? "bg-brand/10 text-brand" : "bg-mist text-muted"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- pills */

const STATUS_TONES: Record<string, string> = {
  // positive
  success: "bg-emerald-50 text-emerald-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  active: "bg-emerald-50 text-emerald-700",
  completed: "bg-emerald-50 text-emerald-700",
  paid: "bg-emerald-50 text-emerald-700",
  approved: "bg-emerald-50 text-emerald-700",
  released: "bg-emerald-50 text-emerald-700",
  received: "bg-emerald-50 text-emerald-700",
  won: "bg-emerald-50 text-emerald-700",
  hired: "bg-emerald-50 text-emerald-700",
  present: "bg-emerald-50 text-emerald-700",
  published: "bg-emerald-50 text-emerald-700",
  available: "bg-emerald-50 text-emerald-700",
  verified: "bg-emerald-50 text-emerald-700",
  sent: "bg-emerald-50 text-emerald-700",
  // waiting
  pending_payment: "bg-amber-50 text-amber-700",
  pending: "bg-amber-50 text-amber-700",
  waiting_parts: "bg-amber-50 text-amber-700",
  in_progress: "bg-amber-50 text-amber-700",
  in_maintenance: "bg-amber-50 text-amber-700",
  scheduled: "bg-amber-50 text-amber-700",
  late: "bg-amber-50 text-amber-700",
  held: "bg-amber-50 text-amber-700",
  low: "bg-amber-50 text-amber-700",
  normal: "bg-mist text-ink",
  // danger
  cancelled: "bg-brand/10 text-brand",
  failed: "bg-brand/10 text-brand",
  rejected: "bg-brand/10 text-brand",
  overdue: "bg-brand/10 text-brand",
  void: "bg-brand/10 text-brand",
  urgent: "bg-brand/10 text-brand",
  high: "bg-brand/10 text-brand",
  absent: "bg-brand/10 text-brand",
  lost: "bg-brand/10 text-brand",
  blacklisted: "bg-brand/10 text-brand",
  out_of_service: "bg-brand/10 text-brand",
  expired: "bg-brand/10 text-brand",
  // info
  initiated: "bg-sky-50 text-sky-700",
  open: "bg-sky-50 text-sky-700",
  rented: "bg-sky-50 text-sky-700",
  reserved: "bg-sky-50 text-sky-700",
  ordered: "bg-sky-50 text-sky-700",
  interviewed: "bg-sky-50 text-sky-700",
  // neutral
  closed: "bg-mist text-muted",
  draft: "bg-mist text-muted",
  idea: "bg-mist text-muted",
  new: "bg-mist text-muted",
  quoted: "bg-mist text-muted",
  contacted: "bg-mist text-muted",
  returned: "bg-mist text-muted",
  refunded: "bg-mist text-muted",
  forfeited: "bg-mist text-muted",
  paused: "bg-mist text-muted",
  applied: "bg-mist text-muted",
  screening: "bg-mist text-muted",
  offer: "bg-mist text-muted",
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  const key = status.toLowerCase().replace(/\s+/g, "_");
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium capitalize",
        STATUS_TONES[key] ?? "bg-mist text-muted"
      )}
    >
      {(label ?? status).replace(/_/g, " ")}
    </span>
  );
}

/* ------------------------------------------------------------- inputs */

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-medium text-ink">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-[11px] text-brand">{error}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-brand";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputClass, "min-h-[88px]", props.className)} />;
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(inputClass, "appearance-none pr-8", props.className)}>
      {props.children}
    </select>
  );
}

export function Checkbox({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink">
      <input type="checkbox" {...props} className="h-4 w-4 rounded border-line accent-brand" />
      {label}
    </label>
  );
}

/* --------------------------------------------------------- empty state */

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="mb-3 rounded-2xl bg-mist p-3 text-muted">
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-5">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-3">
          {Array.from({ length: cols }).map((__, colIndex) => (
            <div
              key={colIndex}
              className="h-8 flex-1 animate-pulse rounded-lg bg-mist"
              style={{ animationDelay: `${rowIndex * 60}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "brand",
  label,
}: {
  value: number;
  tone?: "brand" | "ink" | "emerald" | "amber";
  label?: string;
}) {
  const tones = {
    brand: "bg-brand",
    ink: "bg-ink",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
  };
  return (
    <div>
      {label && (
        <div className="mb-1 flex justify-between text-[11px] text-muted">
          <span>{label}</span>
          <span>{Math.round(value)}%</span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-mist">
        <div
          className={cn("h-full rounded-full transition-all", tones[tone])}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ slide over */

export function SlideOver({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "sm" | "md" | "lg";
}) {
  useScrollLock(open);
  const widths = { sm: "sm:max-w-md", md: "sm:max-w-xl", lg: "sm:max-w-3xl" };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95] flex justify-end">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative flex h-full w-full flex-col bg-white shadow-2xl",
          widths[width]
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="rounded-full p-1.5 text-muted transition-colors hover:bg-mist hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">
            {footer}
          </footer>
        )}
      </aside>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = true,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="sm">
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={destructive ? "primary" : "dark"}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------- data table */

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  /** Value used for sorting and CSV export. Defaults to row[key]. */
  value?: (row: T) => string | number;
  align?: "left" | "right" | "center";
  className?: string;
  hideBelow?: "sm" | "md" | "lg";
  sortable?: boolean;
}

type SortDir = "asc" | "desc";

const HIDE_CLASSES = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};

function rawValue<T>(row: T, column: Column<T>): string | number {
  if (column.value) return column.value(row);
  const value = (row as Record<string, unknown>)[column.key];
  if (typeof value === "number" || typeof value === "string") return value;
  return value === null || value === undefined ? "" : String(value);
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  loading = false,
  searchFields,
  searchPlaceholder = "Search…",
  toolbar,
  filters,
  onRowClick,
  exportFilename,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyAction,
  initialSort,
  pageSize: initialPageSize = 10,
  rowActions,
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  searchFields?: (row: T) => string;
  searchPlaceholder?: string;
  toolbar?: React.ReactNode;
  filters?: React.ReactNode;
  onRowClick?: (row: T) => void;
  exportFilename?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  initialSort?: { key: string; dir: SortDir };
  pageSize?: number;
  rowActions?: (row: T) => React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(initialSort ?? null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [hidden, setHidden] = useState<string[]>([]);

  const visibleColumns = columns.filter((column) => !hidden.includes(column.key));

  const filtered = useMemo(() => {
    if (!query.trim() || !searchFields) return rows;
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => searchFields(row).toLowerCase().includes(needle));
  }, [rows, query, searchFields]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const column = columns.find((c) => c.key === sort.key);
    if (!column) return filtered;
    return [...filtered].sort((a, b) => {
      const av = rawValue(a, column);
      const bv = rawValue(b, column);
      if (typeof av === "number" && typeof bv === "number") {
        return sort.dir === "asc" ? av - bv : bv - av;
      }
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      return sort.dir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });
  }, [filtered, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExport = () => {
    downloadCsv(
      exportFilename ?? "export.csv",
      sorted.map((row) =>
        Object.fromEntries(columns.map((column) => [column.header, rawValue(row, column)]))
      )
    );
  };

  const toggleSort = (key: string) => {
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  };

  return (
    <div className="rounded-2xl border border-line bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        {searchFields && (
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-line bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand"
            />
          </div>
        )}
        {filters}
        <div className="flex items-center gap-2">
          {toolbar}
          {exportFilename && (
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line px-2.5 py-2 text-xs font-medium text-muted transition-colors hover:text-ink"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </button>
          )}
          {columns.length > 2 && (
            <details className="relative">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-xl border border-line px-2.5 py-2 text-xs font-medium text-muted transition-colors hover:text-ink">
                Columns
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-line bg-white p-2 shadow-lg">
                {columns.map((column) => (
                  <label
                    key={column.key}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-ink hover:bg-mist"
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-brand"
                      checked={!hidden.includes(column.key)}
                      onChange={() =>
                        setHidden((prev) =>
                          prev.includes(column.key)
                            ? prev.filter((key) => key !== column.key)
                            : [...prev, column.key]
                        )
                      }
                    />
                    {column.header}
                  </label>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>

      {loading ? (
        <TableSkeleton cols={Math.min(columns.length, 6)} />
      ) : pageRows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-mist">
              <tr>
                {visibleColumns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      "whitespace-nowrap px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted",
                      column.align === "right" && "text-right",
                      column.align === "center" && "text-center",
                      column.hideBelow && HIDE_CLASSES[column.hideBelow]
                    )}
                  >
                    {column.sortable === false ? (
                      column.header
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className="inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-ink"
                      >
                        {column.header}
                        <ArrowDownUp className="h-3 w-3 opacity-50" />
                      </button>
                    )}
                  </th>
                ))}
                {rowActions && <th className="px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pageRows.map((row) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "align-middle",
                    onRowClick && "cursor-pointer transition-colors hover:bg-mist/60"
                  )}
                >
                  {visibleColumns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-4 py-3 text-ink",
                        column.align === "right" && "text-right",
                        column.align === "center" && "text-center",
                        column.hideBelow && HIDE_CLASSES[column.hideBelow],
                        column.className
                      )}
                    >
                      {column.render
                        ? column.render(row)
                        : String(rawValue(row, column) ?? "—")}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                      {rowActions(row)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && sorted.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-muted">
          <span>
            {sorted.length} record{sorted.length === 1 ? "" : "s"}
            {query ? " matching" : ""}
          </span>
          <div className="flex items-center gap-3">
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              aria-label="Rows per page"
              className="rounded-lg border border-line bg-white px-2 py-1 text-xs"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
                className="rounded-lg border border-line p-1 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-1">
                {currentPage} / {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
                disabled={currentPage === pageCount}
                aria-label="Next page"
                className="rounded-lg border border-line p-1 disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Filter dropdown that plugs straight into <DataTable filters={…} />. */
export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-xl border border-line bg-white px-2.5 py-2 text-xs text-ink outline-none focus:border-brand"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option === "all" ? `All ${label.toLowerCase()}` : option.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}

/** Masked value with a reveal action (writes to the audit log). */
export function SensitiveValue({
  value,
  masked,
  revealed,
  onReveal,
}: {
  value: string;
  masked: string;
  revealed: boolean;
  onReveal?: () => void;
}) {
  if (revealed) return <span className="font-mono text-xs">{value}</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-mono text-xs text-muted">{masked}</span>
      {onReveal && (
        <button
          type="button"
          onClick={onReveal}
          className="text-[11px] font-medium text-brand hover:underline"
        >
          Reveal
        </button>
      )}
    </span>
  );
}
