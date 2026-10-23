"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  CalendarPlus,
  Check,
  Download,
  MapPin,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  User,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { useDb } from "@/lib/mock/store";
import { siteConfig } from "@/lib/site-config";
import { formatDate, formatGHS } from "@/lib/utils";

interface BookingState {
  ready: boolean;
  reference: string;
}

function toIcsDate(value: string): string {
  return value.replace(/-/g, "").slice(0, 8);
}

function triggerDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export default function CheckoutSuccessPage() {
  const db = useDb();
  const [state, setState] = useState<BookingState>({ ready: false, reference: "" });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      setState({ ready: true, reference: params.get("ref") ?? "" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const booking = state.reference
    ? db.bookings.find((row) => row.reference === state.reference)
    : undefined;

  const vehicle = booking
    ? db.vehicles.find((row) => row.id === booking.vehicleId)
    : undefined;
  const customer = booking
    ? db.customers.find((row) => row.id === booking.customerId)
    : undefined;
  const deposit = booking ? db.deposits.find((row) => row.bookingId === booking.id) : undefined;
  const payment = booking ? db.payments.find((row) => row.bookingId === booking.id) : undefined;
  const receipt = booking
    ? db.invoices.find((row) => row.bookingId === booking.id && row.type === "receipt")
    : undefined;

  const addToCalendar = () => {
    if (!booking) return;
    const stamp = `${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Rigi-X//Booking//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${booking.reference}@rigi-x.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${toIcsDate(booking.startDate)}`,
      `DTEND;VALUE=DATE:${toIcsDate(booking.endDate)}`,
      `SUMMARY:Rigi-X pickup — ${vehicle?.name ?? "your rental"}`,
      `LOCATION:${booking.pickupLocation}`,
      `DESCRIPTION:Booking ${booking.reference}. Bring your ID and driver's licence.`,
      "END:VEVENT",
      "END:VCALENDAR",
    ];
    triggerDownload(`${booking.reference}.ics`, lines.join("\r\n"), "text/calendar");
  };

  const downloadReceipt = () => {
    if (!booking) return;
    const body = [
      "RIGI-X CAR RENTALS — RECEIPT",
      "==============================",
      `Reference:       ${booking.reference}`,
      `Receipt no.:     ${receipt?.number ?? "—"}`,
      `Guest:           ${customer?.name ?? "Guest"}`,
      `Email:           ${customer?.email ?? "—"}`,
      `Vehicle:         ${vehicle?.name ?? "—"}`,
      `Pickup:          ${booking.startDate}`,
      `Return:          ${booking.endDate}`,
      `Days:            ${booking.days}`,
      `Rental subtotal: GHS ${booking.subtotal}`,
      `Extras:          GHS ${booking.extrasTotal}`,
      `Discount:        GHS ${booking.discount}`,
      `VAT & levies:    GHS ${booking.tax}`,
      `TOTAL PAID:      GHS ${booking.total}`,
      `Deposit held:    GHS ${booking.deposit}`,
      `Payment ref:     ${payment?.paystackReference ?? payment?.reference ?? "—"}`,
      "",
      `Issued ${new Date().toISOString()}`,
      "Thank you for choosing Rigi-X.",
    ].join("\n");
    triggerDownload(`${booking.reference}-receipt.txt`, body, "text/plain");
  };

  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen bg-mist py-10">
        <Container>
          <div className="mx-auto max-w-3xl">
            {!state.ready && (
              <div className="h-96 animate-pulse rounded-2xl border border-line bg-white" />
            )}

            {state.ready && !booking && (
              <div className="rounded-2xl border border-line bg-white p-10 text-center">
                <AlertCircle className="mx-auto mb-4 h-10 w-10 text-brand" />
                <h1 className="text-xl font-semibold text-ink">We cannot find that booking</h1>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                  The reference in this link does not match a booking on this device. Try the
                  booking lookup with the email or phone you used.
                </p>
                <Link href="/booking/lookup" className="mt-6 inline-block">
                  <Button>Find my booking</Button>
                </Link>
              </div>
            )}

            {state.ready && booking && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-line bg-white p-8 text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                    <Check className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-ink">Booking confirmed</h1>
                  <p className="mt-2 text-sm text-muted">
                    Payment received and your car is reserved. A confirmation has been queued to{" "}
                    {customer?.email ?? "your email"}.
                  </p>

                  <div className="mt-6 inline-flex flex-col items-center rounded-2xl bg-mist px-8 py-4">
                    <span className="text-xs uppercase tracking-wide text-muted">
                      Booking reference
                    </span>
                    <span className="font-mono text-2xl font-bold text-ink">
                      {booking.reference}
                    </span>
                    {payment?.paystackReference && (
                      <span className="mt-1 font-mono text-xs text-muted">
                        {siteConfig.paymentProvider} · {payment.paystackReference}
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-white p-6">
                  <h2 className="mb-4 text-base font-semibold text-ink">Your rental</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Detail icon={Calendar} label="Pickup" value={formatDate(new Date(booking.startDate))} />
                    <Detail icon={Calendar} label="Return" value={formatDate(new Date(booking.endDate))} />
                    <Detail icon={MapPin} label="Pickup point" value={booking.pickupLocation} />
                    <Detail
                      icon={ShieldCheck}
                      label="Service"
                      value={booking.serviceType === "chauffeur" ? "Chauffeur-driven" : "Self-drive"}
                    />
                  </div>

                  <div className="mt-6 border-t border-line pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-ink">{vehicle?.name ?? "Vehicle"}</p>
                        <p className="text-xs text-muted">
                          {vehicle?.plate ? `${vehicle.plate} · ` : ""}
                          {booking.days} day{booking.days === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className="text-lg font-semibold text-ink">
                        {formatGHS(booking.total)}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-muted">
                      <div className="flex justify-between">
                        <span>Refundable deposit held</span>
                        <span>{formatGHS(deposit?.amount ?? booking.deposit)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Balance remaining</span>
                        <span>{formatGHS(booking.balance)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-white p-6">
                  <h2 className="mb-3 text-base font-semibold text-ink">What happens next</h2>
                  <ul className="space-y-3 text-sm text-muted">
                    {[
                      "Bring your ID and driver's licence to pickup — the same documents you entered.",
                      "We will confirm the exact pickup time by phone the day before.",
                      "The security deposit is released back to you after the car is returned.",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Button variant="outline" onClick={addToCalendar}>
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    Add to calendar
                  </Button>
                  <Button variant="outline" onClick={downloadReceipt}>
                    <Download className="mr-2 h-4 w-4" />
                    Download receipt
                  </Button>
                  <a
                    href={`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(
                      `Hi Rigi-X, I have a question about booking ${booking.reference}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" className="w-full">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      WhatsApp us
                    </Button>
                  </a>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-5 text-sm">
                  <Link
                    href="/booking/lookup"
                    className="inline-flex items-center gap-2 text-brand hover:underline"
                  >
                    <User className="h-4 w-4" />
                    View or manage this booking
                  </Link>
                  <Link
                    href="/cars"
                    className="inline-flex items-center gap-2 text-muted hover:text-ink"
                  >
                    <ReceiptText className="h-4 w-4" />
                    Browse more cars
                  </Link>
                </div>
              </div>
            )}
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-mist text-brand">
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-xs text-muted">{label}</span>
        <span className="block text-sm font-medium text-ink">{value}</span>
      </span>
    </div>
  );
}
