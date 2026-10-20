"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { cars } from "@/data/cars";
import { BookingFormData } from "@/types";
import { Check, ChevronRight, ChevronLeft, Send, Mail } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { formatGHS } from "@/lib/utils";

const STORAGE_KEY = "rigix_booking_draft";

function BookPageContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [bookingRef, setBookingRef] = useState("");

  const [formData, setFormData] = useState<BookingFormData>(() => {
    // Load from localStorage or initialize from URL params
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }

    return {
      location: searchParams.get("location") || "Accra Airport (KIA)",
      pickupDate: searchParams.get("pickup") || "",
      returnDate: searchParams.get("return") || "",
      serviceType: (searchParams.get("service") as "self-drive" | "chauffeur") || "self-drive",
      carSlug: searchParams.get("car") || undefined,
      extras: {
        childSeat: false,
        gps: false,
        additionalDriver: false,
        chauffeur: false,
        fullInsurance: false,
      },
      driverDetails: {
        fullName: "",
        phone: "",
        email: "",
        idType: "",
        licenseNumber: "",
        ageConfirmed: false,
      },
      termsAccepted: false,
      paymentPreference: "mobile-money",
    };
  });

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  }, [formData]);

  const selectedCar = formData.carSlug ? cars.find((c) => c.slug === formData.carSlug) : null;

  const validateStep = (currentStep: number) => {
    switch (currentStep) {
      case 1:
        return formData.pickupDate && formData.returnDate && formData.location;
      case 2:
        return formData.carSlug;
      case 3:
        return (
          formData.driverDetails.fullName &&
          formData.driverDetails.phone &&
          formData.driverDetails.email &&
          formData.driverDetails.idType &&
          formData.driverDetails.licenseNumber &&
          formData.driverDetails.ageConfirmed
        );
      case 4:
        return formData.termsAccepted;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(step) && step < 4) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const calculateTotal = () => {
    if (!selectedCar || !formData.pickupDate || !formData.returnDate) return { days: 0, total: 0 };

    const pickup = new Date(formData.pickupDate);
    const returnD = new Date(formData.returnDate);
    const days = Math.max(1, Math.ceil((returnD.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24)));

    let total = days * selectedCar.pricePerDay;

    if (formData.extras.childSeat) total += days * 50;
    if (formData.extras.gps) total += days * 30;
    if (formData.extras.additionalDriver) total += days * 50;
    if (formData.extras.chauffeur) total += days * 300;
    if (formData.extras.fullInsurance) total += days * 100;

    return { days, total };
  };

  const handleSubmit = () => {
    if (!validateStep(4)) return;

    // Generate booking reference
    const ref = "RGX-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    setBookingRef(ref);
    setIsSuccess(true);

    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY);
  };

  const generateWhatsAppMessage = () => {
    if (!selectedCar) return "";

    const { days, total } = calculateTotal();
    const msg = `
Hi Rigi-X,

I would like to make a booking:

Booking Reference: ${bookingRef}

Vehicle: ${selectedCar.brand} ${selectedCar.name}
Service: ${formData.serviceType === "self-drive" ? "Self-drive" : "Chauffeur-driven"}
Pickup: ${formData.pickupDate} from ${formData.location}
Return: ${formData.returnDate}
Duration: ${days} day(s)

Driver Details:
Name: ${formData.driverDetails.fullName}
Phone: ${formData.driverDetails.phone}
Email: ${formData.driverDetails.email}

Total: ${formatGHS(total)}
Deposit: ${formatGHS(selectedCar.deposit)}

Payment preference: ${formData.paymentPreference}

Please confirm availability.
    `.trim();

    return encodeURIComponent(msg);
  };

  const generateMailto = () => {
    if (!selectedCar) return "";

    const { days, total } = calculateTotal();
    const subject = `Booking Request - ${bookingRef}`;
    const body = `
Hi Rigi-X,

I would like to make a booking:

Booking Reference: ${bookingRef}

Vehicle: ${selectedCar.brand} ${selectedCar.name}
Service: ${formData.serviceType === "self-drive" ? "Self-drive" : "Chauffeur-driven"}
Pickup: ${formData.pickupDate} from ${formData.location}
Return: ${formData.returnDate}
Duration: ${days} day(s)

Driver Details:
Name: ${formData.driverDetails.fullName}
Phone: ${formData.driverDetails.phone}
Email: ${formData.driverDetails.email}

Total: ${formatGHS(total)}
Deposit: ${formatGHS(selectedCar.deposit)}

Payment preference: ${formData.paymentPreference}

Please confirm availability.
    `.trim();

    return `mailto:${siteConfig.emailAdmin}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (isSuccess) {
    return (
      <>
        <Header />
        <main id="main-content">
          <Section>
            <Container>
              <div className="max-w-2xl mx-auto text-center">
                <div className="w-20 h-20 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10 text-brand" />
                </div>
                <h1 className="text-3xl font-bold text-ink mb-4">Booking Submitted!</h1>
                <p className="text-lg text-muted mb-2">
                  Your booking reference is:
                </p>
                <p className="text-2xl font-bold text-brand mb-6">{bookingRef}</p>
                <p className="text-muted mb-8">
                  A team member will confirm availability and contact you shortly.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href={`https://wa.me/${siteConfig.whatsappNumber}?text=${generateWhatsAppMessage()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="lg">
                      <Send className="w-4 h-4 mr-2" />
                      Send via WhatsApp
                    </Button>
                  </a>
                  <a href={generateMailto()}>
                    <Button size="lg" variant="outline">
                      <Mail className="w-4 h-4 mr-2" />
                      Email us
                    </Button>
                  </a>
                </div>
              </div>
            </Container>
          </Section>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main id="main-content">
        <Section>
          <Container>
            <div className="max-w-4xl mx-auto">
              {/* Progress Indicator */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  {[1, 2, 3, 4].map((s) => (
                    <div
                      key={s}
                      className={`flex items-center ${
                        s < 4 ? "flex-1" : ""
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                          step >= s
                            ? "bg-brand text-white"
                            : "bg-mist text-muted"
                        }`}
                      >
                        {step > s ? <Check className="w-5 h-5" /> : s}
                      </div>
                      {s < 4 && (
                        <div
                          className={`flex-1 h-1 mx-2 ${
                            step > s ? "bg-brand" : "bg-line"
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-sm text-muted">
                  <span>Trip</span>
                  <span>Car</span>
                  <span>Details</span>
                  <span>Review</span>
                </div>
              </div>

              {/* Step Content */}
              <div className="bg-white rounded-2xl border border-line p-6 md:p-8 mb-6">
                {step === 1 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-ink">Trip Details</h2>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-2">
                        Pickup location
                      </label>
                      <select
                        value={formData.location}
                        onChange={(e) =>
                          setFormData({ ...formData, location: e.target.value })
                        }
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-ink mb-2">
                          Pickup date
                        </label>
                        <input
                          type="date"
                          value={formData.pickupDate}
                          onChange={(e) =>
                            setFormData({ ...formData, pickupDate: e.target.value })
                          }
                          className="w-full px-4 py-2.5 rounded-lg border border-line bg-mist text-ink focus:outline-none focus:border-brand"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ink mb-2">
                          Return date
                        </label>
                        <input
                          type="date"
                          value={formData.returnDate}
                          onChange={(e) =>
                            setFormData({ ...formData, returnDate: e.target.value })
                          }
                          min={formData.pickupDate}
                          className="w-full px-4 py-2.5 rounded-lg border border-line bg-mist text-ink focus:outline-none focus:border-brand"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-2">
                        Service type
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() =>
                            setFormData({ ...formData, serviceType: "self-drive" })
                          }
                          className={`px-4 py-2.5 rounded-lg border transition-colors ${
                            formData.serviceType === "self-drive"
                              ? "border-brand bg-brand text-white"
                              : "border-line bg-white text-ink hover:border-brand"
                          }`}
                        >
                          Self-drive
                        </button>
                        <button
                          onClick={() =>
                            setFormData({ ...formData, serviceType: "chauffeur" })
                          }
                          className={`px-4 py-2.5 rounded-lg border transition-colors ${
                            formData.serviceType === "chauffeur"
                              ? "border-brand bg-brand text-white"
                              : "border-line bg-white text-ink hover:border-brand"
                          }`}
                        >
                          Chauffeur-driven
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-ink">Choose Your Vehicle</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {cars.map((car) => (
                        <button
                          key={car.slug}
                          onClick={() => setFormData({ ...formData, carSlug: car.slug })}
                          className={`p-4 rounded-xl border-2 text-left transition-colors ${
                            formData.carSlug === car.slug
                              ? "border-brand bg-brand/5"
                              : "border-line hover:border-brand"
                          }`}
                        >
                          <div className="font-semibold text-ink mb-1">
                            {car.brand} {car.name}
                          </div>
                          <div className="text-sm text-muted capitalize mb-2">
                            {car.category}
                          </div>
                          <div className="font-bold text-brand">
                            {formatGHS(car.pricePerDay)} / day
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-ink">Extras & Driver Details</h2>
                    
                    {/* Extras */}
                    <div>
                      <h3 className="font-semibold text-ink mb-3">Add extras</h3>
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
                            onClick={() =>
                              setFormData({
                                ...formData,
                                extras: {
                                  ...formData.extras,
                                  [extra.key]: !formData.extras[extra.key],
                                },
                              })
                            }
                            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                              formData.extras[extra.key]
                                ? "border-brand bg-brand/5"
                                : "border-line hover:border-brand"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-5 h-5 rounded border flex items-center justify-center ${
                                  formData.extras[extra.key]
                                    ? "border-brand bg-brand text-white"
                                    : "border-line"
                                }`}
                              >
                                {formData.extras[extra.key] && <Check className="w-3 h-3" />}
                              </div>
                              <span className="text-sm text-ink">{extra.label}</span>
                            </div>
                            <span className="text-sm text-muted">{extra.price}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Driver Details */}
                    <div>
                      <h3 className="font-semibold text-ink mb-3">Driver Details</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-ink mb-2">
                            Full name *
                          </label>
                          <input
                            type="text"
                            value={formData.driverDetails.fullName}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                driverDetails: {
                                  ...formData.driverDetails,
                                  fullName: e.target.value,
                                },
                              })
                            }
                            className="w-full px-4 py-2.5 rounded-lg border border-line bg-mist text-ink focus:outline-none focus:border-brand"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-ink mb-2">
                              Phone *
                            </label>
                            <input
                              type="tel"
                              value={formData.driverDetails.phone}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  driverDetails: {
                                    ...formData.driverDetails,
                                    phone: e.target.value,
                                  },
                                })
                              }
                              className="w-full px-4 py-2.5 rounded-lg border border-line bg-mist text-ink focus:outline-none focus:border-brand"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-ink mb-2">
                              Email *
                            </label>
                            <input
                              type="email"
                              value={formData.driverDetails.email}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  driverDetails: {
                                    ...formData.driverDetails,
                                    email: e.target.value,
                                  },
                                })
                              }
                              className="w-full px-4 py-2.5 rounded-lg border border-line bg-mist text-ink focus:outline-none focus:border-brand"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-ink mb-2">
                              ID type *
                            </label>
                            <select
                              value={formData.driverDetails.idType}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  driverDetails: {
                                    ...formData.driverDetails,
                                    idType: e.target.value,
                                  },
                                })
                              }
                              className="w-full px-4 py-2.5 rounded-lg border border-line bg-mist text-ink focus:outline-none focus:border-brand"
                            >
                              <option value="">Select ID type</option>
                              <option>Ghana Card</option>
                              <option>Driver&apos;s License</option>
                              <option>Passport</option>
                              <option>National ID</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-ink mb-2">
                              License number *
                            </label>
                            <input
                              type="text"
                              value={formData.driverDetails.licenseNumber}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  driverDetails: {
                                    ...formData.driverDetails,
                                    licenseNumber: e.target.value,
                                  },
                                })
                              }
                              className="w-full px-4 py-2.5 rounded-lg border border-line bg-mist text-ink focus:outline-none focus:border-brand"
                            />
                          </div>
                        </div>
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.driverDetails.ageConfirmed}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                driverDetails: {
                                  ...formData.driverDetails,
                                  ageConfirmed: e.target.checked,
                                },
                              })
                            }
                            className="mt-1"
                          />
                          <span className="text-sm text-ink">
                            I confirm that I am at least 21 years old (25 for luxury vehicles)
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-ink">Review & Confirm</h2>
                    
                    {selectedCar && (
                      <div className="bg-mist rounded-xl p-4 space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted">Vehicle</span>
                          <span className="font-medium text-ink">
                            {selectedCar.brand} {selectedCar.name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">Service</span>
                          <span className="font-medium text-ink">
                            {formData.serviceType === "self-drive"
                              ? "Self-drive"
                              : "Chauffeur-driven"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">Pickup</span>
                          <span className="font-medium text-ink">
                            {formData.pickupDate} from {formData.location}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">Return</span>
                          <span className="font-medium text-ink">{formData.returnDate}</span>
                        </div>
                        <div className="border-t border-line pt-3 mt-3">
                          <div className="flex justify-between font-semibold">
                            <span className="text-ink">Total</span>
                            <span className="text-brand">{formatGHS(calculateTotal().total)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-muted mt-1">
                            <span>Security deposit (refundable)</span>
                            <span>{formatGHS(selectedCar.deposit)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-ink mb-2">
                        Payment preference
                      </label>
                      <select
                        value={formData.paymentPreference}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            paymentPreference: e.target.value as "mobile-money" | "card" | "bank-transfer",
                          })
                        }
                        className="w-full px-4 py-2.5 rounded-lg border border-line bg-mist text-ink focus:outline-none focus:border-brand"
                      >
                        <option value="mobile-money">Mobile Money</option>
                        <option value="card">Card</option>
                        <option value="bank-transfer">Bank Transfer</option>
                      </select>
                      <p className="text-xs text-muted mt-2">
                        * Payment is arranged after confirmation
                      </p>
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.termsAccepted}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            termsAccepted: e.target.checked,
                          })
                        }
                        className="mt-1"
                      />
                      <span className="text-sm text-ink">
                        I accept the rental terms and conditions
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={step === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={step === 4 ? handleSubmit : nextStep}
                  disabled={!validateStep(step)}
                >
                  {step === 4 ? "Confirm booking" : "Next"}
                  {step < 4 && <ChevronRight className="w-4 h-4 ml-2" />}
                </Button>
              </div>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookPageContent />
    </Suspense>
  );
}
