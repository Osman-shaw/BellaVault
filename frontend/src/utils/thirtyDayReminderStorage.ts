const STORAGE_VERSION = "v1";
const PREFIX = `bellavault:30d-reminder:${STORAGE_VERSION}`;

function storageKey(tenantSlug: string, scope: "borrow" | "partner", id: string) {
  const slug = tenantSlug.trim() || "default";
  return `${PREFIX}:${slug}:${scope}:${id}`;
}

export function getLastAcknowledgedPeriod(tenantSlug: string, scope: "borrow" | "partner", id: string): number {
  if (typeof window === "undefined") return -1;
  try {
    const raw = window.localStorage.getItem(storageKey(tenantSlug, scope, id));
    if (!raw) return -1;
    const parsed = JSON.parse(raw) as { lastPeriod?: number };
    return typeof parsed.lastPeriod === "number" ? parsed.lastPeriod : -1;
  } catch {
    return -1;
  }
}

export function setLastAcknowledgedPeriod(tenantSlug: string, scope: "borrow" | "partner", id: string, periodIndex: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(tenantSlug, scope, id), JSON.stringify({ lastPeriod: periodIndex }));
  } catch {
    /* quota or private mode */
  }
}
