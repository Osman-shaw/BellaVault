"use client";

import { FormEvent, Fragment, useEffect, useState } from "react";
import { apiService, Borrow, BorrowPaymentStatus } from "@/services/apiService";
import { FormButton } from "@/components/form/FormButton";
import { FormCard } from "@/components/form/FormCard";
import { FormInput } from "@/components/form/FormInput";
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
import { formatDateTimeUtc } from "@/utils/formatDisplay";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { DeleteIconButton, EditIconButton, ViewIconButton } from "@/components/ui/CrudIconButtons";
import { messageFeedbackVariant } from "@/utils/messageFeedbackVariant";
import { notifyError } from "@/utils/notify";
import { actionFeedback } from "@/utils/actionFeedback";

function borrowStatusTone(status: BorrowPaymentStatus): "success" | "warn" {
  return status === "paid" ? "success" : "warn";
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BorrowsScreen() {
  const { role } = useRole();
  const canRead = can(role, "borrows:read");
  const canCreate = can(role, "borrows:create");
  const canUpdate = can(role, "borrows:update");
  const canDelete = can(role, "borrows:delete");

  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [borrowerName, setBorrowerName] = useState("");
  const [borrowerContact, setBorrowerContact] = useState("");
  const [borrowedAt, setBorrowedAt] = useState("");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [initialPaid, setInitialPaid] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editBorrowedAt, setEditBorrowedAt] = useState("");
  const [editPrincipal, setEditPrincipal] = useState("");
  const [editAdditionalPayment, setEditAdditionalPayment] = useState("");
  const [editTotalPaidOverride, setEditTotalPaidOverride] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  async function loadBorrows() {
    try {
      setFetching(true);
      const data = await apiService.getBorrows();
      setBorrows(data);
    } catch {
      setMessage("Failed to load borrow records.");
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (!canRead) return;
    loadBorrows();
  }, [canRead]);

  function startEdit(b: Borrow) {
    setViewingId(null);
    setEditingId(b._id);
    setEditName(b.borrowerName);
    setEditContact(b.borrowerContact);
    setEditBorrowedAt(toDatetimeLocalValue(b.borrowedAt));
    setEditPrincipal(String(b.principalAmount));
    setEditAdditionalPayment("");
    setEditTotalPaidOverride("");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    const principal = Number(principalAmount);
    const paidSoFar = initialPaid === "" ? 0 : Number(initialPaid);

    if (!borrowedAt) {
      setMessage("Date and time are required.");
      return;
    }
    if (!Number.isFinite(principal) || principal <= 0) {
      setMessage("Amount borrowed must be greater than 0.");
      return;
    }
    if (borrowerName.trim().length < 2) {
      setMessage("Borrower name must be at least 2 characters.");
      return;
    }
    if (borrowerContact.trim().length < 3) {
      setMessage("Contact is required.");
      return;
    }
    if (!Number.isFinite(paidSoFar) || paidSoFar < 0) {
      setMessage("Initial amount paid cannot be negative.");
      return;
    }

    try {
      setLoading(true);
      await apiService.createBorrow({
        borrowerName: borrowerName.trim(),
        borrowerContact: borrowerContact.trim(),
        borrowedAt: new Date(borrowedAt).toISOString(),
        principalAmount: principal,
        amountPaid: paidSoFar > 0 ? paidSoFar : undefined,
      });
      setBorrowerName("");
      setBorrowerContact("");
      setBorrowedAt("");
      setPrincipalAmount("");
      setInitialPaid("");
      setMessage("Borrow record created.");
      actionFeedback.borrowCreated();
      await loadBorrows();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to create borrow record.";
      setMessage(text);
      notifyError(text);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingId) return;

    const principal = Number(editPrincipal);
    const addPay = editAdditionalPayment === "" ? NaN : Number(editAdditionalPayment);
    const overrideRaw = editTotalPaidOverride.trim();
    const override = overrideRaw === "" ? NaN : Number(overrideRaw);

    if (!editBorrowedAt) {
      setMessage("Date and time are required.");
      return;
    }
    if (!Number.isFinite(principal) || principal <= 0) {
      setMessage("Principal must be greater than 0.");
      return;
    }
    if (editName.trim().length < 2 || editContact.trim().length < 3) {
      setMessage("Check name and contact.");
      return;
    }

    if (Number.isFinite(addPay) && addPay > 0 && Number.isFinite(override)) {
      setMessage('Use either "Record payment" or "Set total paid", not both.');
      return;
    }

    const payload: Parameters<typeof apiService.updateBorrow>[1] = {
      borrowerName: editName.trim(),
      borrowerContact: editContact.trim(),
      borrowedAt: new Date(editBorrowedAt).toISOString(),
      principalAmount: principal,
    };

    if (Number.isFinite(override)) {
      if (override < 0) {
        setMessage("Total paid cannot be negative.");
        return;
      }
      payload.amountPaid = override;
    } else if (Number.isFinite(addPay) && addPay > 0) {
      payload.additionalPayment = addPay;
    }

    try {
      setEditLoading(true);
      await apiService.updateBorrow(editingId, payload);
      setEditingId(null);
      setMessage("Borrow record updated.");
      actionFeedback.borrowUpdated();
      await loadBorrows();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to update borrow record.";
      setMessage(text);
      notifyError(text);
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this borrow record?")) return;
    try {
      await apiService.deleteBorrow(id);
      await loadBorrows();
      actionFeedback.borrowDeleted();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to delete borrow record.";
      setMessage(text);
      notifyError(text);
    }
  }

  if (!canRead) {
    return <AccessDenied message="You are not allowed to view cash borrows." />;
  }

  return (
    <AppScreen
      title="Cash borrows"
      description="Track cash lent: principal, repayments, and balance. Status is pending until fully repaid, then paid. Use Record payment or Set total paid when editing."
    >
      {!canCreate ? <ReadOnlyBanner /> : null}

      {canCreate ? (
        <FormCard variant="screen" title="New borrow" onSubmit={handleCreate}>
          <FormInput placeholder="Borrower name" value={borrowerName} onChange={setBorrowerName} required />
          <FormInput placeholder="Contact" value={borrowerContact} onChange={setBorrowerContact} required />
          <FormInput type="datetime-local" placeholder="When" value={borrowedAt} onChange={setBorrowedAt} required />
          <FormInput
            type="number"
            step="any"
            min="0"
            placeholder="Amount borrowed (principal)"
            value={principalAmount}
            onChange={setPrincipalAmount}
            required
          />
          <FormInput
            type="number"
            step="any"
            min="0"
            placeholder="Already paid at loan time (optional)"
            value={initialPaid}
            onChange={setInitialPaid}
          />
          <FormButton label="Save borrow" loadingLabel="Saving..." loading={loading} />
        </FormCard>
      ) : null}

      {message ? (
        <ScreenFeedback variant={messageFeedbackVariant(message)}>{message}</ScreenFeedback>
      ) : null}

      <ScreenSectionTitle>Records</ScreenSectionTitle>
      {fetching ? (
        <div className="page-loading">
          <LoadingSpinner size="lg" />
          <span>Loading borrows…</span>
        </div>
      ) : borrows.length === 0 ? (
        <ScreenEmpty>No borrow records yet.</ScreenEmpty>
      ) : (
        <div className="crud-table-wrap">
          <table className="crud-table">
            <thead>
              <tr>
                <th scope="col">Borrower</th>
                <th scope="col">Contact</th>
                <th scope="col">Borrowed at</th>
                <th scope="col" className="num">
                  Principal (Le)
                </th>
                <th scope="col" className="num">
                  Paid (Le)
                </th>
                <th scope="col" className="num">
                  Balance (Le)
                </th>
                <th scope="col">Status</th>
                <th scope="col" className="crud-table__actions">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {borrows.map((b) => {
                const isEditing = editingId === b._id && canUpdate;
                const colCount = 8;
                return (
                  <Fragment key={b._id}>
                    <tr>
                      <td>{b.borrowerName}</td>
                      <td>{b.borrowerContact}</td>
                      <td>{formatDateTimeUtc(b.borrowedAt)}</td>
                      <td className="num">{b.principalAmount.toFixed(2)}</td>
                      <td className="num">{Number(b.amountPaid).toFixed(2)}</td>
                      <td className="num">{Number(b.remainingBalance).toFixed(2)}</td>
                      <td>
                        <StatusPill tone={borrowStatusTone(b.status)}>{b.status}</StatusPill>
                      </td>
                      <td className="crud-table__actions">
                        <div className="crud-table__actions-inner">
                          <ViewIconButton
                            label={viewingId === b._id ? "Hide details" : "View details"}
                            onClick={() => setViewingId((id) => (id === b._id ? null : b._id))}
                          />
                          {canUpdate ? <EditIconButton label="Edit borrow" onClick={() => startEdit(b)} disabled={isEditing} /> : null}
                          {canDelete ? <DeleteIconButton label="Delete borrow" onClick={() => handleDelete(b._id)} /> : null}
                        </div>
                      </td>
                    </tr>
                    {viewingId === b._id ? (
                      <tr className="crud-detail-row">
                        <td colSpan={colCount}>
                          <strong>Created:</strong> {formatDateTimeUtc(b.createdAt)}
                          {b.updatedAt ? (
                            <>
                              {" "}
                              · <strong>Updated:</strong> {formatDateTimeUtc(b.updatedAt)}
                            </>
                          ) : null}
                        </td>
                      </tr>
                    ) : null}
                    {isEditing ? (
                      <tr className="crud-table-row--edit">
                        <td colSpan={colCount}>
                          <form className="list-form-stack" onSubmit={handleSaveEdit}>
                            <FormInput label="Borrower name" value={editName} onChange={setEditName} placeholder="" required />
                            <FormInput label="Contact" value={editContact} onChange={setEditContact} placeholder="" required />
                            <FormInput type="datetime-local" label="When borrowed" value={editBorrowedAt} onChange={setEditBorrowedAt} placeholder="" required />
                            <FormInput
                              type="number"
                              step="any"
                              min="0"
                              label="Principal (amount borrowed)"
                              value={editPrincipal}
                              onChange={setEditPrincipal}
                              placeholder=""
                              required
                            />
                            <p className="report-muted" style={{ margin: 0, fontSize: 13 }}>
                              Current paid: Le {Number(b.amountPaid).toFixed(2)} · Balance: Le {Number(b.remainingBalance).toFixed(2)}
                            </p>
                            <FormInput
                              type="number"
                              step="any"
                              min="0"
                              label="Record payment (adds to paid)"
                              value={editAdditionalPayment}
                              onChange={setEditAdditionalPayment}
                              placeholder=""
                            />
                            <FormInput
                              type="number"
                              step="any"
                              min="0"
                              label="Or set total paid (full amount to date)"
                              value={editTotalPaidOverride}
                              onChange={setEditTotalPaidOverride}
                              placeholder=""
                            />
                            <div className="list-form-actions">
                              <FormButton label="Save" loadingLabel="Saving..." loading={editLoading} />
                              <button type="button" className="btn-ghost" onClick={cancelEdit}>
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
