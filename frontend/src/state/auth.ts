"use client";

import { Role } from "@/state/rbac";

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  role: Exclude<Role, "guest">;
  emailVerified: boolean;
  /** Organization (tenant) for multi-tenant data isolation. */
  tenantId: string;
  tenantSlug?: string;
  tenantName?: string;
  /** Present when the user signed up or signs in with a verified Sierra Leone phone. */
  phoneMasked?: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

const SESSION_KEY = "bellavault_session";
const SESSION_EVENT = "bellavault-session-change";

function emitSessionChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_EVENT));
}

/** Subscribe to same-tab session writes and cross-tab storage updates (for useSyncExternalStore). */
export function subscribeSession(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onStorage = (e: StorageEvent) => {
    if (e.key === SESSION_KEY || e.key === null) onStoreChange();
  };

  const onLocal = () => onStoreChange();

  window.addEventListener("storage", onStorage);
  window.addEventListener(SESSION_EVENT, onLocal);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SESSION_EVENT, onLocal);
  };
}

/**
 * Snapshot for useSyncExternalStore: primitive string from localStorage so server + hydrated
 * client match (null) and referential equality is stable when the value is unchanged.
 */
export function getSessionRawSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY);
}

export function parseSessionFromRaw(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Session;
    if (!parsed?.accessToken || !parsed?.refreshToken || !parsed?.user?.role || !parsed?.user?.tenantId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readSession(): Session | null {
  return parseSessionFromRaw(getSessionRawSnapshot());
}

export function writeSession(session: Session): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  emitSessionChange();
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  emitSessionChange();
}

/** Call after login/register paths that set session without writeSession (if any). */
export function notifySessionChanged(): void {
  emitSessionChange();
}
