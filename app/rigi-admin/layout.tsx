import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/shell";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Rigi-X Business",
  description: "Rigi-X business management.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <AdminShell>{children}</AdminShell>
    </ToastProvider>
  );
}
