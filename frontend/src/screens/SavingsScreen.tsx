"use client";

import { FormEvent, Fragment, useEffect, useState } from "react";
import {
  apiService,
  SavingsAccount,
  SavingsTransaction,
  SavingsTransactionKind,
} from "@/services/apiService";
import { FormButton } from "@/components/form/FormButton";
import { FormCard } from "@/components/form/FormCard";
import { FormInput } from "@/components/form/FormInput";
import { FormTextarea } from "@/components/form/FormTextarea";
import {
  AccessDenied,
  AppScreen,
  ReadOnlyBanner,
  ScreenEmpty,
  ScreenFeedback,
  ScreenSectionTitle,
  StatusPill,
} from "@/components/layout/AppScreen";
import { can } from "@/state/rbac";
import { useRole } from "@/state/useRole";
import { formatDateTimeUtc, formatDateUtc, formatMoneyLeones } from "@/utils/formatDisplay";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { DeleteIconButton, EditIconButton, ViewIconButton } from "@/components/ui/CrudIconButtons";
import { messageFeedbackVariant } from "@/utils/messageFeedbackVariant";
import { notifyError } from "@/utils/notify";
import { actionFeedback } from "@/utils/actionFeedback";

type PanelMode = "none" | "deposit" | "withdraw" | "edit" | "history";

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function transactionTone(kind: SavingsTransactionKind): "success" | "warn" | "info" {
  if (kind === "withdrawal") return "warn";
  if (kind === "deposit") return "success";
  return "info";
}

