"use client";

import { useEffect, useRef } from "react";
import { apiService, ThirtyDayRemindersResponse } from "@/services/apiService";
import { readSession } from "@/state/auth";
import { can } from "@/state/rbac";
import { useRole } from "@/state/useRole";
import { formatDateUtc } from "@/utils/formatDisplay";
import { getLastAcknowledgedPeriod, setLastAcknowledgedPeriod } from "@/utils/thirtyDayReminderStorage";
import { notifyInfo } from "@/utils/notify";

function moneyLe(n: number) {
  return `Le ${n.toFixed(2)}`;
}

/**
 * After login, loads 30-day reminder payloads and shows a toast once per new
 * completed 30-day period per borrow / partner (tracked in localStorage).
 */
export function ThirtyDayReminders() {
  const { isAuthenticated, role, user } = useRole();
  const completedForAccessToken = useRef<string | null>(null);
  const inFlightToken = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !can(role, "reminders:read")) {
      completedForAccessToken.current = null;
      inFlightToken.current = null;
      return;
    }

    const accessToken = readSession()?.accessToken ?? "";
    if (!accessToken) return;
    if (completedForAccessToken.current === accessToken) return;
    if (inFlightToken.current === accessToken) return;
    inFlightToken.current = accessToken;

    const tenantSlug = user?.tenantSlug ?? readSession()?.user?.tenantSlug ?? "default";

    let cancelled = false;

    (async () => {
      let data: ThirtyDayRemindersResponse;
      try {
        data = await apiService.getThirtyDayReminders();
      } catch {
        inFlightToken.current = null;
        return;
      }
      if (cancelled) {
        inFlightToken.current = null;
        return;
      }

      completedForAccessToken.current = accessToken;
      inFlightToken.current = null;

      const toShow: { delayMs: number; fn: () => void }[] = [];
      let delayMs = 400;

      for (const b of data.borrows) {
        if (b.periodIndex < 1) continue;
        const last = getLastAcknowledgedPeriod(tenantSlug, "borrow", b.id);
        if (b.periodIndex <= last) continue;
        const borrowedLabel = formatDateUtc(b.borrowedAt);
        const paidPart =
          b.amountPaid > 0
            ? `Paid so far ${moneyLe(b.amountPaid)} · Remaining ${moneyLe(b.remainingBalance)}.`
            : `Nothing recorded as paid yet · Full principal ${moneyLe(b.principalAmount)} still due.`;
        const id = b.id;
        const period = b.periodIndex;
        toShow.push({
          delayMs,
          fn: () => {
            notifyInfo(
              `${b.borrowerName} still owes you. Loan from ${borrowedLabel} (${b.daysSinceBorrowed} days ago). ${paidPart}`,
              "Cash borrow · 30-day check-in"
            );
            setLastAcknowledgedPeriod(tenantSlug, "borrow", id, period);
          },
        });
        delayMs += 650;
      }

      for (const p of data.partners) {
        if (p.periodIndex < 1) continue;
        const last = getLastAcknowledgedPeriod(tenantSlug, "partner", p.entityId);
        if (p.periodIndex <= last) continue;
        const firstLabel = formatDateUtc(p.firstInvestedAt);
        const entityId = p.entityId;
        const period = p.periodIndex;
        toShow.push({
          delayMs,
          fn: () => {
            notifyInfo(
              `${p.entityName}: total invested ${moneyLe(p.totalInvested)} since first ledger entry ${firstLabel} (${p.daysSinceFirstLedger} days ago). Capital remaining in ledger: ${moneyLe(p.capitalRemaining)}.`,
              "Partner capital · 30-day check-in"
            );
            setLastAcknowledgedPeriod(tenantSlug, "partner", entityId, period);
          },
        });
        delayMs += 650;
      }

      for (const item of toShow) {
        window.setTimeout(item.fn, item.delayMs);
      }
    })();

    return () => {
      cancelled = true;
      inFlightToken.current = null;
    };
  }, [isAuthenticated, role, user?.tenantSlug, user?.id]);

  return null;
}
