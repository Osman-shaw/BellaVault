"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiService, Sale, SaleWeightUnit } from "@/services/apiService";
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
} from "@/components/layout/AppScreen";
import { can } from "@/state/rbac";
import { useRole } from "@/state/useRole";
import { formatDateUtc } from "@/utils/formatDisplay";
import { messageFeedbackVariant } from "@/utils/messageFeedbackVariant";
import { notifyError, notifySuccess } from "@/utils/notify";

const weightUnits: { label: string; value: SaleWeightUnit }[] = [
  { label: "Grams", value: "gram" },
  { label: "Carats", value: "carat" },
];

function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function unitLabel(u: SaleWeightUnit) {
  return u === "gram" ? "g" : "ct";
}

export function SalesScreen() {
  const { role } = useRole();
  const canRead = can(role, "sales:read");
  const canCreate = can(role, "sales:create");
  const canUpdate = can(role, "sales:update");
  const canDelete = can(role, "sales:delete");

  const [sales, setSales] = useState<Sale[]>([]);
  const [saleDate, setSaleDate] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerContact, setBuyerContact] = useState("");
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<SaleWeightUnit>("gram");
  const [sellingPrice, setSellingPrice] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSaleDate, setEditSaleDate] = useState("");
  const [editBuyerName, setEditBuyerName] = useState("");
  const [editBuyerContact, setEditBuyerContact] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editWeightUnit, setEditWeightUnit] = useState<SaleWeightUnit>("gram");
  const [editSellingPrice, setEditSellingPrice] = useState("");
  const [editAmountReceived, setEditAmountReceived] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  async function loadSales() {
    try {
      setFetching(true);
      const data = await apiService.getSales();
      setSales(data);
    } catch {
      setMessage("Failed to load sales.");
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (!canRead) return;
    loadSales();
  }, [canRead]);

  function startEdit(s: Sale) {
    setEditingId(s._id);
    setEditSaleDate(toDateInputValue(s.saleDate));
    setEditBuyerName(s.buyerName);
    setEditBuyerContact(s.buyerContact);
    setEditWeight(String(s.weight));
    setEditWeightUnit(s.weightUnit);
    setEditSellingPrice(String(s.sellingPrice));
    setEditAmountReceived(String(s.amountReceived ?? 0));
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    const w = Number(weight);
    const price = Number(sellingPrice);
    const received = amountReceived === "" ? 0 : Number(amountReceived);

    if (!saleDate) {
      setMessage("Sale date is required.");
      return;
    }
    if (!Number.isFinite(w) || w <= 0) {
      setMessage("Weight must be greater than 0.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setMessage("Selling price must be a valid non-negative number.");
      return;
    }
    if (buyerName.trim().length < 2) {
      setMessage("Exporter / buyer name must be at least 2 characters.");
      return;
    }
    if (buyerContact.trim().length < 3) {
      setMessage("Contact is required.");
      return;
    }
    if (!Number.isFinite(received) || received < 0) {
      setMessage("Amount received cannot be negative.");
      return;
    }

    try {
      setLoading(true);
      await apiService.createSale({
        saleDate: new Date(saleDate).toISOString(),
        buyerName: buyerName.trim(),
        buyerContact: buyerContact.trim(),
        weight: w,
        weightUnit,
        sellingPrice: price,
        amountReceived: received,
      });
      setSaleDate("");
      setBuyerName("");
      setBuyerContact("");
      setWeight("");
      setWeightUnit("gram");
      setSellingPrice("");
      setAmountReceived("");
      setMessage("Sale recorded.");
      notifySuccess("Sale recorded.");
      await loadSales();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to create sale.";
      setMessage(text);
      notifyError(text);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingId) return;

    const w = Number(editWeight);
    const price = Number(editSellingPrice);
    const received = editAmountReceived === "" ? 0 : Number(editAmountReceived);

    if (!editSaleDate) {
      setMessage("Sale date is required.");
      return;
    }
    if (!Number.isFinite(w) || w <= 0) {
      setMessage("Weight must be greater than 0.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setMessage("Selling price must be valid.");
      return;
    }
    if (editBuyerName.trim().length < 2 || editBuyerContact.trim().length < 3) {
      setMessage("Check buyer name and contact.");
      return;
    }
    if (!Number.isFinite(received) || received < 0) {
      setMessage("Amount received cannot be negative.");
      return;
    }

    try {
      setEditLoading(true);
      await apiService.updateSale(editingId, {
        saleDate: new Date(editSaleDate).toISOString(),
        buyerName: editBuyerName.trim(),
        buyerContact: editBuyerContact.trim(),
        weight: w,
        weightUnit: editWeightUnit,
        sellingPrice: price,
        amountReceived: received,
      });
      setEditingId(null);
      setMessage("Sale updated.");
      notifySuccess("Sale updated.");
      await loadSales();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to update sale.";
      setMessage(text);
      notifyError(text);
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiService.deleteSale(id);
      await loadSales();
      notifySuccess("Sale deleted.");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to delete sale.";
      setMessage(text);
      notifyError(text);
    }
  }

  if (!canRead) {
    return <AccessDenied message="You are not allowed to view sales." />;
  }

  return (
    <AppScreen
      title="Sales"
      description="Record exporter or buyer, weight, selling price, and amount received for each sale."
    >
      {!canCreate ? <ReadOnlyBanner /> : null}
      {canCreate ? (
        <FormCard variant="screen" title="Record sale" onSubmit={handleCreate}>
          <FormInput type="date" placeholder="Sale date" value={saleDate} onChange={setSaleDate} required />
          <FormInput placeholder="Exporter / buyer" value={buyerName} onChange={setBuyerName} required />
          <FormInput placeholder="Contact" value={buyerContact} onChange={setBuyerContact} required />
          <FormInput type="number" step="any" min="0" placeholder="Weight" value={weight} onChange={setWeight} required />
          <FormSelect
            value={weightUnit}
            onChange={(v) => setWeightUnit(v as SaleWeightUnit)}
            options={weightUnits.map((o) => ({ label: o.label, value: o.value }))}
          />
          <FormInput
            type="number"
            step="any"
            min="0"
            placeholder="Selling price"
            value={sellingPrice}
            onChange={setSellingPrice}
            required
          />
          <FormInput
            type="number"
            step="any"
            min="0"
            placeholder="Amount received"
            value={amountReceived}
            onChange={setAmountReceived}
          />
          <FormButton label="Save sale" loadingLabel="Saving..." loading={loading} />
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
          : sales.map((s) =>
              editingId === s._id && canUpdate ? (
                <article key={s._id} className="list-card list-card--edit">
                  <form className="list-form-stack" onSubmit={handleSaveEdit}>
                    <FormInput type="date" placeholder="Sale date" value={editSaleDate} onChange={setEditSaleDate} required />
                    <FormInput placeholder="Exporter / buyer" value={editBuyerName} onChange={setEditBuyerName} required />
                    <FormInput placeholder="Contact" value={editBuyerContact} onChange={setEditBuyerContact} required />
                    <FormInput type="number" step="any" min="0" placeholder="Weight" value={editWeight} onChange={setEditWeight} required />
                    <FormSelect
                      value={editWeightUnit}
                      onChange={(v) => setEditWeightUnit(v as SaleWeightUnit)}
                      options={weightUnits.map((o) => ({ label: o.label, value: o.value }))}
                    />
                    <FormInput
                      type="number"
                      step="any"
                      min="0"
                      placeholder="Selling price"
                      value={editSellingPrice}
                      onChange={setEditSellingPrice}
                      required
                    />
                    <FormInput
                      type="number"
                      step="any"
                      min="0"
                      placeholder="Amount received"
                      value={editAmountReceived}
                      onChange={setEditAmountReceived}
                    />
                    <div className="list-form-actions">
                      <FormButton label="Save" loadingLabel="Saving..." loading={editLoading} />
                      <button type="button" className="btn-ghost" onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </article>
              ) : (
                <article key={s._id} className="list-card">
                  <div className="list-card__main">
                    <div className="list-card__title">
                      {s.buyerName} · {s.buyerContact}
                    </div>
                    <div className="list-card__meta">
                      {formatDateUtc(s.saleDate)} · {s.weight}
                      {unitLabel(s.weightUnit)} · sell Le {s.sellingPrice.toFixed(2)} · received Le{" "}
                      {Number(s.amountReceived).toFixed(2)}
                    </div>
                  </div>
                  <div className="list-card__actions">
                    {canUpdate ? (
                      <button type="button" className="btn-ghost" onClick={() => startEdit(s)}>
                        Edit
                      </button>
                    ) : null}
                    {canDelete ? (
                      <button type="button" className="danger-button" onClick={() => handleDelete(s._id)}>
                        Delete
                      </button>
                    ) : null}
                  </div>
                </article>
              )
            )}
        {!fetching && sales.length === 0 ? <ScreenEmpty>No sales yet.</ScreenEmpty> : null}
      </div>
    </AppScreen>
  );
}
