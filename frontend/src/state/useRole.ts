"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  clearSession,
  getSessionRawSnapshot,
  notifySessionChanged,
  parseSessionFromRaw,
  subscribeSession,
} from "@/state/auth";
import { Role } from "@/state/rbac";

export function useRole() {
  const raw = useSyncExternalStore(subscribeSession, getSessionRawSnapshot, () => null);
  const session = useMemo(() => parseSessionFromRaw(raw), [raw]);

  const refresh = useCallback(() => {
    notifySessionChanged();
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, []);

  return {
    role: (session?.user.role || "guest") as Role,
    isAuthenticated: Boolean(session?.accessToken),
    user: session?.user,
    refresh,
    logout,
  };
}
