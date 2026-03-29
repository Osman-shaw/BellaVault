/**
 * Deterministic formatting for SSR + client hydration (fixed locale & UTC where relevant).
 */

const dateUtcFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const dateTimeUtcFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

export function formatDateUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return dateUtcFormatter.format(d);
}

export function formatDateTimeUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return dateTimeUtcFormatter.format(d);
}

const numberEnFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatNumberEn(value: number): string {
  return numberEnFormatter.format(value);
}

const numberEnFlexibleFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Prices / market values: fixed locale, stable across SSR and client. */
export function formatNumberEnFlexible(value: number): string {
  return numberEnFlexibleFormatter.format(value);
}

// Currency: Leones (SLL). Use a deterministic formatter so SSR and client match.
export const currencySymbol = "Le";

export function formatMoneyLeones(value: number, fractionDigits = 2): string {
  // Keep numeric formatting stable (en-US) and avoid locale-dependent symbols.
  const n = Number.isFinite(value) ? value : 0;
  return `${currencySymbol} ${n.toFixed(fractionDigits)}`;
}
