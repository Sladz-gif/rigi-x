import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Car as CarIcon } from "lucide-react";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center min-h-[60vh]">
        <Container>
          <div className="text-center">
            <CarIcon className="w-24 h-24 text-muted mx-auto mb-6" />
            <h1 className="text-6xl font-bold text-ink mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-ink mb-4">
              Page not found
            </h2>
            <p className="text-muted mb-8 max-w-md mx-auto">
              Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved or doesn&apos;t exist.
            </p>
            <Link href="/cars">
              <Button size="lg">
                Browse our fleet
              </Button>
            </Link>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
