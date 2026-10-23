"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  Check,
  CreditCard,
  Info,
  Lock,
  MapPin,
  Plane,
  ShieldCheck,
  Smartphone,
  Upload,
  X,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EXTRA_LABELS, calculateCheckoutTotals, type Extras } from "@/lib/pricing";
import {
  PAYSTACK_MODE,
  abandonCheckout,
  confirmCheckoutPayment,
  getSeedCar,
  initializeCheckout,
  validatePromo,
  type PromoResult,
} from "@/lib/mock/api";
import { useDb } from "@/lib/mock/store";
import { siteConfig } from "@/lib/site-config";
import { cn, formatGHS } from "@/lib/utils";

/* --------------------------------------------------------------- schema */

const guestSchema = z.object({
  fullName: z.string().min(2, "Please enter the name on your ID"),
  phone: z.string().min(9, "Enter a reachable phone number"),
  phoneAlt: z.string(),
  email: z.string().email("Enter a valid email address"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  nationality: z.enum(["Ghana resident", "International visitor"]),
  idType: z.enum(["Ghana Card", "Passport", "National ID"]),
  idNumber: z.string().min(3, "Enter your ID number"),
  licenceNumber: z.string().min(3, "Enter your driver's licence number"),
  licenceCountry: z.string().min(2, "Enter the country that issued your licence"),
  licenceExpiry: z.string().min(1, "Licence expiry date is required"),
  address: z.string().min(4, "Enter your residential address"),
  city: z.string().min(2, "Enter your city"),
  emergencyName: z.string().min(2, "Emergency contact name is required"),
  emergencyPhone: z.string().min(9, "Emergency contact phone is required"),
  deliveryAddress: z.string(),
  flightNumber: z.string(),
  chauffeurPickup: z.string(),
  chauffeurDropoff: z.string(),
  passengers: z.string(),
  specialRequests: z.string(),
  agreeTerms: z.boolean().refine((value) => value === true, "Please accept the rental terms"),
  agreePrivacy: z.boolean().refine((value) => value === true, "Please accept the privacy policy"),
  confirmAccurate: z.boolean().refine((value) => value === true, "Please confirm your details are accurate"),
});

type GuestForm = z.infer<typeof guestSchema>;

const EMPTY_EXTRAS: Extras = {
  childSeat: false,
  gps: false,
  additionalDriver: false,
  chauffeur: false,
  fullInsurance: false,
};

const STEP_LABELS = ["Your details", "Review", "Payment"];

const DEMO_MODE = PAYSTACK_MODE === "demo";

interface CheckoutParams {
  carSlug: string;
  startDate: string;
  endDate: string;
  serviceType: "self-drive" | "chauffeur";
}

interface UploadedFile {
  label: string;
  name: string;
  sizeKb: number;
}

interface PaySession {
  reference: string;
  amount: number;
  email: string;
  method: "card" | "mobile_money" | "bank_transfer";
}

function isoInDays(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

const inputClass =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink transition-colors placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10";

function Labelled({
  label,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-center justify-between text-sm font-medium text-ink">
        {label}
        {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1.5 block text-xs text-brand">{error}</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-brand">
      <AlertCircle className="h-3.5 w-3.5" />
      {message}
    </p>
  );
}

/* --------------------------------------------------------- page */

export default function CheckoutPage() {
  const router = useRouter();
  const db = useDb();

  const [params, setParams] = useState<CheckoutParams | null>(null);
  const [step, setStep] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [serviceType, setServiceType] = useState<"self-drive" | "chauffeur">("self-drive");
  const [extras, setExtras] = useState<Extras>(EMPTY_EXTRAS);
  const [delivery, setDelivery] = useState(false);
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [review, setReview] = useState<GuestForm | null>(null);

  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<PromoResult | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoMessage, setPromoMessage] = useState("");
  const [promoError, setPromoError] = useState(false);

  const [formError, setFormError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [paySession, setPaySession] = useState<PaySession | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [method, setMethod] = useState<PaySession["method"]>("card");

  const paramsRead = useRef(false);
  const uploadSeq = useRef(0);

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors },
  } = useForm<GuestForm>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      phoneAlt: "",
      email: "",
      dateOfBirth: "",
      nationality: "Ghana resident",
      idType: "Ghana Card",
      idNumber: "",
      licenceNumber: "",
      licenceCountry: "Ghana",
      licenceExpiry: "",
      address: "",
      city: "Accra",
      emergencyName: "",
      emergencyPhone: "",
      deliveryAddress: "",
      flightNumber: "",
      chauffeurPickup: "",
      chauffeurDropoff: "",
      passengers: "1",
      specialRequests: "",
      agreeTerms: false,
      agreePrivacy: false,
      confirmAccurate: false,
    },
  });

  /* Read the entry-point query string after mount (keeps the page static). */
  useEffect(() => {
    if (paramsRead.current) return;
    paramsRead.current = true;
    const timer = window.setTimeout(() => {
      const search = new URLSearchParams(window.location.search);
      const start = search.get("startDate") ?? "";
      const end = search.get("endDate") ?? "";
      const service: CheckoutParams["serviceType"] =
        search.get("serviceType") === "chauffeur" ? "chauffeur" : "self-drive";

      setParams({
        carSlug: search.get("car") ?? "",
        startDate: start,
        endDate: end,
        serviceType: service,
      });
      setStartDate(start || isoInDays(1));
      setEndDate(end || isoInDays(4));
      setServiceType(service);
      reset((values) => ({ ...values, nationality: "Ghana resident", idType: "Ghana Card" }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [reset]);

  const car = useMemo(
    () => (params?.carSlug ? getSeedCar(params.carSlug) : undefined),
    [params]
  );

  const taxEnabled = db.settings.find((setting) => setting.key === "tax.enabled")?.value === "true";
  const taxRate = Number(db.settings.find((setting) => setting.key === "tax.vat")?.value ?? 0);
  const deliveryFee = Number(db.settings.find((setting) => setting.key === "fee.delivery")?.value ?? 80);

  const totals = useMemo(() => {
    if (!car || !startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    if (end.getTime() <= start.getTime()) return null;
    return calculateCheckoutTotals(car, start, end, extras, {
      promoPercent: promo?.kind === "percent" ? promo.value : 0,
      promoFixed: promo?.kind === "fixed" ? promo.value : 0,
      promoLabel: promo?.code ?? "",
      taxRate: taxEnabled ? taxRate : 0,
      delivery,
      deliveryFee,
    });
  }, [car, startDate, endDate, extras, promo, taxEnabled, taxRate, delivery, deliveryFee]);

  const dailyRate = car?.pricePerDay ?? 0;

  /* -------------------------------------------------------- handlers */

  const toggleExtra = (key: keyof Extras) => {
    setExtras((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const applyPromo = async () => {
    if (!promoInput.trim()) {
      setPromo(null);
      setPromoError(true);
      setPromoMessage("Enter a promo code first.");
      return;
    }
    setPromoBusy(true);
    setPromoMessage("");
    const result = await validatePromo(promoInput);
    setPromoBusy(false);
    if (!result) {
      setPromo(null);
      setPromoError(true);
      setPromoMessage("That code is not valid, or it has expired.");
      return;
    }
    setPromo(result);
    setPromoError(false);
    setPromoMessage(
      result.kind === "percent"
        ? `${result.code} applied — ${result.value}% off.`
        : `${result.code} applied — ${formatGHS(result.value)} off.`
    );
  };

  const removePromo = () => {
    setPromo(null);
    setPromoInput("");
    setPromoMessage("");
    setPromoError(false);
  };

  const handleUpload = (label: string, file: File | null) => {
    if (!file) return;
    uploadSeq.current += 1;
    const entry: UploadedFile = {
      label,
      name: file.name,
      sizeKb: Math.max(1, Math.round(file.size / 1024)),
    };
    setUploads((prev) => [...prev.filter((item) => item.label !== label), entry]);
  };

  const startPayment = async (data: GuestForm) => {
    if (!car || !params) return;
    setFormError("");
    setProcessing(true);

    const pickupLocation = delivery
      ? data.deliveryAddress || "Delivery to your address"
      : serviceType === "chauffeur"
      ? data.chauffeurPickup || "Dzorwulu HQ, Accra"
      : "Rigi-X HQ, Dzorwulu, Accra";
    const dropoffLocation =
      serviceType === "chauffeur" && data.chauffeurDropoff
        ? data.chauffeurDropoff
        : pickupLocation;

    const result = await initializeCheckout({
      vehicleSlug: car.slug,
      startDate,
      endDate,
      serviceType,
      pickupLocation,
      dropoffLocation,
      extras,
      promoCode: promo?.code ?? "",
      delivery,
      guest: {
        fullName: data.fullName,
        phone: data.phone,
        phoneAlt: data.phoneAlt,
        email: data.email,
        dateOfBirth: data.dateOfBirth,
        nationality: data.nationality,
        idType: data.idType,
        idNumber: data.idNumber,
        licenceNumber: data.licenceNumber,
        licenceCountry: data.licenceCountry,
        licenceExpiry: data.licenceExpiry,
        address: data.address,
        city: data.city,
        emergencyName: data.emergencyName,
        emergencyPhone: data.emergencyPhone,
        deliveryAddress: delivery ? data.deliveryAddress : "",
        flightNumber: data.flightNumber,
        chauffeurPickup: data.chauffeurPickup,
        chauffeurDropoff: data.chauffeurDropoff,
        passengers: data.passengers,
        specialRequests: data.specialRequests,
      },
    });

    setProcessing(false);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    setMethod("card");
    setPaySession({
      reference: result.reference,
      amount: result.amount,
      email: result.email,
      method: "card",
    });
    setPayOpen(true);
  };

  const onSubmit = async (data: GuestForm) => {
    if (step === 1) {
      if (!startDate || !endDate) {
        setFormError("Choose your pickup and return dates.");
        return;
      }
      if (new Date(endDate).getTime() <= new Date(startDate).getTime()) {
        setFormError("The return date must be after the pickup date.");
        return;
      }
      if (delivery && !data.deliveryAddress.trim()) {
        setFormError("Add the address where we should deliver the car.");
        return;
      }
      setFormError("");
      setReview(data);
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (step === 2) {
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    await startPayment(data);
  };

  const completePayment = async () => {
    if (!paySession) return;
    setPaying(true);
    const booking = await confirmCheckoutPayment(paySession.reference);
    setPaying(false);
    if (!booking) {
      setFormError("We could not confirm that payment. Please try again.");
      setPayOpen(false);
      setPaySession(null);
      return;
    }
    router.push(`/checkout/success?ref=${encodeURIComponent(paySession.reference)}`);
  };

  const cancelPayment = async () => {
    if (paySession) await abandonCheckout(paySession.reference);
    setPayOpen(false);
    setPaySession(null);
  };

  const goBack = () => {
    setFormError("");
    setStep((current) => Math.max(1, current - 1));
  };

  /* ----------------------------------------------------------- render */

  const reviewData = review ?? getValues();
  const loadingParams = params === null;
  const vehicleMissing = !loadingParams && !car;

  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen bg-mist pb-32 pt-8 lg:pb-16">
        <Container>
          <div className="mx-auto max-w-6xl">
            {DEMO_MODE && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-900">Demo checkout</p>
                  <p className="text-amber-800">
                    Payments are simulated end to end. The Paystack flow is replayed locally — no
                    card is charged and no request leaves your browser.
                  </p>
                </div>
              </div>
            )}

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <Link
                href={car ? `/cars/${car.slug}` : "/cars"}
                className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to vehicle
              </Link>
              <span className="inline-flex items-center gap-2 text-xs text-muted">
                <Lock className="h-3.5 w-3.5" />
                Secure checkout · {siteConfig.paymentProvider}
              </span>
            </div>

            {!vehicleMissing && <StepBar step={step} />}

            {loadingParams && <CheckoutSkeleton />}

            {vehicleMissing && (
              <div className="rounded-2xl border border-line bg-white p-10 text-center">
                <AlertCircle className="mx-auto mb-4 h-10 w-10 text-brand" />
                <h1 className="text-xl font-semibold text-ink">We could not load that vehicle</h1>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                  The link you followed is missing a vehicle. Pick a car to start a new booking.
                </p>
                <Link href="/cars" className="mt-6 inline-block">
                  <Button>Browse the fleet</Button>
                </Link>
              </div>
            )}

            {!loadingParams && car && (
              <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <MobileSummary
                    open={summaryOpen}
                    onToggle={() => setSummaryOpen((value) => !value)}
                    carName={`${car.brand} ${car.name}`}
                    startDate={startDate}
                    endDate={endDate}
                    total={totals?.total ?? 0}
                    days={totals?.days ?? 0}
                  />

                  {formError && (
                    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand/5 p-4">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                      <p className="text-sm text-brand">{formError}</p>
                    </div>
                  )}

                  <form
                    id="checkout-form"
                    onSubmit={handleSubmit(onSubmit)}
                    className="rounded-2xl border border-line bg-white p-6 md:p-8"
                  >
                    {step === 1 && (
                      <DetailsStep
                        car={car}
                        register={register}
                        errors={errors}
                        startDate={startDate}
                        endDate={endDate}
                        onStartDate={setStartDate}
                        onEndDate={setEndDate}
                        serviceType={serviceType}
                        onServiceType={setServiceType}
                        extras={extras}
                        onToggleExtra={toggleExtra}
                        delivery={delivery}
                        onDelivery={setDelivery}
                        uploads={uploads}
                        onUpload={handleUpload}
                        promoInput={promoInput}
                        onPromoInput={setPromoInput}
                        promo={promo}
                        promoBusy={promoBusy}
                        promoMessage={promoMessage}
                        promoError={promoError}
                        onApplyPromo={applyPromo}
                        onRemovePromo={removePromo}
                      />
                    )}

                    {step === 2 && (
                      <ReviewStep
                        car={car}
                        data={reviewData}
                        startDate={startDate}
                        endDate={endDate}
                        serviceType={serviceType}
                        extras={extras}
                        delivery={delivery}
                        uploads={uploads}
                        totals={totals}
                        promo={promo}
                      />
                    )}

                    {step === 3 && (
                      <PaymentStep
                        totals={totals}
                        dailyRate={dailyRate}
                        email={reviewData.email}
                        onOpenSummary={() => setSummaryOpen(true)}
                      />
                    )}

                    <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row">
                      {step > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={goBack}
                          className="sm:flex-1"
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back
                        </Button>
                      )}
                      <Button type="submit" size="lg" disabled={processing} className="sm:flex-1">
                        {processing ? (
                          "Starting secure payment…"
                        ) : step === 1 ? (
                          <>
                            Review booking
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        ) : step === 2 ? (
                          <>
                            Continue to payment
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        ) : (
                          <>
                            <Lock className="mr-2 h-4 w-4" />
                            Pay {formatGHS(totals?.total ?? 0)}
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </div>

                <div className="hidden lg:col-span-1 lg:block">
                  <SummaryCard
                    car={car}
                    startDate={startDate}
                    endDate={endDate}
                    serviceType={serviceType}
                    extras={extras}
                    delivery={delivery}
                    totals={totals}
                    promo={promo}
                  />
                </div>
              </div>
            )}
          </div>
        </Container>
      </main>
      <Footer />

      {!loadingParams && car && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 p-4 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setSummaryOpen((value) => !value)}
              className="text-left"
            >
              <span className="block text-xs text-muted">
                {totals?.days ?? 0} day{(totals?.days ?? 0) === 1 ? "" : "s"} · total
              </span>
              <span className="block text-lg font-semibold text-ink">
                {formatGHS(totals?.total ?? 0)}
              </span>
            </button>
            <Button
              type="submit"
              form="checkout-form"
              disabled={processing}
              className="shrink-0"
            >
              {processing ? "Please wait…" : step === 1 ? "Review" : step === 2 ? "To payment" : "Pay now"}
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={payOpen}
        onClose={() => void cancelPayment()}
        title="Complete your payment"
        description={`${siteConfig.paymentProvider} · demo mode`}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => void cancelPayment()} disabled={paying}>
              Cancel
            </Button>
            <Button onClick={() => void completePayment()} disabled={paying}>
              {paying ? "Processing…" : `Pay ${formatGHS(paySession?.amount ?? 0)}`}
            </Button>
          </>
        }
      >
        {paySession && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-mist p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Amount</span>
                <span className="text-lg font-semibold text-ink">
                  {formatGHS(paySession.amount)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted">
                <span>Reference</span>
                <span className="font-mono">{paySession.reference}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-muted">
                <span>Email</span>
                <span>{paySession.email}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { key: "card", label: "Card", icon: CreditCard },
                  { key: "mobile_money", label: "Mobile money", icon: Smartphone },
                  { key: "bank_transfer", label: "Bank", icon: ShieldCheck },
                ] as const
              ).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setMethod(option.key)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-colors",
                    method === option.key
                      ? "border-brand bg-brand/5 text-ink"
                      : "border-line text-muted hover:border-brand/40"
                  )}
                >
                  <option.icon className="h-4 w-4" />
                  {option.label}
                </button>
              ))}
            </div>

            {method === "card" && (
              <div className="space-y-3">
                <Labelled label="Card number">
                  <input
                    className={inputClass}
                    defaultValue="4084 0840 8408 4081"
                    inputMode="numeric"
                    autoComplete="cc-number"
                  />
                </Labelled>
                <div className="grid grid-cols-2 gap-3">
                  <Labelled label="Expiry">
                    <input className={inputClass} defaultValue="12/29" autoComplete="cc-exp" />
                  </Labelled>
                  <Labelled label="CVV">
                    <input className={inputClass} defaultValue="408" autoComplete="cc-csc" />
                  </Labelled>
                </div>
              </div>
            )}

            {method === "mobile_money" && (
              <div className="space-y-3">
                <Labelled label="Mobile money number">
                  <input className={inputClass} placeholder="024 000 0000" inputMode="tel" />
                </Labelled>
                <p className="text-xs text-muted">
                  You will receive a prompt to approve the payment on your phone.
                </p>
              </div>
            )}

            {method === "bank_transfer" && (
              <div className="rounded-2xl border border-line p-4 text-sm">
                <p className="font-medium text-ink">Rigi-X Rentals Ltd</p>
                <p className="mt-1 text-muted">Ghana Commercial Bank · 1234 5678 9012</p>
                <p className="text-muted">Reference: {paySession.reference}</p>
              </div>
            )}

            <p className="flex items-start gap-2 text-xs text-muted">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              This screen imitates the Paystack popup. Confirming marks the booking as paid.
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}

/* --------------------------------------------------------------- pieces */

function StepBar({ step }: { step: number }) {
  return (
    <div className="mb-8">
      <ol className="flex items-center gap-3">
        {STEP_LABELS.map((label, index) => {
          const number = index + 1;
          const done = step > number;
          const active = step === number;
          return (
            <li key={label} className="flex flex-1 items-center gap-3">
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  done
                    ? "bg-brand text-white"
                    : active
                    ? "bg-ink text-white"
                    : "border border-line bg-white text-muted"
                )}
              >
                {done ? <Check className="h-4 w-4" /> : number}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:block",
                  active || done ? "text-ink" : "text-muted"
                )}
              >
                {label}
              </span>
              {number < STEP_LABELS.length && (
                <span className="h-px flex-1 bg-line" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="h-[520px] animate-pulse rounded-2xl border border-line bg-white" />
      </div>
      <div className="hidden lg:block">
        <div className="h-80 animate-pulse rounded-2xl border border-line bg-white" />
      </div>
    </div>
  );
}

function SummaryLines({
  car,
  days,
  dailyRate,
  lines,
  deposit,
  total,
}: {
  car: { brand: string; name: string };
  days: number;
  dailyRate: number;
  lines: { label: string; amount: number }[];
  deposit: number;
  total: number;
}) {
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted">Vehicle</span>
        <span className="text-ink">
          {car.brand} {car.name}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted">Duration</span>
        <span className="text-ink">
          {days} day{days === 1 ? "" : "s"} · {formatGHS(dailyRate)}/day
        </span>
      </div>
      <div className="space-y-2 border-t border-line pt-3">
        {lines.map((line) => (
          <div key={line.label} className="flex items-start justify-between gap-3">
            <span className="text-muted">{line.label}</span>
            <span className={cn("shrink-0", line.amount < 0 ? "text-emerald-600" : "text-ink")}>
              {line.amount < 0 ? `−${formatGHS(Math.abs(line.amount))}` : formatGHS(line.amount)}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-line pt-3">
        <span className="font-semibold text-ink">Total due now</span>
        <span className="text-lg font-semibold text-brand">{formatGHS(total)}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Refundable deposit (held at pickup)</span>
        <span>{formatGHS(deposit)}</span>
      </div>
    </div>
  );
}

function MobileSummary({
  open,
  onToggle,
  carName,
  startDate,
  endDate,
  total,
  days,
}: {
  open: boolean;
  onToggle: () => void;
  carName: string;
  startDate: string;
  endDate: string;
  total: number;
  days: number;
}) {
  return (
    <div className="mb-5 rounded-2xl border border-line bg-white lg:hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-left"
        aria-expanded={open}
      >
        <div>
          <span className="block text-sm font-medium text-ink">{carName}</span>
          <span className="block text-xs text-muted">
            {days} day{days === 1 ? "" : "s"} · {startDate} → {endDate}
          </span>
        </div>
        <span className="text-right">
          <span className="block text-xs text-muted">Total</span>
          <span className="block text-base font-semibold text-brand">{formatGHS(total)}</span>
        </span>
      </button>
      {open && (
        <div className="border-t border-line p-4 text-sm text-muted">
          {startDate} to {endDate} · {days} day{days === 1 ? "" : "s"}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  car,
  startDate,
  endDate,
  serviceType,
  extras,
  delivery,
  totals,
  promo,
}: {
  car: { brand: string; name: string; deposit: number; pricePerDay: number };
  startDate: string;
  endDate: string;
  serviceType: "self-drive" | "chauffeur";
  extras: Extras;
  delivery: boolean;
  totals: ReturnType<typeof calculateCheckoutTotals> | null;
  promo: PromoResult | null;
}) {
  return (
    <div className="sticky top-24 space-y-4">
      <div className="rounded-2xl border border-line bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-ink">Order summary</h2>
        {totals ? (
          <SummaryLines
            car={car}
            days={totals.days}
            dailyRate={totals.dailyRate}
            lines={totals.lines}
            deposit={totals.deposit}
            total={totals.total}
          />
        ) : (
          <p className="text-sm text-muted">Choose your dates to see the price.</p>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-white p-6 text-sm">
        <h3 className="mb-3 font-semibold text-ink">Trip</h3>
        <ul className="space-y-2 text-muted">
          <li className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-brand" />
            {startDate} → {endDate}
          </li>
          <li className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand" />
            {delivery ? "Delivered to your address" : "Pick up at Rigi-X HQ, Dzorwulu"}
          </li>
          <li className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-brand" />
            {serviceType === "chauffeur" ? "Chauffeur-driven" : "Self-drive"}
          </li>
          {promo && (
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand" />
              {promo.code} applied
            </li>
          )}
        </ul>

        {Object.entries(extras).some(([, value]) => value) && (
          <div className="mt-4 border-t border-line pt-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Extras</p>
            <ul className="space-y-1 text-muted">
              {(Object.keys(extras) as (keyof Extras)[])
                .filter((key) => extras[key])
                .map((key) => (
                  <li key={key} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    {EXTRA_LABELS[key]}
                  </li>
                ))}
            </ul>
          </div>
        )}

        <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
          Free cancellation up to 48 hours before pickup. Your card is only charged when you
          confirm the demo payment.
        </p>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- step one */

interface DetailsStepProps {
  car: {
    brand: string;
    name: string;
    selfDriveAvailable: boolean;
    chauffeurAvailable: boolean;
    minDays: number;
  };
  register: ReturnType<typeof useForm<GuestForm>>["register"];
  errors: ReturnType<typeof useForm<GuestForm>>["formState"]["errors"];
  startDate: string;
  endDate: string;
  onStartDate: (value: string) => void;
  onEndDate: (value: string) => void;
  serviceType: "self-drive" | "chauffeur";
  onServiceType: (value: "self-drive" | "chauffeur") => void;
  extras: Extras;
  onToggleExtra: (key: keyof Extras) => void;
  delivery: boolean;
  onDelivery: (value: boolean) => void;
  uploads: UploadedFile[];
  onUpload: (label: string, file: File | null) => void;
  promoInput: string;
  onPromoInput: (value: string) => void;
  promo: PromoResult | null;
  promoBusy: boolean;
  promoMessage: string;
  promoError: boolean;
  onApplyPromo: () => void;
  onRemovePromo: () => void;
}

function DetailsStep({
  car,
  register,
  errors,
  startDate,
  endDate,
  onStartDate,
  onEndDate,
  serviceType,
  onServiceType,
  extras,
  onToggleExtra,
  delivery,
  onDelivery,
  uploads,
  onUpload,
  promoInput,
  onPromoInput,
  promo,
  promoBusy,
  promoMessage,
  promoError,
  onApplyPromo,
  onRemovePromo,
}: DetailsStepProps) {
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-ink">Trip details</h2>
        <p className="mt-1 text-sm text-muted">Adjust your dates and how you would like the car.</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Labelled label="Pickup date">
            <input
              type="date"
              className={inputClass}
              min={todayIso}
              value={startDate}
              onChange={(event) => onStartDate(event.target.value)}
            />
          </Labelled>
          <Labelled label="Return date">
            <input
              type="date"
              className={inputClass}
              min={startDate || todayIso}
              value={endDate}
              onChange={(event) => onEndDate(event.target.value)}
            />
          </Labelled>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-ink">Service type</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!car.selfDriveAvailable}
              onClick={() => onServiceType("self-drive")}
              className={cn(
                "rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
                serviceType === "self-drive"
                  ? "border-brand bg-brand text-white"
                  : car.selfDriveAvailable
                  ? "border-line bg-white text-ink hover:border-brand"
                  : "cursor-not-allowed border-line bg-mist text-muted"
              )}
            >
              Self-drive
            </button>
            <button
              type="button"
              disabled={!car.chauffeurAvailable}
              onClick={() => onServiceType("chauffeur")}
              className={cn(
                "rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
                serviceType === "chauffeur"
                  ? "border-brand bg-brand text-white"
                  : car.chauffeurAvailable
                  ? "border-line bg-white text-ink hover:border-brand"
                  : "cursor-not-allowed border-line bg-mist text-muted"
              )}
            >
              Chauffeur-driven
            </button>
          </div>
          {serviceType === "self-drive" && car.minDays > 1 && (
            <p className="mt-2 text-xs text-muted">
              Minimum {car.minDays} days for self-drive on this vehicle.
            </p>
          )}
        </div>

        {serviceType === "chauffeur" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Labelled label="Chauffeur picks you up at">
              <input
                {...register("chauffeurPickup")}
                className={inputClass}
                placeholder="e.g. Kotoka Airport, Terminal 3"
              />
            </Labelled>
            <Labelled label="Drop-off point">
              <input
                {...register("chauffeurDropoff")}
                className={inputClass}
                placeholder="e.g. Kempinski Hotel"
              />
            </Labelled>
          </div>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Labelled label="Number of passengers">
            <input {...register("passengers")} className={inputClass} inputMode="numeric" />
          </Labelled>
          <Labelled label="Flight number" hint="optional">
            <input
              {...register("flightNumber")}
              className={inputClass}
              placeholder="e.g. BA 081"
            />
          </Labelled>
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4">
          <input
            type="checkbox"
            checked={delivery}
            onChange={(event) => onDelivery(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-brand"
          />
          <span className="text-sm">
            <span className="block font-medium text-ink">Deliver the car to me</span>
            <span className="block text-muted">
              We bring it anywhere in Accra for a small fee.
            </span>
          </span>
        </label>

        {delivery && (
          <div className="mt-3">
            <Labelled label="Delivery address" error={errors.deliveryAddress?.message}>
              <input
                {...register("deliveryAddress")}
                className={inputClass}
                placeholder="Street, area, landmark"
              />
            </Labelled>
          </div>
        )}
      </section>

      <section className="border-t border-line pt-6">
        <h2 className="text-lg font-semibold text-ink">Add extras</h2>
        <p className="mt-1 text-sm text-muted">Priced per day for the length of your rental.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {(Object.keys(EXTRA_LABELS) as (keyof Extras)[]).map((key) => {
            const disabled = key === "chauffeur" && serviceType === "chauffeur";
            const selected = extras[key];
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => onToggleExtra(key)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border p-3 text-left text-sm transition-colors",
                  selected ? "border-brand bg-brand/5" : "border-line bg-white hover:border-brand/40",
                  disabled && "cursor-not-allowed opacity-50"
                )}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded border",
                      selected ? "border-brand bg-brand text-white" : "border-line"
                    )}
                  >
                    {selected && <Check className="h-3 w-3" />}
                  </span>
                  {EXTRA_LABELS[key]}
                </span>
                {disabled && <span className="text-xs text-muted">Included</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="border-t border-line pt-6">
        <h2 className="text-lg font-semibold text-ink">Driver details</h2>
        <p className="mt-1 text-sm text-muted">
          As they appear on the driver&apos;s licence and ID you will bring at pickup.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Labelled label="Full name" error={errors.fullName?.message}>
            <input {...register("fullName")} className={inputClass} autoComplete="name" />
          </Labelled>
          <Labelled label="Phone number" error={errors.phone?.message}>
            <input {...register("phone")} className={inputClass} autoComplete="tel" placeholder="024 000 0000" />
          </Labelled>
          <Labelled label="Email address" error={errors.email?.message}>
            <input {...register("email")} className={inputClass} autoComplete="email" />
          </Labelled>
          <Labelled label="Alternative phone" hint="optional" error={errors.phoneAlt?.message}>
            <input {...register("phoneAlt")} className={inputClass} autoComplete="tel" />
          </Labelled>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Labelled label="Date of birth" error={errors.dateOfBirth?.message}>
            <input type="date" {...register("dateOfBirth")} className={inputClass} />
          </Labelled>
          <Labelled label="Residency" error={errors.nationality?.message}>
            <select {...register("nationality")} className={inputClass}>
              <option value="Ghana resident">Ghana resident</option>
              <option value="International visitor">International visitor</option>
            </select>
          </Labelled>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Labelled label="ID type" error={errors.idType?.message}>
            <select {...register("idType")} className={inputClass}>
              <option value="Ghana Card">Ghana Card</option>
              <option value="Passport">Passport</option>
              <option value="National ID">National ID</option>
            </select>
          </Labelled>
          <Labelled label="ID number" error={errors.idNumber?.message}>
            <input {...register("idNumber")} className={inputClass} />
          </Labelled>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Labelled label="Licence number" error={errors.licenceNumber?.message}>
            <input {...register("licenceNumber")} className={inputClass} />
          </Labelled>
          <Labelled label="Issued in" error={errors.licenceCountry?.message}>
            <input {...register("licenceCountry")} className={inputClass} />
          </Labelled>
          <Labelled label="Licence expiry" error={errors.licenceExpiry?.message}>
            <input type="date" {...register("licenceExpiry")} className={inputClass} />
          </Labelled>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Labelled label="Residential address" error={errors.address?.message}>
            <input {...register("address")} className={inputClass} autoComplete="street-address" />
          </Labelled>
          <Labelled label="City" error={errors.city?.message}>
            <input {...register("city")} className={inputClass} autoComplete="address-level2" />
          </Labelled>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Labelled label="Emergency contact name" error={errors.emergencyName?.message}>
            <input {...register("emergencyName")} className={inputClass} />
          </Labelled>
          <Labelled label="Emergency contact phone" error={errors.emergencyPhone?.message}>
            <input {...register("emergencyPhone")} className={inputClass} />
          </Labelled>
        </div>

        <div className="mt-4">
          <Labelled label="Special requests" hint="optional">
            <textarea
              {...register("specialRequests")}
              rows={3}
              className={inputClass}
              placeholder="Child seat position, preferred pickup time, anything else…"
            />
          </Labelled>
        </div>
      </section>

      <section className="border-t border-line pt-6">
        <h2 className="text-lg font-semibold text-ink">Documents</h2>
        <p className="mt-1 text-sm text-muted">
          Upload scans now to speed up pickup. Files stay private to our team.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {["ID document", "Driver's licence"].map((label) => {
            const uploaded = uploads.find((file) => file.label === label);
            return (
              <label
                key={label}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-line bg-white p-4 text-sm transition-colors hover:border-brand/50"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mist text-brand">
                    {uploaded ? <Check className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                  </span>
                  <span>
                    <span className="block font-medium text-ink">{label}</span>
                    <span className="block text-xs text-muted">
                      {uploaded ? `${uploaded.name} · ${uploaded.sizeKb} KB` : "JPG, PNG or PDF · optional"}
                    </span>
                  </span>
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(event) => onUpload(label, event.target.files?.[0] ?? null)}
                />
              </label>
            );
          })}
        </div>
      </section>

      <section className="border-t border-line pt-6">
        <h2 className="text-lg font-semibold text-ink">Promo code</h2>
        {promo ? (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <span className="flex items-center gap-2 text-sm text-emerald-800">
              <BadgeCheck className="h-4 w-4" />
              {promoMessage}
            </span>
            <button
              type="button"
              onClick={onRemovePromo}
              className="text-emerald-800 transition-colors hover:text-emerald-900"
              aria-label="Remove promo code"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              value={promoInput}
              onChange={(event) => onPromoInput(event.target.value)}
              className={inputClass}
              placeholder={`Try ${siteConfig.promoCode}`}
            />
            <Button
              type="button"
              variant="outline"
              onClick={onApplyPromo}
              disabled={promoBusy}
              className="shrink-0"
            >
              {promoBusy ? "Checking…" : "Apply"}
            </Button>
          </div>
        )}
        {!promo && promoMessage && (
          <p className={cn("mt-2 text-xs", promoError ? "text-brand" : "text-muted")}>
            {promoMessage}
          </p>
        )}
      </section>

      <section className="border-t border-line pt-6">
        <div className="space-y-3">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" {...register("agreeTerms")} className="mt-0.5 h-4 w-4 accent-brand" />
            <span className="text-muted">
              I agree to the{" "}
              <Link href="/terms" className="text-brand hover:underline">
                rental terms
              </Link>{" "}
              and the{" "}
              <Link href="/rental-requirements" className="text-brand hover:underline">
                rental requirements
              </Link>
              .
            </span>
          </label>
          <FieldError message={errors.agreeTerms?.message} />

          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" {...register("agreePrivacy")} className="mt-0.5 h-4 w-4 accent-brand" />
            <span className="text-muted">
              I have read the{" "}
              <Link href="/privacy-policy" className="text-brand hover:underline">
                privacy policy
              </Link>
              .
            </span>
          </label>
          <FieldError message={errors.agreePrivacy?.message} />

          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" {...register("confirmAccurate")} className="mt-0.5 h-4 w-4 accent-brand" />
            <span className="text-muted">Everything I have entered is accurate.</span>
          </label>
          <FieldError message={errors.confirmAccurate?.message} />
        </div>
      </section>
    </div>
  );
}

/* ----------------------------------------------------------- step two */

function ReviewStep({
  car,
  data,
  startDate,
  endDate,
  serviceType,
  extras,
  delivery,
  uploads,
  totals,
  promo,
}: {
  car: { brand: string; name: string; deposit: number; pricePerDay: number };
  data: GuestForm;
  startDate: string;
  endDate: string;
  serviceType: "self-drive" | "chauffeur";
  extras: Extras;
  delivery: boolean;
  uploads: UploadedFile[];
  totals: ReturnType<typeof calculateCheckoutTotals> | null;
  promo: PromoResult | null;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-ink">Review your booking</h2>
        <p className="mt-1 text-sm text-muted">
          Check everything reads correctly before you pay.
        </p>
      </div>

      <ReviewBlock title="Vehicle">
        <ReviewRow label="Car" value={`${car.brand} ${car.name}`} />
        <ReviewRow label="Service" value={serviceType === "chauffeur" ? "Chauffeur-driven" : "Self-drive"} />
        <ReviewRow label="Pickup" value={startDate} />
        <ReviewRow label="Return" value={endDate} />
        <ReviewRow
          label="Delivery"
          value={delivery ? data.deliveryAddress || "Yes" : "Pick up at Rigi-X HQ, Dzorwulu"}
        />
        {serviceType === "chauffeur" && data.chauffeurPickup && (
          <ReviewRow label="Chauffeur pickup" value={data.chauffeurPickup} />
        )}
      </ReviewBlock>

      <ReviewBlock title="Driver">
        <ReviewRow label="Name" value={data.fullName} />
        <ReviewRow label="Email" value={data.email} />
        <ReviewRow label="Phone" value={data.phone} />
        <ReviewRow label="ID" value={`${data.idType} · ${data.idNumber}`} />
        <ReviewRow label="Licence" value={`${data.licenceNumber} (${data.licenceCountry})`} />
        <ReviewRow label="Address" value={`${data.address}, ${data.city}`} />
        <ReviewRow label="Emergency contact" value={`${data.emergencyName} · ${data.emergencyPhone}`} />
      </ReviewBlock>

      {(Object.values(extras).some(Boolean) || uploads.length > 0 || promo) && (
        <ReviewBlock title="Extras & documents">
          {(Object.keys(extras) as (keyof Extras)[])
            .filter((key) => extras[key])
            .map((key) => (
              <ReviewRow key={key} label="Extra" value={EXTRA_LABELS[key]} />
            ))}
          {promo && <ReviewRow label="Promo" value={promo.code} />}
          {uploads.map((file) => (
            <ReviewRow key={file.label} label={file.label} value={`${file.name} · ${file.sizeKb} KB`} />
          ))}
        </ReviewBlock>
      )}

      {totals && (
        <div className="rounded-2xl border border-line bg-mist p-5">
          <SummaryLines
            car={car}
            days={totals.days}
            dailyRate={totals.dailyRate}
            lines={totals.lines}
            deposit={totals.deposit}
            total={totals.total}
          />
        </div>
      )}

      {data.specialRequests && (
        <ReviewBlock title="Special requests">
          <p className="text-sm text-muted">{data.specialRequests}</p>
        </ReviewBlock>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <p className="text-sm text-amber-800">
          Free cancellation up to 48 hours before pickup, then 50% up to 24 hours. No refund within
          24 hours of pickup.
        </p>
      </div>
    </div>
  );
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>
      <dl className="space-y-2 text-sm">{children}</dl>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="max-w-[60%] text-right text-ink">{value || "—"}</dd>
    </div>
  );
}

/* --------------------------------------------------------- step three */

function PaymentStep({
  totals,
  dailyRate,
  email,
  onOpenSummary,
}: {
  totals: ReturnType<typeof calculateCheckoutTotals> | null;
  dailyRate: number;
  email: string;
  onOpenSummary: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-ink">Payment</h2>
        <p className="mt-1 text-sm text-muted">
          You will be charged the total shown below. The security deposit is held separately.
        </p>
      </div>

      <div className="rounded-2xl bg-ink p-6 text-center text-white">
        <p className="text-sm text-white/70">Total to pay now</p>
        <p className="mt-1 text-4xl font-bold">{formatGHS(totals?.total ?? 0)}</p>
        <p className="mt-3 text-xs text-white/60">
          {totals?.days ?? 0} day{(totals?.days ?? 0) === 1 ? "" : "s"} at {formatGHS(dailyRate)} per
          day · VAT &amp; levies included
        </p>
        <p className="mt-4 text-xs text-white/70">
          A confirmation will be sent to {email || "your email"}.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: CreditCard, label: "Card" },
          { icon: Smartphone, label: "Mobile money" },
          { icon: ShieldCheck, label: "Bank transfer" },
        ].map((method) => (
          <div
            key={method.label}
            className="flex items-center gap-3 rounded-xl border border-line bg-white p-4 text-sm text-ink"
          >
            <method.icon className="h-4 w-4 text-brand" />
            {method.label}
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-line p-4 text-sm text-muted">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <p>
          Pressing pay opens the {siteConfig.paymentProvider} window. In demo mode the charge is
          simulated locally — you can also open the summary to double-check the split.
        </p>
      </div>

      <button
        type="button"
        onClick={onOpenSummary}
        className="text-sm text-brand underline-offset-4 hover:underline lg:hidden"
      >
        Show order summary
      </button>

      <p className="flex items-center gap-2 text-xs text-muted">
        <Plane className="h-3.5 w-3.5" />
        Arriving by air? Add your flight number in the details step and we will track it.
      </p>
    </div>
  );
}
