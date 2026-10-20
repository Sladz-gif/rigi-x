import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";

export default function PrivacyPolicyPage() {
  const lastUpdated = "October 20, 2026";

  return (
    <>
      <Header />
      <main id="main-content">
        <Section>
          <Container>
            <SectionHeading
              title="Privacy Policy"
              subtitle="How we collect, use, and protect your information"
            />

            <div className="max-w-3xl mx-auto prose prose-ink">
              <p className="text-sm text-muted mb-8">
                Last updated: {lastUpdated}
                {/* NOTE: replace with reviewed legal copy */}
              </p>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-ink mb-4">1. Information We Collect</h2>
                <p className="text-muted mb-4">
                  At Rigi-X, we collect information you provide directly to us, including:
                </p>
                <ul className="list-disc pl-6 text-muted space-y-2">
                  <li>Name, contact information (email, phone number)</li>
                  <li>Driver&apos;s license and ID information</li>
                  <li>Payment information (processed securely through third-party providers)</li>
                  <li>Rental history and preferences</li>
                  <li>Communications with our customer service team</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-ink mb-4">2. How We Use Your Information</h2>
                <p className="text-muted mb-4">
                  We use the information we collect to:
                </p>
                <ul className="list-disc pl-6 text-muted space-y-2">
                  <li>Process and fulfill your rental requests</li>
                  <li>Communicate with you about your bookings</li>
                  <li>Provide customer support</li>
                  <li>Improve our services</li>
                  <li>Comply with legal obligations</li>
                  <li>Prevent fraud and ensure security</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-ink mb-4">3. Information Sharing</h2>
                <p className="text-muted mb-4">
                  We do not sell your personal information. We may share your information with:
                </p>
                <ul className="list-disc pl-6 text-muted space-y-2">
                  <li>Payment processors for transaction processing</li>
                  <li>Insurance providers as required for coverage</li>
                  <li>Law enforcement when required by law</li>
                  <li>Service providers who assist our operations (under strict confidentiality agreements)</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-ink mb-4">4. Data Security</h2>
                <p className="text-muted">
                  We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-ink mb-4">5. Your Rights</h2>
                <p className="text-muted mb-4">
                  You have the right to:
                </p>
                <ul className="list-disc pl-6 text-muted space-y-2">
                  <li>Access your personal information</li>
                  <li>Correct inaccurate information</li>
                  <li>Request deletion of your information</li>
                  <li>Opt-out of marketing communications</li>
                  <li>Object to processing of your information</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-ink mb-4">6. Cookies</h2>
                <p className="text-muted">
                  We use cookies and similar technologies to improve your experience, analyze usage, and assist in our marketing efforts. You can control cookie settings through your browser preferences.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold text-ink mb-4">7. Changes to This Policy</h2>
                <p className="text-muted">
                  We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &ldquo;Last updated&rdquo; date.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-ink mb-4">8. Contact Us</h2>
                <p className="text-muted">
                  If you have questions about this privacy policy, please contact us at:
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
