"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Banknote,
  Bell,
  Car,
  ChevronsUpDown,
  Command,
  Headphones,
  IdCard,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Package,
  Search,
  Settings,
  TrendingUp,
  User,
  Users,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_NAV } from "@/lib/admin-nav";
import { canAccessModule, ROLE_LABELS, type AdminModule } from "@/lib/permissions";
import { signOut } from "@/lib/mock/auth";
import { globalSearch, type SearchHit } from "@/lib/mock/api";
import { useDb } from "@/lib/mock/store";
import { siteConfig } from "@/lib/site-config";
import { AdminSessionProvider, useAdminSession } from "./session";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  TrendingUp,
  Users,
  Headphones,
  Car,
  Wrench,
  Package,
  Banknote,
  IdCard,
  Megaphone,
  Settings,
};

const BASE = siteConfig.adminBasePath;

function moduleFromPath(pathname: string): AdminModule {
  const segment = pathname.replace(BASE, "").split("/").filter(Boolean)[0];
  if (!segment) return "dashboard";
  const match = ADMIN_NAV.find((item) => item.href.replace(BASE, "").replace("/", "") === segment);
  return match?.module ?? "dashboard";
}

/* --------------------------------------------------------------- shell */

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const session = useAdminSession({ redirect: !pathname.endsWith("/login") });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isLogin = pathname.endsWith("/login");
  useEffect(() => {
    const timer = window.setTimeout(() => setDrawerOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  if (isLogin) return <>{children}</>;

  if (!session) {
    return (
      <div className="flex h-dvh items-center justify-center bg-mist">
        <div className="flex items-center gap-3 text-sm text-muted">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-brand" />
          Checking your session…
        </div>
      </div>
    );
  }

  const activeModule = moduleFromPath(pathname);
  const allowed = canAccessModule(session.role, activeModule);

  return (
    <AdminSessionProvider session={session.session}>
      <div className="flex h-dvh overflow-hidden bg-mist">
        {/* Desktop sidebar */}
        <Sidebar role={session.role} pathname={pathname} className="hidden md:flex" />

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-[80] flex md:hidden">
            <div
              className="absolute inset-0 bg-ink/50"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <Sidebar
              role={session.role}
              pathname={pathname}
              className="relative z-10 w-[260px]"
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            pathname={pathname}
            onOpenDrawer={() => setDrawerOpen(true)}
            role={session.role}
            name={session.session.name}
          />
          <div className="min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6">
              {allowed ? children : <NotFoundPanel />}
            </div>
          </div>
        </div>
      </div>
    </AdminSessionProvider>
  );
}

/* ------------------------------------------------------------- sidebar */

function Sidebar({
  role,
  pathname,
  className,
  onNavigate,
}: {
  role: Parameters<typeof canAccessModule>[0];
  pathname: string;
  className?: string;
  onNavigate?: () => void;
}) {
  const items = ADMIN_NAV.filter((item) => canAccessModule(role, item.module));

  return (
    <aside
      className={cn(
        "flex h-dvh flex-col border-r border-line bg-white",
        // icon rail on tablet, full width on desktop
        "md:w-[72px] lg:w-[260px]",
        className
      )}
    >
      <div className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-line px-4">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
          R
        </span>
        <div className="hidden min-w-0 lg:block">
          <p className="truncate text-sm font-semibold text-ink">Rigi-X</p>
          <p className="truncate text-[11px] text-muted">Business manager</p>
        </div>
      </div>

      {/* Only 11 top-level items — must never scroll. Row height and gap use
          clamp() so the list fits a 600px-tall window without a scrollbar. */}
      <nav className="flex flex-1 flex-col justify-center gap-[clamp(2px,0.6vh,6px)] overflow-hidden px-2 py-2">
        {items.map((item) => {
          const Icon = ICONS[item.icon] ?? LayoutDashboard;
          const active =
            item.module === "dashboard"
              ? pathname === BASE || pathname === `${BASE}/`
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.module}
              href={item.href}
              onClick={onNavigate}
              title={item.label}
              aria-current={active ? "page" : undefined}
              style={{ height: "clamp(32px, 5.1vh, 44px)" }}
              className={cn(
                "flex flex-shrink-0 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
                active
                  ? "bg-ink text-white"
                  : "text-muted hover:bg-mist hover:text-ink"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="hidden truncate lg:block">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex h-16 flex-shrink-0 items-center gap-2 border-t border-line px-3">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-mist text-muted">
          <User className="h-4 w-4" />
        </span>
        <div className="hidden min-w-0 lg:block">
          <p className="truncate text-xs font-medium text-ink">{ROLE_LABELS[role]}</p>
          <p className="truncate text-[11px] text-muted">Signed in</p>
        </div>
      </div>
    </aside>
  );
}

/* -------------------------------------------------------------- topbar */

function TopBar({
  pathname,
  onOpenDrawer,
  role,
  name,
}: {
  pathname: string;
  onOpenDrawer: () => void;
  role: Parameters<typeof canAccessModule>[0];
  name: string;
}) {
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const current = ADMIN_NAV.find((item) =>
    item.module === "dashboard" ? pathname === BASE : pathname.startsWith(item.href)
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const alerts = useAlerts();

  return (
    <header className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-line bg-white px-4">
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Open navigation"
        className="rounded-lg p-2 text-muted hover:bg-mist hover:text-ink md:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold text-ink">
          {current?.label ?? "Dashboard"}
        </h2>
        <p className="truncate text-[11px] text-muted">
          {buildBreadcrumbs(pathname).join(" / ")}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="hidden items-center gap-2 rounded-xl border border-line px-3 py-2 text-xs text-muted transition-colors hover:text-ink sm:flex"
      >
        <Search className="h-3.5 w-3.5" />
        Search
        <kbd className="rounded border border-line px-1 py-0.5 text-[10px]">Ctrl K</kbd>
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setNotificationsOpen((open) => !open);
            setAccountOpen(false);
          }}
          aria-label="Notifications"
          className="relative rounded-lg p-2 text-muted transition-colors hover:bg-mist hover:text-ink"
        >
          <Bell className="h-4 w-4" />
          {alerts.length > 0 && (
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
          )}
        </button>
        {notificationsOpen && (
          <div className="absolute right-0 z-40 mt-2 w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-line bg-white p-2 shadow-xl">
            <p className="px-3 py-2 text-xs font-semibold text-ink">
              Alerts ({alerts.length})
            </p>
            <div className="max-h-72 overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-muted">You are all caught up.</p>
              ) : (
                alerts.map((alert) => (
                  <Link
                    key={alert.id}
                    href={alert.href}
                    onClick={() => setNotificationsOpen(false)}
                    className="block rounded-xl px-3 py-2 transition-colors hover:bg-mist"
                  >
                    <p className="text-xs font-medium text-ink">{alert.title}</p>
                    <p className="text-[11px] text-muted">{alert.detail}</p>
                  </Link>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setAccountOpen((open) => !open);
            setNotificationsOpen(false);
          }}
          className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-mist"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">
            {name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
          </span>
          <span className="hidden text-xs font-medium text-ink lg:block">{name}</span>
          <ChevronsUpDown className="hidden h-3 w-3 text-muted lg:block" />
        </button>
        {accountOpen && (
          <div className="absolute right-0 z-40 mt-2 w-56 rounded-2xl border border-line bg-white p-2 shadow-xl">
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-ink">{name}</p>
              <p className="text-[11px] text-muted">{ROLE_LABELS[role]}</p>
            </div>
            <Link
              href={`${BASE}/settings`}
              onClick={() => setAccountOpen(false)}
              className="block rounded-xl px-3 py-2 text-xs text-ink transition-colors hover:bg-mist"
            >
              Settings
            </Link>
            <button
              type="button"
              onClick={() => {
                signOut();
                router.replace(`${BASE}/login`);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-brand transition-colors hover:bg-brand/5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        )}
      </div>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </header>
  );
}

function buildBreadcrumbs(pathname: string): string[] {
  const parts = pathname.replace(BASE, "").split("/").filter(Boolean);
  if (parts.length === 0) return ["Home"];
  return ["Home", ...parts.map((part) => part.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase()))];
}

/* ------------------------------------------------------------- alerts */

interface Alert {
  id: string;
  title: string;
  detail: string;
  href: string;
}

function useAlerts(): Alert[] {
  const db = useDb();
  return useMemo(() => {
    const alerts: Alert[] = [];
    const lowStock = db.inventoryItems.filter((item) => item.quantity <= item.reorderLevel);
    if (lowStock.length) {
      alerts.push({
        id: "stock",
        title: `${lowStock.length} item${lowStock.length === 1 ? "" : "s"} low on stock`,
        detail: lowStock.slice(0, 2).map((item) => item.name).join(", "),
        href: `${BASE}/inventory`,
      });
    }
    const pendingPayments = db.bookings.filter((booking) => booking.status === "pending_payment");
    if (pendingPayments.length) {
      alerts.push({
        id: "payments",
        title: `${pendingPayments.length} booking${pendingPayments.length === 1 ? "" : "s"} awaiting payment`,
        detail: pendingPayments.slice(0, 2).map((booking) => booking.reference).join(", "),
        href: `${BASE}/finance`,
      });
    }
    const openTickets = db.tickets.filter((ticket) => ticket.status === "open");
    if (openTickets.length) {
      alerts.push({
        id: "tickets",
        title: `${openTickets.length} open support ticket${openTickets.length === 1 ? "" : "s"}`,
        detail: openTickets.slice(0, 2).map((ticket) => ticket.reference).join(", "),
        href: `${BASE}/support`,
      });
    }
    const overdue = db.maintenanceSchedules.filter((schedule) => schedule.overdue);
    if (overdue.length) {
      alerts.push({
        id: "maintenance",
        title: `${overdue.length} vehicle${overdue.length === 1 ? "" : "s"} overdue for service`,
        detail: "Check the maintenance schedule",
        href: `${BASE}/maintenance`,
      });
    }
    const overdueReturns = db.bookings.filter(
      (booking) => booking.status === "active" && new Date(booking.endDate) < new Date()
    );
    if (overdueReturns.length) {
      alerts.push({
        id: "returns",
        title: `${overdueReturns.length} overdue return${overdueReturns.length === 1 ? "" : "s"}`,
        detail: overdueReturns.slice(0, 2).map((booking) => booking.reference).join(", "),
        href: `${BASE}/sales`,
      });
    }
    return alerts;
  }, [db]);
}

/* ---------------------------------------------------- command palette */

function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const results: SearchHit[] = useMemo(
    () => (query.trim().length >= 2 ? globalSearch(query).slice(0, 12) : []),
    [query]
  );

  const navHits = useMemo(() => {
    if (query.trim().length >= 2) return [];
    return ADMIN_NAV.map((item) => ({
      group: "Pages" as const,
      label: item.label,
      sub: item.href,
      href: item.href,
    }));
  }, [query]);

  const hits = results.length ? results : navHits;

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
        className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Search className="h-4 w-4 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search clients, bookings, vehicles…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
          <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px] text-muted">Esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {hits.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted">
              {query.trim().length < 2
                ? "Type at least 2 characters to search."
                : "No matches found."}
            </p>
          ) : (
            hits.map((hit, index) => (
              <button
                key={`${hit.group}-${hit.label}-${index}`}
                type="button"
                onClick={() => {
                  router.push(hit.href);
                  onClose();
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-mist"
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-ink">{hit.label}</span>
                  <span className="block truncate text-[11px] text-muted">{hit.sub}</span>
                </span>
                <span className="flex-shrink-0 rounded-full bg-mist px-2 py-0.5 text-[10px] text-muted">
                  {hit.group}
                </span>
              </button>
            ))
          )}
        </div>
        <div className="flex items-center gap-2 border-t border-line px-4 py-2 text-[10px] text-muted">
          <Command className="h-3 w-3" /> Tip: press Ctrl/Cmd + K anywhere
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ 404 view */

function NotFoundPanel() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="text-sm font-semibold text-ink">404 — Page not found</p>
      <p className="mt-1 text-xs text-muted">
        The page you are looking for does not exist.
      </p>
    </div>
  );
}
