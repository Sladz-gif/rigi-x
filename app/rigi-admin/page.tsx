"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  Car,
  CircleDollarSign,
  ClipboardList,
  LifeBuoy,
  Package,
  Plus,
  TrendingUp,
  UserPlus,
  Wrench,
} from "lucide-react";
import {
  AdminCard,
  ChartCard,
  KpiCard,
  PageHeader,
  ProgressBar,
  StatusPill,
  TableSkeleton,
} from "@/components/admin/ui";
import { useDb } from "@/lib/mock/store";
import { formatGHS } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";

const RevenueTrendChart = dynamic(
  () => import("@/components/admin/charts").then((mod) => mod.RevenueTrendChart),
  { ssr: false, loading: () => <TableSkeleton rows={4} cols={4} /> }
);
const ShareDonutChart = dynamic(
  () => import("@/components/admin/charts").then((mod) => mod.ShareDonutChart),
  { ssr: false, loading: () => <TableSkeleton rows={4} cols={2} /> }
);

const BASE = siteConfig.adminBasePath;

export default function AdminDashboardPage() {
  const db = useDb();

  const metrics = useMemo(() => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();

    const successful = db.payments.filter((payment) => payment.status === "success");
    const paidAt = (value: string | null) => (value ? new Date(value).getTime() : 0);

    const revenueToday = successful
      .filter((payment) => paidAt(payment.paidAt) >= startOfToday)
      .reduce((sum, payment) => sum + payment.amount, 0);
    const revenueMonth = successful
      .filter((payment) => paidAt(payment.paidAt) >= startOfMonth)
      .reduce((sum, payment) => sum + payment.amount, 0);
    const cashCollected = successful.reduce((sum, payment) => sum + payment.amount, 0);

    const activeRentals = db.bookings.filter((booking) => booking.status === "active");
    const pendingBookings = db.bookings.filter((booking) => booking.status === "pending_payment");
    const overdueReturns = activeRentals.filter(
      (booking) => new Date(booking.endDate) < new Date()
    );
    const openTickets = db.tickets.filter(
      (ticket) => ticket.status === "open" || ticket.status === "pending"
    );
    const lowStock = db.inventoryItems.filter((item) => item.quantity <= item.reorderLevel);

    const rentable = db.vehicles.filter((vehicle) => vehicle.status !== "out_of_service");
    const utilisation = rentable.length
      ? Math.round(
          rentable.reduce((sum, vehicle) => sum + vehicle.utilisation, 0) / rentable.length
        )
      : 0;

    const trend = Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - index));
      const key = date.toISOString().slice(0, 10);
      const value = successful
        .filter((payment) => (payment.paidAt ?? "").slice(0, 10) === key)
        .reduce((sum, payment) => sum + payment.amount, 0);
      return {
        label: date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
        value,
      };
    });

    const byCategory = Object.entries(
      db.bookings.reduce<Record<string, number>>((acc, booking) => {
        const vehicle = db.vehicles.find((v) => v.id === booking.vehicleId);
        const category = vehicle?.category ?? "other";
        acc[category] = (acc[category] ?? 0) + 1;
        return acc;
      }, {})
    )
      .map(([label, value]) => ({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        value,
      }))
      .sort((a, b) => b.value - a.value);

    const inSevenDays = new Date();
    inSevenDays.setDate(inSevenDays.getDate() + 7);
    const pickups = db.bookings
      .filter(
        (booking) =>
          booking.status !== "cancelled" &&
          new Date(booking.startDate) >= new Date() &&
          new Date(booking.startDate) <= inSevenDays
      )
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    const returns = db.bookings
      .filter(
        (booking) =>
          booking.status === "active" || booking.status === "confirmed"
      )
      .filter((booking) => new Date(booking.endDate) <= inSevenDays)
      .sort((a, b) => a.endDate.localeCompare(b.endDate));

    return {
      revenueToday,
      revenueMonth,
      cashCollected,
      activeRentals,
      pendingBookings,
      overdueReturns,
      openTickets,
      lowStock,
      utilisation,
      trend,
      byCategory,
      pickups,
      returns,
    };
  }, [db]);

  const alerts = useMemo(() => {
    const list: { id: string; tone: "danger" | "warning" | "info"; text: string; href: string }[] = [];
    if (metrics.overdueReturns.length) {
      list.push({
        id: "overdue",
        tone: "danger",
        text: `${metrics.overdueReturns.length} vehicle(s) overdue for return`,
        href: `${BASE}/sales`,
      });
    }
    const overdueService = db.maintenanceSchedules.filter((schedule) => schedule.overdue);
    if (overdueService.length) {
      list.push({
        id: "service",
        tone: "warning",
        text: `${overdueService.length} vehicle(s) overdue for scheduled service`,
        href: `${BASE}/maintenance`,
      });
    }
    if (metrics.lowStock.length) {
      list.push({
        id: "stock",
        tone: "warning",
        text: `${metrics.lowStock.length} inventory item(s) at or below reorder level`,
        href: `${BASE}/inventory`,
      });
    }
    const overdueInvoices = db.invoices.filter((invoice) => invoice.status === "overdue");
    if (overdueInvoices.length) {
      list.push({
        id: "invoices",
        tone: "danger",
        text: `${overdueInvoices.length} invoice(s) past due`,
        href: `${BASE}/finance`,
      });
    }
    const expiringDocs = db.vehicleDocuments.filter(
      (document) =>
        new Date(document.expiresAt).getTime() - new Date().getTime() < 30 * 86_400_000
    );
    if (expiringDocs.length) {
      list.push({
        id: "docs",
        tone: "info",
        text: `${expiringDocs.length} vehicle document(s) expiring within 30 days`,
        href: `${BASE}/fleet`,
      });
    }
    const pendingTickets = db.tickets.filter((ticket) => ticket.status === "open");
    if (pendingTickets.length) {
      list.push({
        id: "tickets",
        tone: "info",
        text: `${pendingTickets.length} unassigned support ticket(s)`,
        href: `${BASE}/support`,
      });
    }
    return list;
  }, [db, metrics]);

  const quickActions = [
    { label: "New booking", href: `${BASE}/sales?new=booking`, icon: Plus },
    { label: "Add vehicle", href: `${BASE}/fleet?new=vehicle`, icon: Car },
    { label: "Add client", href: `${BASE}/customers?new=client`, icon: UserPlus },
    { label: "Create invoice", href: `${BASE}/finance?new=invoice`, icon: Banknote },
  ];

  const customerName = (id: string) => db.customers.find((c) => c.id === id)?.name ?? "Guest";
  const vehicleName = (id: string) => db.vehicles.find((v) => v.id === id)?.name ?? "Vehicle";

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Live snapshot of bookings, fleet, money and service."
        actions={
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-2 text-xs font-medium text-ink transition-colors hover:border-brand"
              >
                <action.icon className="h-3.5 w-3.5" />
                {action.label}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Revenue today"
          value={formatGHS(metrics.revenueToday)}
          sub="Payments settled today"
          icon={CircleDollarSign}
          tone="positive"
        />
        <KpiCard
          label="Revenue this month"
          value={formatGHS(metrics.revenueMonth)}
          sub={`${db.payments.filter((p) => p.status === "success").length} successful payments`}
          icon={TrendingUp}
          tone="positive"
        />
        <KpiCard
          label="Active rentals"
          value={String(metrics.activeRentals.length)}
          sub={`${db.vehicles.filter((v) => v.status === "available").length} cars available`}
          icon={Car}
        />
        <KpiCard
          label="Fleet utilisation"
          value={`${metrics.utilisation}%`}
          sub="Average across the fleet"
          icon={ClipboardList}
        />
        <KpiCard
          label="Pending bookings"
          value={String(metrics.pendingBookings.length)}
          sub="Awaiting payment"
          icon={CalendarClock}
          tone="warning"
        />
        <KpiCard
          label="Overdue returns"
          value={String(metrics.overdueReturns.length)}
          sub="Past the return date"
          icon={AlertTriangle}
          tone="danger"
        />
        <KpiCard
          label="Open tickets"
          value={String(metrics.openTickets.length)}
          sub="Customer service queue"
          icon={LifeBuoy}
        />
        <KpiCard
          label="Cash collected"
          value={formatGHS(metrics.cashCollected)}
          sub="All time"
          icon={Banknote}
        />
        <KpiCard
          label="Low stock alerts"
          value={String(metrics.lowStock.length)}
          sub="At or below reorder level"
          icon={Package}
          tone={metrics.lowStock.length ? "warning" : "neutral"}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartCard
            title="Revenue trend"
            subtitle="Daily settled payments, last 14 days"
            height={280}
          >
            <div role="img" aria-label="Revenue trend for the last 14 days" className="h-full w-full">
              <RevenueTrendChart data={metrics.trend} />
            </div>
          </ChartCard>
        </div>
        <ChartCard title="Bookings by category" subtitle="All bookings" height={280}>
          <div role="img" aria-label="Bookings split by vehicle category" className="h-full w-full">
            <ShareDonutChart data={metrics.byCategory} />
          </div>
        </ChartCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <AdminCard title="Upcoming pickups" description="Next 7 days">
          <ul className="divide-y divide-line">
            {metrics.pickups.slice(0, 6).map((booking) => (
              <li key={booking.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-ink">
                    {vehicleName(booking.vehicleId)}
                  </p>
                  <p className="truncate text-[11px] text-muted">
                    {customerName(booking.customerId)} · {booking.reference}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-[11px] font-medium text-ink">
                    {new Date(booking.startDate).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                  <StatusPill status={booking.status} />
                </div>
              </li>
            ))}
            {metrics.pickups.length === 0 && (
              <li className="py-6 text-center text-xs text-muted">No pickups scheduled.</li>
            )}
          </ul>
        </AdminCard>

        <AdminCard title="Upcoming returns" description="Next 7 days">
          <ul className="divide-y divide-line">
            {metrics.returns.slice(0, 6).map((booking) => (
              <li key={booking.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-ink">
                    {vehicleName(booking.vehicleId)}
                  </p>
                  <p className="truncate text-[11px] text-muted">
                    {customerName(booking.customerId)} · {booking.reference}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-[11px] font-medium text-ink">
                    {new Date(booking.endDate).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                  <StatusPill status={booking.status} />
                </div>
              </li>
            ))}
            {metrics.returns.length === 0 && (
              <li className="py-6 text-center text-xs text-muted">No returns due.</li>
            )}
          </ul>
        </AdminCard>

        <AdminCard
          title="Alerts"
          description={`${alerts.length} thing${alerts.length === 1 ? "" : "s"} needing attention`}
        >
          <ul className="space-y-2">
            {alerts.map((alert) => (
              <li key={alert.id}>
                <Link
                  href={alert.href}
                  className="flex items-start gap-3 rounded-xl border border-line p-3 transition-colors hover:border-brand"
                >
                  <AlertTriangle
                    className={
                      alert.tone === "danger"
                        ? "mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-brand"
                        : alert.tone === "warning"
                          ? "mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500"
                          : "mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-sky-500"
                    }
                  />
                  <span className="text-xs text-ink">{alert.text}</span>
                </Link>
              </li>
            ))}
            {alerts.length === 0 && (
              <li className="py-6 text-center text-xs text-muted">
                Nothing needs your attention right now.
              </li>
            )}
          </ul>
        </AdminCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AdminCard title="Fleet status" description="Vehicles by current state">
          <div className="space-y-3">
            {(["available", "rented", "reserved", "in_maintenance", "out_of_service"] as const).map(
              (status) => {
                const count = db.vehicles.filter((vehicle) => vehicle.status === status).length;
                const percentage = (count / Math.max(1, db.vehicles.length)) * 100;
                return (
                  <div key={status}>
                    <div className="mb-1 flex items-center justify-between">
                      <StatusPill status={status} />
                      <span className="text-xs text-muted">{count} vehicles</span>
                    </div>
                    <ProgressBar
                      value={percentage}
                      tone={
                        status === "available"
                          ? "emerald"
                          : status === "in_maintenance"
                            ? "amber"
                            : status === "out_of_service"
                              ? "brand"
                              : "ink"
                      }
                    />
                  </div>
                );
              }
            )}
          </div>
        </AdminCard>

        <AdminCard
          title="Maintenance due"
          description="Scheduled services flagged as overdue"
          action={
            <Link
              href={`${BASE}/maintenance`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
            >
              <Wrench className="h-3.5 w-3.5" />
              Open maintenance
            </Link>
          }
        >
          <ul className="divide-y divide-line">
            {db.maintenanceSchedules
              .filter((schedule) => schedule.overdue)
              .slice(0, 6)
              .map((schedule) => {
                const vehicle = db.vehicles.find((v) => v.id === schedule.vehicleId);
                return (
                  <li key={schedule.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-ink">
                        {vehicle?.name ?? "Vehicle"}
                      </p>
                      <p className="truncate text-[11px] text-muted">{schedule.service}</p>
                    </div>
                    <span className="flex-shrink-0 text-[11px] text-brand">
                      {new Date(schedule.dueAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  </li>
                );
              })}
          </ul>
        </AdminCard>
      </div>
    </>
  );
}
