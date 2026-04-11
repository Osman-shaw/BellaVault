"use client";

import { FormEvent, Fragment, useEffect, useState } from "react";
import { apiService, Purchase, PurchaseStatus } from "@/services/apiService";
import { FormButton } from "@/components/form/FormButton";
import { FormCard } from "@/components/form/FormCard";
import { FormInput } from "@/components/form/FormInput";
import { FormSelect } from "@/components/form/FormSelect";
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
import { formatDateTimeUtc, formatDateUtc } from "@/utils/formatDisplay";
import { messageFeedbackVariant } from "@/utils/messageFeedbackVariant";
import { notifyError } from "@/utils/notify";
import { actionFeedback } from "@/utils/actionFeedback";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { DeleteIconButton, EditIconButton, ViewIconButton } from "@/components/ui/CrudIconButtons";

const statuses: PurchaseStatus[] = ["pending", "paid"];

function purchaseStatusTone(status: PurchaseStatus): "success" | "warn" {
  return status === "paid" ? "success" : "warn";
}

function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function PurchasesScreen() {
  const { role } = useRole();
  const canRead = can(role, "purchases:read");
  const canCreate = can(role, "purchases:create");
  const canUpdate = can(role, "purchases:update");
  const canDelete = can(role, "purchases:delete");

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchaseDate, setPurchaseDate] = useState("");
  const [buyingPrice, setBuyingPrice] = useState("");
  const [weightCarat, setWeightCarat] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [status, setStatus] = useState<PurchaseStatus>("pending");
  const [amountReceived, setAmountReceived] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPurchaseDate, setEditPurchaseDate] = useState("");
  const [editBuyingPrice, setEditBuyingPrice] = useState("");
  const [editWeightCarat, setEditWeightCarat] = useState("");
  const [editClientName, setEditClientName] = useState("");
  const [editClientContact, setEditClientContact] = useState("");
  const [editStatus, setEditStatus] = useState<PurchaseStatus>("pending");
  const [editAmountReceived, setEditAmountReceived] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  async function loadPurchases() {
    try {
      setFetching(true);
      const data = await apiService.getPurchases();
      setPurchases(data);
    } catch {
      setMessage("Failed to load purchases.");
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (!canRead) return;
    loadPurchases();
  }, [canRead]);

  function startEdit(p: Purchase) {
    setViewingId(null);
    setEditingId(p._id);
    setEditPurchaseDate(toDateInputValue(p.purchaseDate));
    setEditBuyingPrice(String(p.buyingPrice));
    setEditWeightCarat(String(p.weightCarat));
    setEditClientName(p.clientName);
    setEditClientContact(p.clientContact);
    setEditStatus(p.status);
    setEditAmountReceived(String(p.amountReceived ?? 0));
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    const price = Number(buyingPrice);
    const weight = Number(weightCarat);
    const received = amountReceived === "" ? 0 : Number(amountReceived);

    if (!purchaseDate) {
      setMessage("Purchase date is required.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setMessage("Buying price must be a valid non-negative number.");
      return;
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      setMessage("Weight (carat) must be greater than 0.");
      return;
    }
    if (clientName.trim().length < 2) {
      setMessage("Client name must be at least 2 characters.");
      return;
    }
    if (clientContact.trim().length < 3) {
      setMessage("Client contact is required.");
      return;
    }
    if (!Number.isFinite(received) || received < 0) {
      setMessage("Amount received cannot be negative.");
      return;
    }

    try {
      setLoading(true);
      await apiService.createPurchase({
        purchaseDate: new Date(purchaseDate).toISOString(),
        buyingPrice: price,
        weightCarat: weight,
        clientName: clientName.trim(),
        clientContact: clientContact.trim(),
        status,
        amountReceived: received,
      });
      setPurchaseDate("");
      setBuyingPrice("");
      setWeightCarat("");
      setClientName("");
      setClientContact("");
      setStatus("pending");
      setAmountReceived("");
      setMessage("Purchase recorded.");
      actionFeedback.purchaseCreated();
      await loadPurchases();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to create purchase.";
      setMessage(text);
      notifyError(text);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingId) return;

    const price = Number(editBuyingPrice);
    const weight = Number(editWeightCarat);
    const received = editAmountReceived === "" ? 0 : Number(editAmountReceived);

    if (!editPurchaseDate) {
      setMessage("Purchase date is required.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setMessage("Buying price must be a valid non-negative number.");
      return;
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      setMessage("Weight (carat) must be greater than 0.");
      return;
    }
    if (editClientName.trim().length < 2 || editClientContact.trim().length < 3) {
      setMessage("Check client name and contact.");
      return;
    }
    if (!Number.isFinite(received) || received < 0) {
      setMessage("Amount received cannot be negative.");
      return;
    }

    try {
      setEditLoading(true);
      await apiService.updatePurchase(editingId, {
        purchaseDate: new Date(editPurchaseDate).toISOString(),
        buyingPrice: price,
        weightCarat: weight,
        clientName: editClientName.trim(),
        clientContact: editClientContact.trim(),
        status: editStatus,
        amountReceived: received,
      });
      setEditingId(null);
      setMessage("Purchase updated.");
      actionFeedback.purchaseUpdated();
      await loadPurchases();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to update purchase.";
      setMessage(text);
      notifyError(text);
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this purchase record?")) return;
    try {
      await apiService.deletePurchase(id);
      await loadPurchases();
      actionFeedback.purchaseDeleted();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to delete purchase.";
      setMessage(text);
      notifyError(text);
    }
  }

  if (!canRead) {
    return <AccessDenied message="You are not allowed to view gold purchases." />;
  }

  return (
    <AppScreen
      title="Gold purchases"
      description="Record buying price, weight, client, payment status, and amount received for each purchase."
    >
      {!canCreate ? <ReadOnlyBanner /> : null}
      {canCreate ? (
        <FormCard variant="screen" title="Record gold purchase" onSubmit={handleCreate}>
          <FormInput type="date" placeholder="Purchase date" value={purchaseDate} onChange={setPurchaseDate} required />
          <FormInput
            type="number"
            step="any"
            min="0"
            placeholder="Buying price"
            value={buyingPrice}
            onChange={setBuyingPrice}
            required
          />
          <FormInput
            type="number"
            step="any"
            min="0"
            placeholder="Weight (carat)"
            value={weightCarat}
            onChange={setWeightCarat}
            required
          />
          <FormInput placeholder="Client name" value={clientName} onChange={setClientName} required />
          <FormInput placeholder="Client phone / contact" value={clientContact} onChange={setClientContact} required />
          <FormSelect
            value={status}
            onChange={(v) => setStatus(v as PurchaseStatus)}
            options={statuses.map((s) => ({ label: s, value: s }))}
          />
          <FormInput
            type="number"
            step="any"
            min="0"
            placeholder="Amount received"
            value={amountReceived}
            onChange={setAmountReceived}
          />
          <FormButton label="Save purchase" loadingLabel="Saving..." loading={loading} />
        </FormCard>
      ) : null}
      {message ? (
        <ScreenFeedback variant={messageFeedbackVariant(message)}>{message}</ScreenFeedback>
      ) : null}
      <ScreenSectionTitle>Records</ScreenSectionTitle>
      {fetching ? (
        <div className="page-loading">
          <LoadingSpinner size="lg" />
          <span>Loading purchases…</span>
        </div>
      ) : purchases.length === 0 ? (
        <ScreenEmpty>No gold purchases yet.</ScreenEmpty>
      ) : (
        <div className="crud-table-wrap">
          <table className="crud-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Client</th>
                <th scope="col">Contact</th>
                <th scope="col" className="num">
                  Weight (ct)
                </th>
                <th scope="col" className="num">
                  Buy (Le)
                </th>
                <th scope="col" className="num">
                  Received (Le)
                </th>
                <th scope="col">Status</th>
                <th scope="col" className="crud-table__actions">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => {
                const isEditing = editingId === p._id && canUpdate;
                const colCount = 8;
                return (
                  <Fragment key={p._id}>
                    <tr>
                      <td>{formatDateUtc(p.purchaseDate)}</td>
                      <td>{p.clientName}</td>
                      <td>{p.clientContact}</td>
                      <td className="num">{p.weightCarat}</td>
                      <td className="num">{p.buyingPrice.toFixed(2)}</td>
                      <td className="num">{Number(p.amountReceived).toFixed(2)}</td>
                      <td>
                        <StatusPill tone={purchaseStatusTone(p.status)}>{p.status}</StatusPill>
                      </td>
                      <td className="crud-table__actions">
                        <div className="crud-table__actions-inner">
                          <ViewIconButton
                            label={viewingId === p._id ? "Hide details" : "View record details"}
                            onClick={() => setViewingId((id) => (id === p._id ? null : p._id))}
                          />
                          {canUpdate ? (
                            <EditIconButton label="Edit purchase" onClick={() => startEdit(p)} disabled={isEditing} />
                          ) : null}
                          {canDelete ? <DeleteIconButton label="Delete purchase" onClick={() => handleDelete(p._id)} /> : null}
                        </div>
                      </td>
                    </tr>
                    {viewingId === p._id ? (
                      <tr className="crud-detail-row">
                        <td colSpan={colCount}>
                          <strong>Created:</strong> {formatDateTimeUtc(p.createdAt)}
                          {p.updatedAt ? (
                            <>
                              {" "}
                              · <strong>Updated:</strong> {formatDateTimeUtc(p.updatedAt)}
                            </>
                          ) : null}
                        </td>
                      </tr>
                    ) : null}
                    {isEditing ? (
                      <tr className="crud-table-row--edit">
                        <td colSpan={colCount}>
                          <form className="list-form-stack" onSubmit={handleSaveEdit}>
                            <div className="form-grid form-grid--2col-sm">
                              <FormInput type="date" label="Purchase date" value={editPurchaseDate} onChange={setEditPurchaseDate} placeholder="" required />
                              <FormInput type="number" step="any" min="0" label="Buying price" value={editBuyingPrice} onChange={setEditBuyingPrice} placeholder="" required />
                              <FormInput type="number" step="any" min="0" label="Weight (ct)" value={editWeightCarat} onChange={setEditWeightCarat} placeholder="" required />
                              <FormInput label="Client name" value={editClientName} onChange={setEditClientName} placeholder="" required />
                              <FormInput label="Contact" value={editClientContact} onChange={setEditClientContact} placeholder="" required />
                              <FormSelect
                                fieldLabel="Status"
                                value={editStatus}
                                onChange={(v) => setEditStatus(v as PurchaseStatus)}
                                options={statuses.map((s) => ({ label: s, value: s }))}
                              />
                              <FormInput type="number" step="any" min="0" label="Amount received" value={editAmountReceived} onChange={setEditAmountReceived} placeholder="" />
                            </div>
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
