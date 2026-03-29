"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiService, Entity, PartnerLedgerRow } from "@/services/apiService";
import { FormButton } from "@/components/form/FormButton";
import { FormCard } from "@/components/form/FormCard";
import { FormInput } from "@/components/form/FormInput";
import { FormSelect } from "@/components/form/FormSelect";
import { FormTextarea } from "@/components/form/FormTextarea";
import {
  AccessDenied,
  AppScreen,
  ReadOnlyBanner,
  ScreenEmpty,
  ScreenFeedback,
  ScreenSectionTitle,
} from "@/components/layout/AppScreen";
import { can } from "@/state/rbac";
import { useRole } from "@/state/useRole";
import { messageFeedbackVariant } from "@/utils/messageFeedbackVariant";
import { notifyError, notifySuccess } from "@/utils/notify";
import { formatMoneyLeones } from "@/utils/formatDisplay";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function defaultDateInputValue() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function defaultTimeInputValue() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Local calendar date + wall time → ISO stored in UTC. */
function toRecordedAtIso(dateStr: string, timeStr: string) {
  const [y, mo, da] = dateStr.split("-").map(Number);
  const [hh, mi] = timeStr.split(":").map(Number);
  const dt = new Date(y, mo - 1, da, hh, mi, 0, 0);
  return dt.toISOString();
}

function formatLedgerDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatLedgerTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function EntitiesScreen() {
  const { role } = useRole();
  const canRead = can(role, "entities:read");
  const canCreate = can(role, "entities:create");
  const canDelete = can(role, "entities:delete");

  const [entities, setEntities] = useState<Entity[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [ledgerEntityId, setLedgerEntityId] = useState("");
  const [ledgerRows, setLedgerRows] = useState<PartnerLedgerRow[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerSaving, setLedgerSaving] = useState(false);
  const [ledgerDate, setLedgerDate] = useState(defaultDateInputValue);
  const [ledgerTime, setLedgerTime] = useState(defaultTimeInputValue);
  const [ledgerInvested, setLedgerInvested] = useState("");
  const [ledgerReceived, setLedgerReceived] = useState("");

  const canManageLedger = canCreate;

  const loadLedger = useCallback(async (entityId: string) => {
    if (!entityId) {
      setLedgerRows([]);
      return;
    }
    try {
      setLedgerLoading(true);
      const rows = await apiService.getPartnerLedger(entityId);
      setLedgerRows(rows);
    } catch {
      setLedgerRows([]);
      notifyError("Could not load partner capital records.");
    } finally {
      setLedgerLoading(false);
    }
  }, []);

  async function loadEntities() {
    try {
      setFetching(true);
      const data = await apiService.getEntities();
      setEntities(data);
      setLedgerEntityId((prev) => {
        if (prev && data.some((e) => e._id === prev)) return prev;
        return data[0]?._id ?? "";
      });
    } catch {
      setMessage("Failed to load partners.");
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (!canRead) return;
    loadEntities();
  }, [canRead]);

  useEffect(() => {
    if (!canRead || !ledgerEntityId) return;
    loadLedger(ledgerEntityId);
  }, [canRead, ledgerEntityId, loadLedger]);

  async function handleCreateLedgerEntry(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ledgerEntityId) return;
    const invested = Number(ledgerInvested) || 0;
    const received = Number(ledgerReceived) || 0;
    if (invested <= 0 && received <= 0) {
      notifyError("Enter money invested and/or money received (at least one must be greater than 0).");
      return;
    }
    try {
      setLedgerSaving(true);
      await apiService.createPartnerLedgerEntry(ledgerEntityId, {
        recordedAt: toRecordedAtIso(ledgerDate, ledgerTime),
        moneyInvested: invested,
        moneyReceived: received,
      });
      setLedgerInvested("");
      setLedgerReceived("");
      setLedgerDate(defaultDateInputValue());
      setLedgerTime(defaultTimeInputValue());
      notifySuccess("Capital record saved.");
      await loadLedger(ledgerEntityId);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Failed to save record.");
    } finally {
      setLedgerSaving(false);
    }
  }

  async function handleDeleteLedgerEntry(entryId: string) {
    if (!ledgerEntityId) return;
    if (!window.confirm("Remove this capital record? Running totals will update.")) return;
    try {
      await apiService.deletePartnerLedgerEntry(ledgerEntityId, entryId);
      notifySuccess("Record removed.");
      await loadLedger(ledgerEntityId);
    } catch (error) {
      notifyError(error instanceof Error ? error.message : "Failed to remove record.");
    }
  }

  async function handleCreateEntity(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (name.trim().length < 2) {
      setMessage("Partner name must be at least 2 characters.");
      return;
    }

    try {
      setLoading(true);
      await apiService.createEntity({
        name: name.trim(),
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setName("");
      setPhone("");
      setNotes("");
      setMessage("Partner created successfully.");
      notifySuccess("Partner created successfully.");
      await loadEntities();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to create partner.";
      setMessage(text);
      notifyError(text);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteEntity(id: string) {
    try {
      await apiService.deleteEntity(id);
      await loadEntities();
      notifySuccess("Partner deleted.");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to delete partner.";
      setMessage(text);
      notifyError(text);
    }
  }

  if (!canRead) {
    return <AccessDenied message="You are not allowed to view partners." />;
  }

  return (
    <AppScreen
      title="Partners"
      description="Business partners for deals and relationships. Track per-partner capital: date & time, money invested, money received or profits, running total capital (invested + received), and remaining balance (invested − received)."
    >
      {!canCreate ? <ReadOnlyBanner /> : null}
      {canCreate ? (
        <FormCard variant="screen" title="New partner" onSubmit={handleCreateEntity}>
          <FormInput placeholder="Name" value={name} onChange={setName} required />
          <FormInput placeholder="Phone (optional)" value={phone} onChange={setPhone} />
          <FormTextarea placeholder="Notes (optional)" value={notes} onChange={setNotes} rows={3} />
          <FormButton label="Create partner" loadingLabel="Creating..." loading={loading} />
        </FormCard>
      ) : null}
      {message ? (
        <ScreenFeedback variant={messageFeedbackVariant(message)}>{message}</ScreenFeedback>
      ) : null}
      <ScreenSectionTitle>Capital &amp; profits</ScreenSectionTitle>
      {entities.length === 0 && !fetching ? (
        <ScreenEmpty>Add a partner above to record capital and profits.</ScreenEmpty>
      ) : (
        <div className="partner-ledger-wrap">
          <FormSelect
            fieldLabel="Partner for this ledger"
            value={ledgerEntityId}
            onChange={setLedgerEntityId}
            required
            options={
              entities.length === 0
                ? [{ label: "No partners yet", value: "" }]
                : entities.map((en) => ({ label: en.name, value: en._id }))
            }
          />
          <p className="partner-ledger-hint">
            Each row is one event in time. <strong>Total capital</strong> is cumulative (money invested + money received)
            up to that row. <strong>Remaining balance</strong> is cumulative invested minus cumulative received (net with
            the partner).
          </p>
          {canManageLedger ? (
            <FormCard variant="screen" title="New record" onSubmit={handleCreateLedgerEntry}>
              <div className="form-grid form-grid--2col-sm">
                <FormInput label="Date" type="date" value={ledgerDate} onChange={setLedgerDate} placeholder="" required />
                <FormInput label="Time" type="time" value={ledgerTime} onChange={setLedgerTime} placeholder="" required />
                <FormInput
                  label="Money invested"
                  type="number"
                  min="0"
                  step="0.01"
                  value={ledgerInvested}
                  onChange={setLedgerInvested}
                  placeholder="0"
                />
                <FormInput
                  label="Money received / profits"
                  type="number"
                  min="0"
                  step="0.01"
                  value={ledgerReceived}
                  onChange={setLedgerReceived}
                  placeholder="0"
                />
              </div>
              <FormButton label="Save record" loadingLabel="Saving…" loading={ledgerSaving} />
            </FormCard>
          ) : null}
          <div className="partner-ledger-table-wrap">
            {ledgerLoading ? (
              <p className="partner-ledger-empty">Loading records…</p>
            ) : ledgerRows.length === 0 ? (
              <p className="partner-ledger-empty">No capital records for this partner yet.</p>
            ) : (
              <table className="partner-ledger-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Time</th>
                    <th scope="col">Invested</th>
                    <th scope="col">Received / profits</th>
                    <th scope="col">Total capital</th>
                    <th scope="col">Remaining balance</th>
                    {canManageLedger ? <th scope="col" className="partner-ledger-actions" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.map((row) => (
                    <tr key={row._id}>
                      <td>{formatLedgerDate(row.recordedAt)}</td>
                      <td>{formatLedgerTime(row.recordedAt)}</td>
                      <td>{formatMoneyLeones(row.moneyInvested)}</td>
                      <td>{formatMoneyLeones(row.moneyReceived)}</td>
                      <td>{formatMoneyLeones(row.totalCapital)}</td>
                      <td>{formatMoneyLeones(row.remainingBalance)}</td>
                      {canManageLedger ? (
                        <td className="partner-ledger-actions">
                          <button type="button" className="btn-ghost" onClick={() => handleDeleteLedgerEntry(row._id)}>
                            Remove
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <ScreenSectionTitle>Directory</ScreenSectionTitle>
      <div className="list-grid">
        {fetching
          ? Array.from({ length: 4 }).map((_, index) => (
              <article key={index} className="skeleton-card">
                <div className="skeleton-line md" />
                <div className="skeleton-line lg" />
                <div className="skeleton-line sm" />
                <div className="skeleton-shimmer" />
              </article>
            ))
          : entities.map((entity) => (
              <article key={entity._id} className="list-card">
                <div className="list-card__main">
                  <div className="list-card__title">{entity.name}</div>
                  <div className="list-card__meta">{entity.phone ? entity.phone : "No phone on file"}</div>
                </div>
                <div className="list-card__actions">
                  {canDelete ? (
                    <button type="button" className="danger-button" onClick={() => handleDeleteEntity(entity._id)}>
                      Delete
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
        {!fetching && entities.length === 0 ? <ScreenEmpty>No partners yet.</ScreenEmpty> : null}
      </div>
    </AppScreen>
  );
}
