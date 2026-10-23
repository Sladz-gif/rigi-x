"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarPlus,
  Car,
  CheckCircle2,
  Download,
  Loader2,
  MessageCircle,
  Search,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { lookupBooking } from "@/lib/mock/api";
import { useDb } from "@/lib/mock/store";
import { siteConfig } from "@/lib/site-config";
import { formatDate, formatGHS } from "@/lib/utils";

type Status = "idle" | "loading" | "found" | "missing";

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

export default function BookingLookupPage() {
  const db = useDb();
  const [reference, setReference] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [matchedId, setMatchedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const param = new URLSearchParams(window.location.search).get("ref");
      if (param) setReference(param.toUpperCase());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const booking = matchedId ? db.bookings.find((row) => row.id === matchedId) : undefined;
  const vehicle = booking ? db.vehicles.find((row) => row.id === booking.vehicleId) : undefined;
  const deposit = booking ? db.deposits.find((row) => row.bookingId === booking.id) : undefined;
  const found = status === "found" && booking !== undefined;

  const handleLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reference.trim() || !contact.trim()) {
      setStatus("missing");
      setMessage("Enter both your booking reference and the email or phone you used.");
      return;
    }
    setStatus("loading");
    setMessage("");
    setMatchedId(null);
    const view = await lookupBooking(reference, contact);
    if (!view) {
      setStatus("missing");
      setMessage("Nothing matched. Check the reference and the contact details you booked with.");
      return;
    }
    setMatchedId(view.booking.id);
    setStatus("found");
  };

  const addToCalendar = () => {
    if (!booking) return;
    const stamp = `${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Rigi-X//Booking//EN",
      "BEGIN:VEVENT",
      `UID:${booking.reference}@rigi-x.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${toIcsDate(booking.startDate)}`,
      `DTEND;VALUE=DATE:${toIcsDate(booking.endDate)}`,
      `SUMMARY:Rigi-X pickup — ${vehicle?.name ?? "your rental"}`,
      `LOCATION:${booking.pickupLocation}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ];
    triggerDownload(`${booking.reference}.ics`, lines.join("\r\n"), "text/calendar");
  };

  const downloadReceipt = () => {
    if (!booking) return;
    const body = [
      `RIGI-X — ${booking.reference}`,
      `Vehicle: ${vehicle?.name ?? "—"}`,
      `Dates: ${booking.startDate} to ${booking.endDate} (${booking.days} days)`,
      `Pickup: ${booking.pickupLocation}`,
      `Total: GHS ${booking.total}`,
      `Paid: GHS ${booking.paid}`,
      `Balance: GHS ${booking.balance}`,
      `Deposit held: GHS ${deposit?.amount ?? booking.deposit}`,
      `Status: ${booking.status.replace(/_/g, " ")}`,
    ].join("\n");
    triggerDownload(`${booking.reference}.txt`, body, "text/plain");
  };

  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen bg-mist py-10">
        <Container>
          <div className="mx-auto max-w-2xl">
            <div className="mb-8 text-center">
              <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-bold text-ink">
                Find my booking
              </h1>
              <p className="mt-3 text-muted">
                Enter your reference together with the email or phone number you booked with. We
                never show a booking to anyone who cannot prove both.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-white p-6 md:p-8">
              <form onSubmit={handleLookup} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">
                    Booking reference
                  </span>
                  <input
                    value={reference}
                    onChange={(event) => setReference(event.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-line bg-white px-4 py-3 font-mono text-sm text-ink focus:border-brand focus:outline-none"
                    placeholder="RGX-000000"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">
                    Email or phone number
                  </span>
                  <input
                    value={contact}
                    onChange={(event) => setContact(event.target.value)}
                    className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink focus:border-brand focus:outline-none"
                    placeholder="you@email.com or 024 000 0000"
                  />
                </label>

                <Button type="submit" size="lg" className="w-full" disabled={status === "loading"}>
                  {status === "loading" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching…
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Find booking
                    </>
                  )}
                </Button>
              </form>

              {status === "missing" && (
                <div className="mt-6 flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand/5 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                  <p className="text-sm text-brand">{message}</p>
                </div>
              )}

              {found && booking && (
                <div className="mt-6 border-t border-line pt-6">
                  <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <div className="text-sm">
                      <p className="font-semibold text-emerald-900">
                        {booking.reference} · {booking.status.replace(/_/g, " ")}
                      </p>
                      <p className="text-emerald-800">
                        {vehicle?.name ?? "Vehicle"} · {vehicle?.plate ?? ""}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-5 space-y-3 text-sm">
                    <Row label="Pickup" value={formatDate(new Date(booking.startDate))} />
                    <Row label="Return" value={formatDate(new Date(booking.endDate))} />
                    <Row label="Duration" value={`${booking.days} day${booking.days === 1 ? "" : "s"}`} />
                    <Row label="Pickup point" value={booking.pickupLocation} />
                    <Row
                      label="Service"
                      value={booking.serviceType === "chauffeur" ? "Chauffeur-driven" : "Self-drive"}
                    />
                    <Row label="Total" value={formatGHS(booking.total)} />
                    <Row label="Paid" value={formatGHS(booking.paid)} />
                    <Row label="Balance" value={formatGHS(booking.balance)} />
                    <Row label="Deposit held" value={formatGHS(deposit?.amount ?? booking.deposit)} />
                  </dl>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <Button variant="outline" onClick={addToCalendar}>
                      <CalendarPlus className="mr-2 h-4 w-4" />
                      Calendar
                    </Button>
                    <Button variant="outline" onClick={downloadReceipt}>
                      <Download className="mr-2 h-4 w-4" />
                      Receipt
                    </Button>
                    <a
                      href={`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(
                        `Hi Rigi-X, a question about booking ${booking.reference}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" className="w-full">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        WhatsApp
                      </Button>
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col items-center gap-2 text-center text-sm text-muted">
              <p>Lost your reference? Check the confirmation email or message we sent you.</p>
              <Link
                href="/cars"
                className="inline-flex items-center gap-2 text-brand hover:underline"
              >
                <Car className="h-4 w-4" />
                Start a new booking
              </Link>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
