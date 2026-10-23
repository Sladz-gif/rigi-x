"use client";

// Staff authentication against the mock store.
// NOTE: this is a front-end simulation of the session/route-handler flow in the
// brief (bcrypt hashes, httpOnly cookie sessions, lockout). Swap for real
// `/api/auth/*` calls when the backend lands — the UI contract stays the same.

import type { StaffUser } from "./types";
import { getRows, insertRow, updateRow, withLatency } from "./store";

const SESSION_KEY = "rigix.admin.session";
const LOCKOUT_KEY = "rigix.admin.lockout";
export const DEV_PASSWORD = "1234";
export const STRONG_DEMO_PASSWORD = "rigi2026admin";

export interface StaffSession {
  userId: string;
  name: string;
  email: string;
  role: StaffUser["role"];
  mustChangePassword: boolean;
  signedInAt: string;
}

interface LockoutState {
  [email: string]: { failures: number; lockedUntil: number | null };
}

const LOCKOUT_AFTER = 5;
const LOCKOUT_MINUTES = 15;

function readLockouts(): LockoutState {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(LOCKOUT_KEY) ?? "{}") as LockoutState;
  } catch {
    return {};
  }
}

function writeLockouts(state: LockoutState) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCKOUT_KEY, JSON.stringify(state));
  }
}

export function getSession(): StaffSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StaffSession) : null;
  } catch {
    return null;
  }
}

export function setSession(user: StaffUser, keepPasswordChange = false): StaffSession {
  const session: StaffSession = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: keepPasswordChange ? false : user.mustChangePassword,
    signedInAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  return session;
}

export function signOut(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
}

export function staffAccounts(): StaffUser[] {
  return getRows("staff");
}

/** Demo credentials shown on the login card. */
export const DEMO_ACCOUNTS = [
  { email: "admin@rigi-x.com", role: "Super Admin" },
  { email: "manager@rigi-x.com", role: "Operations Manager" },
  { email: "sales@rigi-x.com", role: "Sales" },
  { email: "finance@rigi-x.com", role: "Finance" },
  { email: "hr@rigi-x.com", role: "HR" },
  { email: "support@rigi-x.com", role: "Customer Service" },
  { email: "fleet@rigi-x.com", role: "Fleet" },
];

export type SignInResult =
  | { ok: true; session: StaffSession }
  | { ok: false; error: string; lockedUntil?: number };

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const normalised = email.trim().toLowerCase();
  await withLatency(null, 700);

  const lockouts = readLockouts();
  const record = lockouts[normalised];
  if (record?.lockedUntil && record.lockedUntil > Date.now()) {
    const minutes = Math.ceil((record.lockedUntil - Date.now()) / 60_000);
    return {
      ok: false,
      error: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      lockedUntil: record.lockedUntil,
    };
  }

  const user = getRows("staff").find(
    (staff) => staff.email.toLowerCase() === normalised && staff.active
  );

  const validPassword = password === DEV_PASSWORD || password === STRONG_DEMO_PASSWORD;
  if (!user || !validPassword) {
    const failures = (record?.failures ?? 0) + 1;
    const locked = failures >= LOCKOUT_AFTER;
    lockouts[normalised] = {
      failures,
      lockedUntil: locked ? Date.now() + LOCKOUT_MINUTES * 60_000 : null,
    };
    writeLockouts(lockouts);
    // Generic message on purpose — never reveal whether the email exists.
    return { ok: false, error: "Invalid email or password" };
  }

  delete lockouts[normalised];
  writeLockouts(lockouts);
  updateRow("staff", user.id, { lastLogin: new Date().toISOString() });

  const session = setSession(user, password === STRONG_DEMO_PASSWORD);
  return { ok: true, session };
}

/** Sets a new password at first sign-in (minimum 12 characters). */
export async function changePassword(
  userId: string,
  password: string,
  currentSession: StaffSession
): Promise<{ ok: true } | { ok: false; error: string }> {
  await withLatency(null, 600);
  if (password.length < 12) {
    return { ok: false, error: "Password must be at least 12 characters." };
  }
  const user = updateRow("staff", userId, { mustChangePassword: false });
  if (!user) return { ok: false, error: "Account not found." };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ ...currentSession, mustChangePassword: false })
    );
  }
  insertRow("emailOutbox", {
    to: user.email,
    subject: "Your Rigi-X staff password was changed",
    body: "<p>Your password was updated successfully. If this was not you, contact the super admin.</p>",
    templateId: null,
    status: "sent",
    provider: "mock",
    sentAt: new Date().toISOString(),
  });
  return { ok: true };
}
