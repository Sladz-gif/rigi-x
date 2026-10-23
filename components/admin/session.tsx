"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, type StaffSession } from "@/lib/mock/auth";
import { siteConfig } from "@/lib/site-config";

interface AdminSessionValue {
  session: StaffSession;
  role: StaffSession["role"];
}

const AdminSessionContext = createContext<AdminSessionValue | null>(null);

export function AdminSessionProvider({
  session,
  children,
}: {
  session: StaffSession;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ session, role: session.role }), [session]);
  return (
    <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>
  );
}

/**
 * Reads the signed-in staff member. Redirects to the admin login when there is
 * no session — the same guard a server-side `requireRole()` would perform.
 */
export function useAdminSession({ redirect = true } = {}): AdminSessionValue | null {
  const router = useRouter();
  const [session, setSession] = useState<StaffSession | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const found = getSession();
      setSession(found);
      setChecked(true);
      if (!found && redirect) {
        router.replace(`${siteConfig.adminBasePath}/login`);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [router, redirect]);

  if (!checked || !session) return null;
  return { session, role: session.role };
}

/** Small helper so pages can read the session without a second lookup. */
export function useOptionalAdminSession(): AdminSessionValue | null {
  return useContext(AdminSessionContext);
}
