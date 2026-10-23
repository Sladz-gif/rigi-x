"use client";

// In-browser "database". Stands in for the SQLite/Prisma layer described in the
// brief: every admin action mutates this store, persists to localStorage and
// notifies subscribers, so the UI behaves exactly as if an API were attached.
//
// NOTE: swap these functions for real `fetch('/api/...')` calls when the
// Next.js route handlers land — the component code does not need to change.

import { useCallback, useSyncExternalStore } from "react";
import { buildSeed, type CollectionName, type MockDb } from "./seed";

export type { CollectionName, MockDb };

const STORAGE_KEY = "rigix.admin.db.v2";

type Base = { id: string; createdAt: string; updatedAt: string };

interface Snapshot {
  version: number;
  db: MockDb;
}

function createSnapshot(): Snapshot {
  return { version: 0, db: buildSeed() };
}

let snapshot: Snapshot = createSnapshot();
const listeners = new Set<() => void>();
let hydrated = false;

function emit() {
  snapshot = { version: snapshot.version + 1, db: snapshot.db };
  for (const listener of listeners) listener();
}

function persist() {
  if (typeof window === "undefined" || !hydrated) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot.db));
  } catch {
    // Storage full or unavailable — the in-memory store still works.
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MockDb;
      const fresh = buildSeed();
      // Guard against older shapes: keep only collections that still exist.
      const merged = {} as MockDb;
      for (const key of Object.keys(fresh) as CollectionName[]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (merged as any)[key] = Array.isArray(parsed?.[key]) ? parsed[key] : fresh[key];
      }
      snapshot = { version: snapshot.version + 1, db: merged };
      emit();
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  hydrate();
  return () => listeners.delete(listener);
}

function getSnapshot(): Snapshot {
  return snapshot;
}

function getServerSnapshot(): Snapshot {
  return snapshot;
}

/* ------------------------------------------------------------- global */

export function getDb(): MockDb {
  return snapshot.db;
}

export function resetDb(): void {
  snapshot = { version: snapshot.version + 1, db: buildSeed() };
  emit();
  persist();
}

export function clearPersistence(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
}

/* ------------------------------------------------------------ reading */

export function getRows<K extends CollectionName>(collection: K): MockDb[K] {
  return snapshot.db[collection];
}

export function findRow<K extends CollectionName>(
  collection: K,
  id: string
): MockDb[K][number] | undefined {
  return snapshot.db[collection].find((row) => (row as Base).id === id) as
    | MockDb[K][number]
    | undefined;
}

export function nextId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e3).toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/* ------------------------------------------------------------ writing */

export function insertRow<K extends CollectionName>(
  collection: K,
  data: Omit<MockDb[K][number], keyof Base> & { id?: string }
): MockDb[K][number] {
  const timestamp = nowIso();
  const row = {
    ...(data as object),
    id: (data as { id?: string }).id ?? nextId(String(collection).slice(0, 3)),
    createdAt: timestamp,
    updatedAt: timestamp,
  } as MockDb[K][number];
  (snapshot.db[collection] as MockDb[K][number][]).unshift(row);
  emit();
  persist();
  return row;
}

export function updateRow<K extends CollectionName>(
  collection: K,
  id: string,
  patch: Partial<MockDb[K][number]>
): MockDb[K][number] | undefined {
  const rows = snapshot.db[collection] as MockDb[K][number][];
  const index = rows.findIndex((row) => (row as Base).id === id);
  if (index === -1) return undefined;
  rows[index] = { ...rows[index], ...patch, updatedAt: nowIso() };
  emit();
  persist();
  return rows[index];
}

export function deleteRow<K extends CollectionName>(collection: K, id: string): void {
  const rows = snapshot.db[collection] as MockDb[K][number][];
  const index = rows.findIndex((row) => (row as Base).id === id);
  if (index === -1) return;
  rows.splice(index, 1);
  emit();
  persist();
}

export function logAudit(entry: {
  actorName: string;
  actorId?: string;
  action: string;
  entity: string;
  entityId?: string;
  detail?: string;
}): void {
  insertRow("auditLogs", {
    actorId: entry.actorId ?? "usr-1",
    actorName: entry.actorName,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId ?? "—",
    detail: entry.detail ?? `${entry.action} ${entry.entity.toLowerCase()}`,
    ip: "10.0.0.1",
  });
}

/* ------------------------------------------------------------- hooks */

/** Subscribe to the whole database. Re-renders on any mutation. */
export function useDb(): MockDb {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return snap.db;
}

/** Subscribe to a single collection. */
export function useRows<K extends CollectionName>(collection: K): MockDb[K] {
  const db = useDb();
  return db[collection];
}

/** Look up one row by id, staying reactive. */
export function useRow<K extends CollectionName>(
  collection: K,
  id: string | null | undefined
): MockDb[K][number] | undefined {
  const rows = useRows(collection);
  return useCallback(
    () => rows.find((row) => (row as Base).id === id),
    [rows, id]
  )();
}

/** Simulated network latency so loading states are real, not instant. */
export function withLatency<T>(value: T, ms = 420): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
