"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Car as CarType } from "@/types";
import { Button } from "@/components/ui/button";
import { formatGHS } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";
import { Check, Calendar, MapPin, User } from "lucide-react";

interface BookingCardProps {
  car: CarType;
}

export function BookingCard({ car }: BookingCardProps) {
  const router = useRouter();
  const [pickupDate, setPickupDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [location, setLocation] = useState("Accra Airport (KIA)");
  const [serviceType, setServiceType] = useState<"self-drive" | "chauffeur">(
    car.selfDriveAvailable ? "self-drive" : "chauffeur"
  );
  const [extras, setExtras] = useState({
    childSeat: false,
    gps: false,
    additionalDriver: false,
    chauffeur: false,
    fullInsurance: false,
  });

  const calculateTotal = () => {
    if (!pickupDate || !returnDate) return { days: 0, total: 0 };

    const pickup = new Date(pickupDate);
    const returnD = new Date(returnDate);
    const days = Math.max(1, Math.ceil((returnD.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24)));

    let total = days * car.pricePerDay;

    if (extras.childSeat) total += days * 50;
    if (extras.gps) total += days * 30;
    if (extras.additionalDriver) total += days * 50;
    if (extras.chauffeur) total += days * 300;
    if (extras.fullInsurance) total += days * 100;

    return { days, total };
  };

  const { days, total } = calculateTotal();

  const toggleExtra = (key: keyof typeof extras) => {
    setExtras((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isChauffeurRequired = !car.selfDriveAvailable;

  return (
    <div className="bg-white rounded-2xl border border-line p-6 shadow-lg sticky top-24">
      <div className="mb-6">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-bold text-ink">{formatGHS(car.pricePerDay)}</span>
          <span className="text-muted">/ day</span>
        </div>
        {car.category === "luxury" && (
          <p className="text-sm text-muted">From price shown</p>
        )}
      </div>

      <div className="space-y-4 mb-6">
        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-ink mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Pickup location
          </label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-line bg-mist text-ink focus:outline-none focus:border-brand"
          >
            <option>Accra Airport (KIA)</option>
            <option>Dzorwulu</option>
            <option>Airport Residential</option>
            <option>East Legon</option>
            <option>Osu</option>
            <option>Custom address</option>
          </select>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Pickup
            </label>
            <input
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-line bg-mist text-ink focus:outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Return
            </label>
            <input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              min={pickupDate}
              className="w-full px-4 py-2.5 rounded-lg border border-line bg-mist text-ink focus:outline-none focus:border-brand"
            />
          </div>
        </div>

        {/* Service Type */}
        <div>
          <label className="block text-sm font-medium text-ink mb-2 flex items-center gap-2">
            <User className="w-4 h-4" />
            Service type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setServiceType("self-drive")}
              disabled={!car.selfDriveAvailable}
              className={`px-4 py-2.5 rounded-lg border transition-colors ${
                serviceType === "self-drive"
                  ? "border-brand bg-brand text-white"
                  : !car.selfDriveAvailable
                  ? "border-line bg-mist text-muted cursor-not-allowed"
                  : "border-line bg-white text-ink hover:border-brand"
              }`}
            >
              Self-drive
            </button>
            <button
              onClick={() => setServiceType("chauffeur")}
              disabled={!car.chauffeurAvailable}
              className={`px-4 py-2.5 rounded-lg border transition-colors ${
                serviceType === "chauffeur"
                  ? "border-brand bg-brand text-white"
                  : !car.chauffeurAvailable
                  ? "border-line bg-mist text-muted cursor-not-allowed"
                  : "border-line bg-white text-ink hover:border-brand"
              }`}
            >
              Chauffeur
            </button>
          </div>
          {isChauffeurRequired && (
            <p className="text-xs text-muted mt-2">
              * This vehicle is chauffeur-only
            </p>
          )}
        </div>
      </div>

      {/* Extras */}
      <div className="border-t border-line pt-4 mb-6">
        <h4 className="font-medium text-ink mb-3">Add extras</h4>
        <div className="space-y-2">
          {[
            { key: "childSeat" as const, label: "Child seat", price: "₵50/day" },
            { key: "gps" as const, label: "GPS navigation", price: "₵30/day" },
            { key: "additionalDriver" as const, label: "Additional driver", price: "₵50/day" },
            { key: "chauffeur" as const, label: "Chauffeur service", price: "₵300/day" },
            { key: "fullInsurance" as const, label: "Full insurance", price: "₵100/day" },
          ].map((extra) => (
            <button
              key={extra.key}
              onClick={() => toggleExtra(extra.key)}
              disabled={extra.key === "chauffeur" && serviceType === "chauffeur"}
              className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                extras[extra.key]
                  ? "border-brand bg-brand/5"
                  : "border-line hover:border-brand"
              } ${extra.key === "chauffeur" && serviceType === "chauffeur" ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center ${
                    extras[extra.key]
                      ? "border-brand bg-brand text-white"
                      : "border-line"
                  }`}
                >
                  {extras[extra.key] && <Check className="w-3 h-3" />}
                </div>
                <span className="text-sm text-ink">{extra.label}</span>
              </div>
              <span className="text-sm text-muted">{extra.price}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Price Breakdown */}
      {days > 0 && (
        <div className="border-t border-line pt-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted">
              {days} day{days !== 1 ? "s" : ""} × {formatGHS(car.pricePerDay)}
            </span>
            <span className="text-ink">{formatGHS(days * car.pricePerDay)}</span>
          </div>
          {Object.entries(extras).some(([, v]) => v) && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Extras</span>
              <span className="text-ink">
                {formatGHS(total - days * car.pricePerDay)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm font-medium">
            <span className="text-ink">Total</span>
            <span className="text-ink">{formatGHS(total)}</span>
          </div>
          <div className="flex justify-between text-xs text-muted pt-2 border-t border-line">
            <span>Security deposit (refundable)</span>
            <span>{formatGHS(car.deposit)}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <Button
          onClick={() => {
            // Navigate to checkout with pre-filled data
            const params = new URLSearchParams({
              car: car.slug,
              startDate: pickupDate,
              endDate: returnDate,
              serviceType: serviceType,
            });
            router.push(`/checkout?${params.toString()}`);
          }}
          disabled={!pickupDate || !returnDate}
          className="w-full"
        >
          Proceed to Checkout
        </Button>
        <Button
          onClick={() => {
            // Navigate to booking wizard with pre-filled data
            const params = new URLSearchParams({
              car: car.slug,
              pickup: pickupDate,
              return: returnDate,
              location,
              service: serviceType,
            });
            router.push(`/book?${params.toString()}`);
          }}
          disabled={!pickupDate || !returnDate}
          variant="outline"
          className="w-full"
        >
          Continue to booking wizard
        </Button>
        <a
          href={`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(
            `Hi, I'm interested in booking the ${car.brand} ${car.name}.`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full"
        >
          <Button variant="outline" className="w-full">
            Ask on WhatsApp
          </Button>
        </a>
      </div>

      {/* Terms */}
      <p className="text-xs text-muted mt-4 text-center">
        * Minimum {car.minDays} day{car.minDays !== 1 ? "s" : ""} for self-drive
      </p>
    </div>
  );
}
