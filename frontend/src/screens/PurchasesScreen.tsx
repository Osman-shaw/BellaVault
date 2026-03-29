"use client";

import { FormEvent, useEffect, useState } from "react";
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
import { formatDateUtc } from "@/utils/formatDisplay";
import { messageFeedbackVariant } from "@/utils/messageFeedbackVariant";
import { notifyError, notifySuccess } from "@/utils/notify";

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
      notifySuccess("Purchase recorded.");
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
      notifySuccess("Purchase updated.");
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
    try {
      await apiService.deletePurchase(id);
      await loadPurchases();
      notifySuccess("Purchase deleted.");
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
          : purchases.map((p) =>
              editingId === p._id && canUpdate ? (
                <article key={p._id} className="list-card list-card--edit">
                  <form className="list-form-stack" onSubmit={handleSaveEdit}>
                    <FormInput type="date" placeholder="Purchase date" value={editPurchaseDate} onChange={setEditPurchaseDate} required />
                    <FormInput type="number" step="any" min="0" placeholder="Buying price" value={editBuyingPrice} onChange={setEditBuyingPrice} required />
                    <FormInput type="number" step="any" min="0" placeholder="Weight (carat)" value={editWeightCarat} onChange={setEditWeightCarat} required />
                    <FormInput placeholder="Client name" value={editClientName} onChange={setEditClientName} required />
                    <FormInput placeholder="Contact" value={editClientContact} onChange={setEditClientContact} required />
                    <FormSelect
                      value={editStatus}
                      onChange={(v) => setEditStatus(v as PurchaseStatus)}
                      options={statuses.map((s) => ({ label: s, value: s }))}
                    />
                    <FormInput type="number" step="any" min="0" placeholder="Amount received" value={editAmountReceived} onChange={setEditAmountReceived} />
                    <div className="list-form-actions">
                      <FormButton label="Save" loadingLabel="Saving..." loading={editLoading} />
                      <button type="button" className="btn-ghost" onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </article>
              ) : (
                <article key={p._id} className="list-card">
                  <div className="list-card__main">
                    <div className="list-card__title">
                      {p.clientName} · {p.clientContact}
                    </div>
                    <div className="list-card__meta">
                      {formatDateUtc(p.purchaseDate)} · {p.weightCarat} ct · buy Le {p.buyingPrice.toFixed(2)} · received Le{" "}
                      {Number(p.amountReceived).toFixed(2)}
                    </div>
                    <StatusPill tone={purchaseStatusTone(p.status)}>{p.status}</StatusPill>
                  </div>
                  <div className="list-card__actions">
                    {canUpdate ? (
                      <button type="button" className="btn-ghost" onClick={() => startEdit(p)}>
                        Edit
                      </button>
                    ) : null}
                    {canDelete ? (
                      <button type="button" className="danger-button" onClick={() => handleDelete(p._id)}>
                        Delete
                      </button>
                    ) : null}
                  </div>
                </article>
              )
            )}
        {!fetching && purchases.length === 0 ? <ScreenEmpty>No gold purchases yet.</ScreenEmpty> : null}
      </div>
    </AppScreen>
  );
}
