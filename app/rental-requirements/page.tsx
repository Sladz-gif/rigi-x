import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { Check, AlertCircle } from "lucide-react";

export default function RentalRequirementsPage() {
  const requirements = [
    {
      title: "Documents Required",
      items: [
        "Valid driver's license (held for at least 2 years)",
        "Ghana Card or national ID",
        "Passport (for international visitors)",
        "Proof of address (utility bill or bank statement)",
      ],
    },
    {
      title: "Age Requirements",
      items: [
        "Minimum age: 21 years for most vehicles",
        "Minimum age: 25 years for luxury vehicles",
        "All drivers must have held a valid license for at least 2 years",
        // NOTE: confirm age requirements with client
      ],
    },
    {
      title: "Payment Methods",
      items: [
        "Mobile Money (MTN, Vodafone, AirtelTigo)",
        "Credit/Debit cards",
        "Bank transfer",
        "Security deposit required (varies by vehicle)",
      ],
    },
    {
      title: "Security Deposit",
      items: [
        "Deposit amount varies by vehicle category",
        "Range: ₵1,500 - ₵25,000",
        "Refunded within 3-5 business days after return",
        "Subject to vehicle inspection",
      ],
    },
    {
      title: "Fuel Policy",
      items: [
        "Vehicle provided with full tank",
        "Must be returned with full tank",
        "Refueling fee applies if returned with less fuel",
        "Fuel receipts must be provided for verification",
      ],
    },
    {
      title: "Mileage Policy",
      items: [
        "Unlimited mileage within Accra",
        "Outstation trips: mileage packages available",
        "Additional kilometers charged at per-km rate",
        "Excess mileage fees outlined in rental agreement",
      ],
    },
    {
      title: "Insurance",
      items: [
        "Basic third-party liability insurance included",
        "Comprehensive insurance available as upgrade",
        "Collision Damage Waiver (CDW) available",
        "Theft protection available",
        // NOTE: confirm insurance details with client
      ],
    },
    {
      title: "Cross-Region Travel",
      items: [
        "Prior authorization required for travel outside Accra",
        "Additional mileage charges may apply",
        "Different insurance terms may apply",
        "Contact us for outstation bookings",
      ],
    },
    {
      title: "Late Returns",
      items: [
        "Grace period: 30 minutes",
        "Late fee: 20% of daily rate per hour",
        "Returns 3+ hours late charged for full day",
        "Contact us if you anticipate being late",
      ],
    },
    {
      title: "Cancellations",
      items: [
        "Free cancellation up to 48 hours before pickup",
        "Cancellations within 48 hours: up to 50% fee",
        "No-show: full charge",
        "Modifications allowed up to 48 hours before",
      ],
    },
  ];

  return (
    <>
      <Header />
      <main id="main-content">
        <Section>
          <Container>
            <SectionHeading
              title="Rental Requirements"
              subtitle="Everything you need to know before renting"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {requirements.map((req, index) => (
                <div key={index} className="bg-white rounded-2xl border border-line p-6">
                  <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
                    <Check className="w-5 h-5 text-brand" />
                    {req.title}
                  </h3>
                  <ul className="space-y-2">
                    {req.items.map((item, i) => (
                      <li key={i} className="text-muted text-sm flex items-start gap-2">
                        <span className="text-brand mt-1">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-12 bg-brand/5 rounded-2xl border border-brand/20 p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-brand flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-ink mb-2">Need clarification?</h3>
                  <p className="text-muted mb-4">
                    If you have any questions about our rental requirements, please don&apos;t hesitate to contact us.
                  </p>
                  <a
                    href="tel:+233538848346"
                    className="text-brand font-medium hover:underline"
                  >
                    Call us at +233 53 884 8346
                  </a>
                </div>
              </div>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
