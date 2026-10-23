"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, MessageCircle, RefreshCw } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

const FALLBACK = "Your payment was not completed, so nothing has been charged.";

export default function CheckoutFailedPage() {
  const [state, setState] = useState({ ready: false, reference: "", reason: "", retry: "/checkout" });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const car = params.get("car");
      const retryParams = new URLSearchParams();
      for (const key of ["car", "startDate", "endDate", "serviceType"]) {
        const value = params.get(key);
        if (value) retryParams.set(key, value);
      }
      setState({
        ready: true,
        reference: params.get("ref") ?? "",
        reason: params.get("reason") ?? FALLBACK,
        retry: car ? `/checkout?${retryParams.toString()}` : "/checkout",
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen bg-mist py-12">
        <Container>
          <div className="mx-auto max-w-2xl">
            {!state.ready ? (
              <div className="h-80 animate-pulse rounded-2xl border border-line bg-white" />
            ) : (
              <div className="rounded-2xl border border-line bg-white p-8 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
                  <AlertTriangle className="h-8 w-8 text-brand" />
                </div>
                <h1 className="text-2xl font-bold text-ink">Payment not completed</h1>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted">{state.reason}</p>

                {state.reference && (
                  <div className="mt-5 inline-flex flex-col items-center rounded-2xl bg-mist px-6 py-3">
                    <span className="text-xs uppercase tracking-wide text-muted">Reference</span>
                    <span className="font-mono text-lg font-semibold text-ink">
                      {state.reference}
                    </span>
                  </div>
                )}

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Link href={state.retry}>
                    <Button>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Try payment again
                    </Button>
                  </Link>
                  <Link href="/cars">
                    <Button variant="outline">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to the fleet
                    </Button>
                  </Link>
                </div>

                <a
                  href={`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(
                    "Hi Rigi-X, I had trouble completing my checkout."
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat with us on WhatsApp
                </a>
              </div>
            )}
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
