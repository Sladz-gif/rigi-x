import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";

export default function TermsPage() {
  const lastUpdated = "October 20, 2026";

  return (
    <>
      <Header />
      <main id="main-content">
        <Section>
          <Container>
            <SectionHeading
              title="Terms of Service"
              subtitle="Rules and regulations for using Rigi-X services"
            />

            <div className="max-w-3xl mx-auto prose prose-ink">
              <p className="text-sm text-muted mb-8">
                Last updated: {lastUpdated}
                {/* NOTE: replace with reviewed legal copy */}
              </p>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-ink mb-4">1. Acceptance of Terms</h2>
                <p className="text-muted">
                  By using Rigi-X services, you agree to these terms of service. If you do not agree to these terms, please do not use our services.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-ink mb-4">2. Rental Agreement</h2>
                <p className="text-muted mb-4">
                  All rentals are subject to a rental agreement that must be signed before vehicle pickup. The rental agreement includes:
                </p>
                <ul className="list-disc pl-6 text-muted space-y-2">
                  <li>Vehicle details and condition</li>
                  <li>Rental period and rates</li>
                  <li>Driver responsibilities</li>
                  <li>Insurance coverage details</li>
                  <li>Fuel and mileage policies</li>
                  <li>Terms for return and late fees</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-ink mb-4">3. Driver Requirements</h2>
                <p className="text-muted mb-4">
                  To rent a vehicle, you must:
                </p>
                <ul className="list-disc pl-6 text-muted space-y-2">
                  <li>Be at least 21 years old (25 for luxury vehicles)</li>
                  <li>Hold a valid driver&apos;s license for at least 2 years</li>
                  <li>Provide valid identification (Ghana Card, passport, or national ID)</li>
                  <li>Meet any additional requirements for specific vehicle categories</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-ink mb-4">4. Payment Terms</h2>
                <p className="text-muted mb-4">
                  Payment is required as follows:
                </p>
                <ul className="list-disc pl-6 text-muted space-y-2">
                  <li>Security deposit required before pickup</li>
                  <li>Full payment or pre-authorization required for rentals over 7 days</li>
                  <li>Payment methods: Mobile Money, credit/debit cards, bank transfer</li>
                  <li>Refundable security deposit returned within 3-5 business days</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-ink mb-4">5. Vehicle Use</h2>
                <p className="text-muted mb-4">
                  The renter agrees to:
                </p>
                <ul className="list-disc pl-6 text-muted space-y-2">
                  <li>Use the vehicle only for lawful purposes</li>
                  <li>Not operate the vehicle under the influence of alcohol or drugs</li>
                  <li>Not allow unauthorized drivers to operate the vehicle</li>
                  <li>Follow all traffic laws and regulations</li>
                  <li>Not use the vehicle for racing, off-road, or commercial purposes without authorization</li>
                  <li>Notify Rigi-X immediately of any accidents or mechanical issues</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-ink mb-4">6. Fuel and Mileage</h2>
                <p className="text-muted mb-4">
                  Fuel and mileage policies:
                </p>
                <ul className="list-disc pl-6 text-muted space-y-2">
                  <li>Vehicle provided with full tank, must be returned full</li>
                  <li>Refueling fee applies if returned with less fuel</li>
                  <li>Unlimited mileage within Accra for most rentals</li>
                  <li>Outstation mileage packages available</li>
                  <li>Excess mileage charges apply as per rental agreement</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-ink mb-4">7. Insurance</h2>
                <p className="text-muted mb-4">
                  Insurance coverage:
                </p>
                <ul className="list-disc pl-6 text-muted space-y-2">
                  <li>Basic third-party liability insurance included</li>
                  <li>Comprehensive insurance available as upgrade</li>
                  <li>Renter responsible for deductible in case of accident</li>
                  <li>Insurance voided in case of unauthorized use or driver impairment</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-ink mb-4">8. Cancellations and Refunds</h2>
                <p className="text-muted mb-4">
                  Cancellation policy:
                </p>
                <ul className="list-disc pl-6 text-muted space-y-2">
                  <li>Free cancellation up to 48 hours before pickup</li>
                  <li>50% fee for cancellations within 48 hours</li>
                  <li>No refund for no-shows</li>
                  <li>Modifications allowed up to 48 hours before pickup</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-ink mb-4">9. Liability</h2>
                <p className="text-muted">
                  Rigi-X is not liable for any injuries, damages, or losses resulting from the use of our vehicles, except where caused by our negligence. The renter assumes all risks associated with vehicle operation.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-ink mb-4">10. Changes to Terms</h2>
                <p className="text-muted">
                  We reserve the right to modify these terms at any time. Continued use of our services after changes constitutes acceptance of the new terms.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-ink mb-4">11. Contact Us</h2>
                <p className="text-muted">
                  For questions about these terms, please contact us at:
                </p>
                <p className="text-muted mt-2">
                  Email: admin@rigi-x.com<br />
                  Phone: +233 53 884 8346
                </p>
              </section>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  );
}
