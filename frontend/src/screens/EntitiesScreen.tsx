"use client";

import { FormEvent, Fragment, useCallback, useEffect, useState } from "react";
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
import { notifyError } from "@/utils/notify";
import { actionFeedback } from "@/utils/actionFeedback";
import { formatMoneyLeones } from "@/utils/formatDisplay";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { DeleteIconButton, EditIconButton, ViewIconButton } from "@/components/ui/CrudIconButtons";

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
  const canUpdate = can(role, "entities:update");
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

  const [viewingEntityId, setViewingEntityId] = useState<string | null>(null);
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [editEntityName, setEditEntityName] = useState("");
  const [editEntityPhone, setEditEntityPhone] = useState("");
  const [editEntityNotes, setEditEntityNotes] = useState("");
  const [entityEditLoading, setEntityEditLoading] = useState(false);

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
      actionFeedback.ledgerSaved();
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
      actionFeedback.ledgerRemoved();
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
      actionFeedback.partnerCreated();
      await loadEntities();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to create partner.";
      setMessage(text);
      notifyError(text);
    } finally {
      setLoading(false);
    }
  }

  function startEditEntity(en: Entity) {
    setEditingEntityId(en._id);
    setEditEntityName(en.name);
    setEditEntityPhone(en.phone ?? "");
    setEditEntityNotes(en.notes ?? "");
    setViewingEntityId(null);
  }

  function cancelEntityEdit() {
    setEditingEntityId(null);
  }

  async function handleSaveEntity(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingEntityId) return;
    if (editEntityName.trim().length < 2) {
      setMessage("Partner name must be at least 2 characters.");
      return;
    }
    try {
      setEntityEditLoading(true);
      await apiService.updateEntity(editingEntityId, {
        name: editEntityName.trim(),
        phone: editEntityPhone.trim() || undefined,
        notes: editEntityNotes.trim() || undefined,
      });
      setEditingEntityId(null);
      setMessage("Partner updated.");
      actionFeedback.partnerUpdated();
      await loadEntities();
      await loadLedger(ledgerEntityId);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to update partner.";
      setMessage(text);
      notifyError(text);
    } finally {
      setEntityEditLoading(false);
    }
  }

  async function handleDeleteEntity(id: string) {
    if (!window.confirm("Delete this partner and related data? This cannot be undone.")) return;
    try {
      await apiService.deleteEntity(id);
      await loadEntities();
      actionFeedback.partnerDeleted();
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
              <div className="page-loading" style={{ padding: "1.5rem" }}>
                <LoadingSpinner size="md" />
                <span>Loading ledger…</span>
              </div>
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
                          <DeleteIconButton label="Remove ledger row" onClick={() => handleDeleteLedgerEntry(row._id)} />
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
      {fetching ? (
        <div className="page-loading">
          <LoadingSpinner size="lg" />
          <span>Loading partners…</span>
        </div>
      ) : entities.length === 0 ? (
        <ScreenEmpty>No partners yet.</ScreenEmpty>
      ) : (
        <div className="crud-table-wrap">
          <table className="crud-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Phone</th>
                <th scope="col">Notes</th>
                <th scope="col" className="crud-table__actions">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {entities.map((entity) => {
                const isEditing = editingEntityId === entity._id && canUpdate;
                const colCount = 4;
                return (
                  <Fragment key={entity._id}>
                    <tr>
                      <td>{entity.name}</td>
                      <td>{entity.phone ?? "—"}</td>
                      <td>{entity.notes ? (entity.notes.length > 60 ? `${entity.notes.slice(0, 60)}…` : entity.notes) : "—"}</td>
                      <td className="crud-table__actions">
                        <div className="crud-table__actions-inner">
                          <ViewIconButton
                            label={viewingEntityId === entity._id ? "Hide details" : "View full notes"}
                            onClick={() => setViewingEntityId((id) => (id === entity._id ? null : entity._id))}
                          />
                          {canUpdate ? (
                            <EditIconButton label="Edit partner" onClick={() => startEditEntity(entity)} disabled={isEditing} />
                          ) : null}
                          {canDelete ? <DeleteIconButton label="Delete partner" onClick={() => handleDeleteEntity(entity._id)} /> : null}
                        </div>
                      </td>
                    </tr>
                    {viewingEntityId === entity._id ? (
                      <tr className="crud-detail-row">
                        <td colSpan={colCount}>
                          <strong>Notes:</strong> {entity.notes?.trim() ? entity.notes : "No notes on file."}
                        </td>
                      </tr>
                    ) : null}
                    {isEditing ? (
                      <tr className="crud-table-row--edit">
                        <td colSpan={colCount}>
                          <form className="list-form-stack" onSubmit={handleSaveEntity}>
                            <div className="form-grid form-grid--2col-sm">
                              <FormInput label="Name" value={editEntityName} onChange={setEditEntityName} placeholder="Partner name" required />
                              <FormInput label="Phone" value={editEntityPhone} onChange={setEditEntityPhone} placeholder="Optional" />
                              <FormTextarea label="Notes" rows={3} value={editEntityNotes} onChange={setEditEntityNotes} placeholder="Optional" />
                            </div>
                            <div className="list-form-actions">
                              <FormButton label="Save partner" loadingLabel="Saving…" loading={entityEditLoading} />
                              <button type="button" className="btn-ghost" onClick={cancelEntityEdit}>
                                Cancel
                              </button>
                            </div>
                          </form>
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