export function SavingsScreen() {
  const { role } = useRole();
  const canRead = can(role, "savings:read");
  const canCreate = can(role, "savings:create");
  const canUpdate = can(role, "savings:update");
  const canTransact = can(role, "savings:transact");
  const canDelete = can(role, "savings:delete");

  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState("");

  const [newName, setNewName] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newOpenedAt, setNewOpenedAt] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newNote, setNewNote] = useState("");
  const [creating, setCreating] = useState(false);

  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("none");

  const [txnAmount, setTxnAmount] = useState("");
  const [txnOccurredAt, setTxnOccurredAt] = useState("");
  const [txnNote, setTxnNote] = useState("");
  const [txnLoading, setTxnLoading] = useState(false);

  const [editName, setEditName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<SavingsTransaction[]>([]);

  async function loadAccounts() {
    try {
      setFetching(true);
      const data = await apiService.getSavingsAccounts();
      setAccounts(data);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to load savings accounts.";
      setMessage(text);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (!canRead) return;
    loadAccounts();
  }, [canRead]);

  function closePanel() {
    setActiveAccountId(null);
    setPanelMode("none");
    setTxnAmount("");
    setTxnOccurredAt("");
    setTxnNote("");
    setHistory([]);
  }

  function openTransact(account: SavingsAccount, mode: "deposit" | "withdraw") {
    setActiveAccountId(account._id);
    setPanelMode(mode);
    setTxnAmount("");
    setTxnOccurredAt("");
    setTxnNote("");
  }

  function openEdit(account: SavingsAccount) {
    setActiveAccountId(account._id);
    setPanelMode("edit");
    setEditName(account.depositorName);
    setEditContact(account.depositorContact);
    setEditAddress(account.depositorAddress);
  }

  async function openHistory(account: SavingsAccount) {
    setActiveAccountId(account._id);
    setPanelMode("history");
    setHistory([]);
    try {
      setHistoryLoading(true);
      const rows = await apiService.getSavingsTransactions(account._id);
      setHistory(rows);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to load transactions.";
      notifyError(text);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const amount = Number(newAmount);
    if (newName.trim().length < 2) {
      setMessage("Depositor name must be at least 2 characters.");
      return;
    }
    if (newContact.trim().length < 3) {
      setMessage("Contact is required.");
      return;
    }
    if (newAddress.trim().length < 3) {
      setMessage("Address is required.");
      return;
    }
    if (!newOpenedAt) {
      setMessage("Opening date is required.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Initial deposit must be greater than 0.");
      return;
    }

    try {
      setCreating(true);
      await apiService.createSavingsAccount({
        depositorName: newName.trim(),
        depositorContact: newContact.trim(),
        depositorAddress: newAddress.trim(),
        openedAt: new Date(newOpenedAt).toISOString(),
        initialDeposit: amount,
        note: newNote.trim() || undefined,
      });
      setNewName("");
      setNewContact("");
      setNewAddress("");
      setNewOpenedAt("");
      setNewAmount("");
      setNewNote("");
      setMessage("Savings account created.");
      actionFeedback.savingsOpened();
      await loadAccounts();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to open savings account.";
      setMessage(text);
      notifyError(text);
    } finally {
      setCreating(false);
    }
  }

  async function handleTransact(event: FormEvent<HTMLFormElement>, mode: "deposit" | "withdraw") {
    event.preventDefault();
    if (!activeAccountId) return;

    const amount = Number(txnAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Amount must be greater than 0.");
      return;
    }

    const payload = {
      amount,
      occurredAt: txnOccurredAt ? new Date(txnOccurredAt).toISOString() : undefined,
      note: txnNote.trim() || undefined,
    };

    try {
      setTxnLoading(true);
      if (mode === "deposit") {
        await apiService.savingsDeposit(activeAccountId, payload);
        actionFeedback.savingsDeposit();
      } else {
        await apiService.savingsWithdraw(activeAccountId, payload);
        actionFeedback.savingsWithdrawal();
      }
      setMessage(mode === "deposit" ? "Deposit created." : "Withdrawal created.");
      closePanel();
      await loadAccounts();
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : `Failed to record ${mode === "deposit" ? "deposit" : "withdrawal"}.`;
      setMessage(text);
      notifyError(text);
    } finally {
      setTxnLoading(false);
    }
  }

  async function handleSaveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeAccountId) return;

    if (editName.trim().length < 2 || editContact.trim().length < 3 || editAddress.trim().length < 3) {
      setMessage("Check depositor name, contact and address.");
      return;
    }

    try {
      setEditLoading(true);
      await apiService.updateSavingsAccount(activeAccountId, {
        depositorName: editName.trim(),
        depositorContact: editContact.trim(),
        depositorAddress: editAddress.trim(),
      });
      setMessage("Depositor details successfully updated.");
      actionFeedback.savingsUpdated();
      closePanel();
      await loadAccounts();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to update depositor.";
      setMessage(text);
      notifyError(text);
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(account: SavingsAccount) {
    if (Number(account.balance) > 0) {
      notifyError("Withdraw the remaining balance before closing this account.");
      return;
    }
    if (!window.confirm(`Close savings account ${account.accountNumber}? This removes its transaction history.`)) {
      return;
    }
    try {
      await apiService.deleteSavingsAccount(account._id);
      actionFeedback.savingsClosed();
      if (activeAccountId === account._id) closePanel();
      await loadAccounts();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to close savings account.";
      setMessage(text);
      notifyError(text);
    }
  }

  if (!canRead) {
    return <AccessDenied message="You are not allowed to view savings accounts." />;
  }

  const colCount = 9;

  return (
    <AppScreen
      title="Savings & depositors"
      description="Track customer deposits held for safe-keeping. Each depositor gets a unique account number; deposits and withdrawals update the running balance. A 30-day check-in highlights depositors you still hold cash for."
    >
      {!canCreate ? <ReadOnlyBanner /> : null}

      {canCreate ? (
        <FormCard variant="screen" title="Open new savings account" onSubmit={handleCreate}>
          <FormInput
            placeholder="Depositor full name"
            value={newName}
            onChange={setNewName}
            required
          />
          <FormInput placeholder="Contact (phone / other)" value={newContact} onChange={setNewContact} required />
          <FormInput
            placeholder="Residential / business address"
            value={newAddress}
            onChange={setNewAddress}
            required
          />
          <FormInput
            type="datetime-local"
            placeholder="Opening date & time"
            value={newOpenedAt}
            onChange={setNewOpenedAt}
            required
          />
          <FormInput
            type="number"
            step="any"
            min="0"
            placeholder="Initial amount deposited (Le)"
            value={newAmount}
            onChange={setNewAmount}
            required
          />
          <FormTextarea
            placeholder="Opening note (optional)"
            value={newNote}
            onChange={setNewNote}
            rows={2}
          />
          <FormButton label="Open account" loadingLabel="Opening..." loading={creating} />
        </FormCard>
      ) : null}

      {message ? (
        <ScreenFeedback variant={messageFeedbackVariant(message)}>{message}</ScreenFeedback>
      ) : null}

      <ScreenSectionTitle>Depositors</ScreenSectionTitle>
      {fetching ? (
        <div className="page-loading">
          <LoadingSpinner size="lg" />
          <span>Loading savings…</span>
        </div>
      ) : accounts.length === 0 ? (
        <ScreenEmpty>No savings accounts yet. Open one above to start tracking a depositor.</ScreenEmpty>
      ) : (
        <div className="crud-table-wrap">
          <table className="crud-table">
            <thead>
              <tr>
                <th scope="col">Account #</th>
                <th scope="col">Depositor</th>
                <th scope="col">Contact</th>
                <th scope="col">Address</th>
                <th scope="col">Opened</th>
                <th scope="col" className="num">
                  Balance (Le)
                </th>
                <th scope="col" className="num">
                  Total deposited (Le)
                </th>
                <th scope="col">Status</th>
                <th scope="col" className="crud-table__actions">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => {
                const active = activeAccountId === a._id && panelMode !== "none";
                return (
                  <Fragment key={a._id}>
                    <tr>
                      <td>
                        <code>{a.accountNumber}</code>
                      </td>
                      <td>{a.depositorName}</td>
                      <td>{a.depositorContact}</td>
                      <td>{a.depositorAddress}</td>
                      <td>{formatDateUtc(a.openedAt)}</td>
                      <td className="num">{formatMoneyLeones(a.balance).replace("Le ", "")}</td>
                      <td className="num">{formatMoneyLeones(a.totalDeposited).replace("Le ", "")}</td>
                      <td>
                        <StatusPill tone={a.status === "active" ? "success" : "neutral"}>{a.status}</StatusPill>
                      </td>
                      <td className="crud-table__actions">
                        <div className="crud-table__actions-inner">
                          <ViewIconButton
                            label={panelMode === "history" && activeAccountId === a._id ? "Hide history" : "View transactions"}
                            onClick={() =>
                              panelMode === "history" && activeAccountId === a._id
                                ? closePanel()
                                : openHistory(a)
                            }
                          />
                          {canTransact ? (
                            <>
                              <button
                                type="button"
                                className="btn-ghost"
                                onClick={() => openTransact(a, "deposit")}
                              >
                                Deposit
                              </button>
                              <button
                                type="button"
                                className="btn-ghost"
                                onClick={() => openTransact(a, "withdraw")}
                              >
                                Withdraw
                              </button>
                            </>
                          ) : null}
                          {canUpdate ? (
                            <EditIconButton label="Edit depositor" onClick={() => openEdit(a)} disabled={active && panelMode === "edit"} />
                          ) : null}
                          {canDelete ? (
                            <DeleteIconButton label="Close account" onClick={() => handleDelete(a)} />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {active ? (
                      <tr className="crud-table-row--edit">
                        <td colSpan={colCount}>
                          {panelMode === "deposit" || panelMode === "withdraw" ? (
                            <form
                              className="list-form-stack"
                              onSubmit={(e) => handleTransact(e, panelMode === "deposit" ? "deposit" : "withdraw")}
                            >
                              <p className="report-muted" style={{ margin: 0, fontSize: 13 }}>
                                {panelMode === "deposit" ? "New deposit" : "New withdrawal"} for{" "}
                                <strong>{a.depositorName}</strong> · Current balance{" "}
                                <strong>{formatMoneyLeones(a.balance)}</strong>.
                              </p>
                              <FormInput
                                type="number"
                                step="any"
                                min="0"
                                label={panelMode === "deposit" ? "Amount to deposit (Le)" : "Amount to withdraw (Le)"}
                                value={txnAmount}
                                onChange={setTxnAmount}
                                placeholder=""
                                required
                              />
                              <FormInput
                                type="datetime-local"
                                label="When (defaults to now)"
                                value={txnOccurredAt}
                                onChange={setTxnOccurredAt}
                                placeholder=""
                              />
                              <FormTextarea
                                label="Note (optional)"
                                value={txnNote}
                                onChange={setTxnNote}
                                placeholder=""
                                rows={2}
                              />
                              <div className="list-form-actions">
                                <FormButton
                                  label={panelMode === "deposit" ? "Record deposit" : "Record withdrawal"}
                                  loadingLabel="Saving..."
                                  loading={txnLoading}
                                />
                                <button type="button" className="btn-ghost" onClick={closePanel}>
                                  Cancel
                                </button>
                              </div>
                            </form>
                          ) : null}

                          {panelMode === "edit" ? (
                            <form className="list-form-stack" onSubmit={handleSaveEdit}>
                              <FormInput
                                label="Depositor name"
                                value={editName}
                                onChange={setEditName}
                                placeholder=""
                                required
                              />
                              <FormInput
                                label="Contact"
                                value={editContact}
                                onChange={setEditContact}
                                placeholder=""
                                required
                              />
                              <FormInput
                                label="Address"
                                value={editAddress}
                                onChange={setEditAddress}
                                placeholder=""
                                required
                              />
                              <div className="list-form-actions">
                                <FormButton label="Save changes" loadingLabel="Saving..." loading={editLoading} />
                                <button type="button" className="btn-ghost" onClick={closePanel}>
                                  Cancel
                                </button>
                              </div>
                            </form>
                          ) : null}

                          {panelMode === "history" ? (
                            <div>
                              <p className="report-muted" style={{ margin: "0 0 8px", fontSize: 13 }}>
                                Transaction history for <strong>{a.accountNumber}</strong> —{" "}
                                {a.depositorName}.
                              </p>
                              {historyLoading ? (
                                <div className="page-loading">
                                  <LoadingSpinner size="sm" />
                                  <span>Loading transactions…</span>
                                </div>
                              ) : history.length === 0 ? (
                                <ScreenEmpty>No transactions recorded for this depositor yet.</ScreenEmpty>
                              ) : (
                                <div className="crud-table-wrap">
                                  <table className="crud-table">
                                    <thead>
                                      <tr>
                                        <th scope="col">When</th>
                                        <th scope="col">Kind</th>
                                        <th scope="col" className="num">
                                          Amount (Le)
                                        </th>
                                        <th scope="col" className="num">
                                          Balance after (Le)
                                        </th>
                                        <th scope="col">Note</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {history.map((t) => (
                                        <tr key={t._id}>
                                          <td>{formatDateTimeUtc(t.occurredAt)}</td>
                                          <td>
                                            <StatusPill tone={transactionTone(t.kind)}>{t.kind}</StatusPill>
                                          </td>
                                          <td className="num">{Number(t.amount).toFixed(2)}</td>
                                          <td className="num">{Number(t.balanceAfter).toFixed(2)}</td>
                                          <td>{t.note || "—"}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                              <div className="list-form-actions">
                                <button type="button" className="btn-ghost" onClick={closePanel}>
                                  Close
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppScreen>
  );
}
