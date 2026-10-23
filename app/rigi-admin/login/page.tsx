"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { siteConfig } from "@/lib/site-config";
import {
  changePassword,
  DEMO_ACCOUNTS,
  getSession,
  signIn,
  type StaffSession,
} from "@/lib/mock/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("admin@rigi-x.com");
  const [password, setPassword] = useState("1234");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingSession, setPendingSession] = useState<StaffSession | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (getSession()) router.replace(siteConfig.adminBasePath);
  }, [router]);

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.session.mustChangePassword) {
      setPendingSession(result.session);
      return;
    }
    toast({ title: "Welcome back", description: "Signed in to Rigi-X Business." });
    router.replace(siteConfig.adminBasePath);
  };

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pendingSession) return;
    if (newPassword !== confirmPassword) {
      setError("The two passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    const result = await changePassword(pendingSession.userId, newPassword, pendingSession);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast({
      title: "Password updated",
      description: "Your new password is active on this device.",
    });
    router.replace(siteConfig.adminBasePath);
  };

  return (
    <div className="flex min-h-dvh bg-mist">
      {/* Brand panel */}
      <div className="relative hidden w-[46%] flex-col justify-between bg-ink p-10 lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white">
              R
            </span>
            <span className="text-sm font-semibold text-white">Rigi-X Business</span>
          </div>
          <h1 className="mt-16 max-w-sm text-3xl font-semibold leading-tight text-white">
            Everything the rental business runs on.
          </h1>
          <p className="mt-4 max-w-sm text-sm text-white/60">
            Bookings, fleet, maintenance, finance, HR and marketing in one place —
            connected to the public booking site.
          </p>
        </div>
        <div className="space-y-3 text-xs text-white/50">
          <p className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            Staff access only. This area is not listed or indexed anywhere.
          </p>
          <p className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            Sessions expire and accounts lock after 5 failed attempts.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
            <div className="mb-6">
              <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Lock className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-semibold text-ink">
                {pendingSession ? "Set a new password" : "Sign in"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {pendingSession
                  ? "The development password must be replaced before you continue."
                  : "Use your Rigi-X staff email and password."}
              </p>
            </div>

            {pendingSession ? (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-ink" htmlFor="newPassword">
                    New password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-brand"
                    placeholder="At least 12 characters"
                  />
                </div>
                <div>
                  <label
                    className="mb-1.5 block text-xs font-medium text-ink"
                    htmlFor="confirmPassword"
                  >
                    Confirm password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-brand"
                  />
                </div>
                {error && <p className="text-xs text-brand">{error}</p>}
                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? "Saving…" : "Save password and continue"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-ink" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-brand"
                    placeholder="admin@rigi-x.com"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-ink" htmlFor="password">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-xl border border-line px-3 py-2.5 pr-10 text-sm outline-none focus:border-brand"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((show) => !show)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:text-ink"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-xs text-brand">{error}</p>}

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            )}

            <p className="mt-6 flex items-start gap-2 rounded-xl bg-mist p-3 text-[11px] text-muted">
              <KeyRound className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>
                Demo mode. Password <strong className="text-ink">1234</strong> works for any
                account listed below and asks you to set a longer one. Use{" "}
                <strong className="text-ink">rigi2026admin</strong> to skip that step.
              </span>
            </p>
          </div>

          {!pendingSession && (
            <div className="mt-4 rounded-2xl border border-line bg-white p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Demo accounts — click to fill
              </p>
              <div className="flex flex-wrap gap-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => {
                      setEmail(account.email);
                      setPassword("rigi2026admin");
                      setError("");
                    }}
                    className="rounded-full border border-line px-3 py-1.5 text-[11px] text-muted transition-colors hover:border-brand hover:text-ink"
                  >
                    {account.role}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-muted">
            <Link href="/" className="hover:text-ink">
              ← Back to rigi-x.com
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
