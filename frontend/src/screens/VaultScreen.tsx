"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  AccessDenied,
  AppScreen,
  ReadOnlyBanner,
  ScreenFeedback,
  ScreenSectionTitle,
} from "@/components/layout/AppScreen";
import { FormButton } from "@/components/form/FormButton";
import { FormCard } from "@/components/form/FormCard";
import { FormInput } from "@/components/form/FormInput";
import { FormTextarea } from "@/components/form/FormTextarea";
import { apiService, VaultMovementRow, VaultSummary } from "@/services/apiService";
import { can } from "@/state/rbac";
import { useRole } from "@/state/useRole";
import { formatDateTimeUtc, formatMoneyLeones } from "@/utils/formatDisplay";
import { messageFeedbackVariant } from "@/utils/messageFeedbackVariant";
import { notifyError } from "@/utils/notify";
import { actionFeedback } from "@/utils/actionFeedback";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const POLL_MS = 20000;

export function VaultScreen() {
  const { role, isAuthenticated } = useRole();
  const canRead = can(role, "vault:read");
  const canDeposit = can(role, "vault:deposit");

  const [summary, setSummary] = useState<VaultSummary | null>(null);
  const [movements, setMovements] = useState<VaultMovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [depositAmount, setDepositAmount] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);

  const refresh = useCallback(async (silent?: boolean) => {
    try {
      const [s, m] = await Promise.all([apiService.getVault(), apiService.getVaultMovements(50)]);
      setSummary(s);
      setMovements(m);
    } catch {
      if (!silent) {
        setMessage("Could not load vault.");
        notifyError("Could not load vault.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canRead) return;
    refresh(false);
    const id = window.setInterval(() => refresh(true), POLL_MS);
    return () => window.clearInterval(id);
  }, [canRead, refresh]);

  async function onDeposit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Enter a positive amount.");
      return;
    }
    try {
      setDepositLoading(true);
      const res = await apiService.vaultDeposit({ amount, note: depositNote.trim() || undefined });
      setDepositAmount("");
      setDepositNote("");
      setMessage(res.message || "Deposit recorded.");
      actionFeedback.vaultDeposit();
      await refresh();
    } catch (err) {
      const text = err instanceof Error ? err.message : "Deposit failed.";
      setMessage(text);
      notifyError(text);
    } finally {
      setDepositLoading(false);
    }
  }

  if (!canRead) {
    return <AccessDenied message="You are not allowed to view the vault." />;
  }

  return (
    <AppScreen
      title="Vault"
      description="Operating cash held for buying and selling gold. The balance updates when purchases spend cash, sales add proceeds, or staff record a deposit. Refreshes automatically every few seconds."
    >
      {!isAuthenticated ? (
        <ReadOnlyBanner />
      ) : !canDeposit ? (
        <div className="screen-banner screen-banner--muted" role="note">
          Deposits are limited to admin and secretary roles. Purchases and sales still update the vault when those users record them.
        </div>
      ) : null}

      {message ? <ScreenFeedback variant={messageFeedbackVariant(message)}>{message}</ScreenFeedback> : null}

      <div className="vault-balance-card">
        {loading && !summary ? (
          <div className="page-loading" style={{ padding: "1.25rem 0" }}>
            <LoadingSpinner size="md" />
            <span>Loading vault balance…</span>
          </div>
        ) : (
          <>
            <div className="vault-balance-label">Cash available</div>
            <div className="vault-balance-value">{summary ? formatMoneyLeones(summary.balance) : "—"}</div>
            <p className="vault-balance-hint">Amounts in Le (SLL). Gold purchases reduce this total; sale proceeds and deposits increase it.</p>
          </>
        )}
      </div>

      {canDeposit ? (
        <>
          <ScreenSectionTitle>Add cash to vault</ScreenSectionTitle>
          <FormCard variant="screen" title="Deposit" description="Record money moved into the operating pool." onSubmit={onDeposit}>
            <FormInput
              label="Amount (Le)"
              type="number"
              min="0"
              step="0.01"
              value={depositAmount}
              onChange={setDepositAmount}
              placeholder="0"
              required
            />
            <FormTextarea label="Note (optional)" value={depositNote} onChange={setDepositNote} rows={2} placeholder="e.g. Bank transfer ref" />
            <FormButton label="Record deposit" loadingLabel="Saving…" loading={depositLoading} />
          </FormCard>
        </>
      ) : null}

      <ScreenSectionTitle>Recent movement</ScreenSectionTitle>
      <div className="vault-movements-wrap">
        {loading && movements.length === 0 ? (
          <div className="page-loading" style={{ padding: "1.5rem" }}>
            <LoadingSpinner size="md" />
            <span>Loading activity…</span>
          </div>
        ) : movements.length === 0 ? (
          <p className="screen-empty">No vault activity yet. Add a deposit or create a purchase or sale.</p>
        ) : (
          <table className="vault-movements-table">
            <thead>
              <tr>
                <th scope="col">When (UTC)</th>
                <th scope="col">Description</th>
                <th scope="col">Change</th>
                <th scope="col">Balance after</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((row) => (
                <tr key={row.id}>
                  <td className="vault-mono">{formatDateTimeUtc(row.createdAt)}</td>
                  <td>{row.label}</td>
                  <td className={row.delta >= 0 ? "vault-delta-pos" : "vault-delta-neg"}>
                    {row.delta >= 0 ? "+" : ""}
                    {formatMoneyLeones(row.delta)}
                  </td>
                  <td>{formatMoneyLeones(row.balanceAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppScreen>
  );
}
