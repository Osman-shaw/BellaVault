"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiService, Commodity, Deal, Entity } from "@/services/apiService";
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
  StatusPill,
} from "@/components/layout/AppScreen";
import { can } from "@/state/rbac";
import { useRole } from "@/state/useRole";
import { messageFeedbackVariant } from "@/utils/messageFeedbackVariant";
import { notifyError, notifySuccess } from "@/utils/notify";

const commodities: Commodity[] = ["GOLD", "SILVER", "PLATINUM", "DIAMOND"];

function dealStatusTone(status: Deal["status"]): "success" | "info" | "warn" {
  if (status === "SETTLED") return "success";
  if (status === "PARTIAL") return "info";
  return "warn";
}

export function DealsScreen() {
  const { role } = useRole();
  const canRead = can(role, "deals:read");
  const canCreate = can(role, "deals:create");
  const canDelete = can(role, "deals:delete");

  const [deals, setDeals] = useState<Deal[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityId, setEntityId] = useState("");
  const [commodity, setCommodity] = useState<Commodity>("GOLD");
  const [quantity, setQuantity] = useState("");
  const [spotPrice, setSpotPrice] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  async function loadData() {
    try {
      setFetching(true);
      const [dealData, entityData] = await Promise.all([apiService.getDeals(), apiService.getEntities()]);
      setDeals(dealData);
      setEntities(entityData);
      if (!entityId && entityData.length > 0) {
        setEntityId(entityData[0]._id);
      }
    } catch {
      setMessage("Failed to load deals.");
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (!canRead) return;
    loadData();
  }, [canRead]);

  async function handleCreateDeal(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    const parsedQuantity = Number(quantity);
    const parsedSpotPrice = Number(spotPrice);
    const parsedPaidAmount = paidAmount ? Number(paidAmount) : 0;

    if (!entityId) {
      setMessage("Please select a partner.");
      return;
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setMessage("Quantity must be greater than 0.");
      return;
    }
    if (!Number.isFinite(parsedSpotPrice) || parsedSpotPrice <= 0) {
      setMessage("Spot price must be greater than 0.");
      return;
    }
    if (!Number.isFinite(parsedPaidAmount) || parsedPaidAmount < 0) {
      setMessage("Paid amount cannot be negative.");
      return;
    }

    try {
      setLoading(true);
      await apiService.createDeal({
        entityId,
        commodity,
        quantity: parsedQuantity,
        spotPrice: parsedSpotPrice,
        paidAmount: parsedPaidAmount,
        notes: notes.trim() || undefined,
      });
      setQuantity("");
      setSpotPrice("");
      setPaidAmount("");
      setNotes("");
      setMessage("Deal created successfully.");
      notifySuccess("Deal created successfully.");
      await loadData();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to create deal.";
      setMessage(text);
      notifyError(text);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteDeal(id: string) {
    try {
      await apiService.deleteDeal(id);
      await loadData();
      notifySuccess("Deal deleted.");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to delete deal.";
      setMessage(text);
      notifyError(text);
    }
  }

  if (!canRead) {
    return <AccessDenied message="You are not allowed to view deals." />;
  }

  return (
    <AppScreen
      title="Deals"
      description="Partner commodity positions: quantity, spot price, paid amount, and settlement status (owed, partial, settled)."
    >
      {!canCreate ? <ReadOnlyBanner /> : null}
      {canCreate ? (
        <FormCard
          variant="screen"
          title="Create deal"
          description="Link a partner and commodity. Totals and status follow quantity × spot and amount paid."
          onSubmit={handleCreateDeal}
        >
          <FormSelect
            value={entityId}
            onChange={setEntityId}
            required
            options={
              entities.length === 0
                ? [{ label: "No partners available", value: "" }]
                : entities.map((entity) => ({ label: entity.name, value: entity._id }))
            }
          />
          <FormSelect
            value={commodity}
            onChange={(value) => setCommodity(value as Commodity)}
            options={commodities.map((item) => ({ label: item, value: item }))}
          />
          <FormInput
            type="number"
            step="any"
            min="0"
            placeholder="Quantity"
            value={quantity}
            onChange={setQuantity}
            required
          />
          <FormInput
            type="number"
            step="any"
            min="0"
            placeholder="Spot Price"
            value={spotPrice}
            onChange={setSpotPrice}
            required
          />
          <FormInput
            type="number"
            step="any"
            min="0"
            placeholder="Paid Amount (optional)"
            value={paidAmount}
            onChange={setPaidAmount}
          />
          <FormTextarea rows={3} placeholder="Notes (optional)" value={notes} onChange={setNotes} />
          <FormButton label="Create Deal" loadingLabel="Creating..." loading={loading} />
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
          : deals.map((deal) => {
              const partnerName = entities.find((e) => e._id === deal.entityId)?.name ?? "Partner";
              return (
                <article key={deal._id} className="list-card">
                  <div className="list-card__main">
                    <div className="list-card__title">
                      {deal.commodity} · {partnerName}
                    </div>
                    <div className="list-card__meta">
                      Qty {deal.quantity} · Spot Le {deal.spotPrice.toFixed(2)} · Value Le {deal.totalValue.toFixed(2)} · Paid Le{" "}
                      {deal.paidAmount.toFixed(2)}
                    </div>
                    <StatusPill tone={dealStatusTone(deal.status)}>{deal.status}</StatusPill>
                  </div>
                  <div className="list-card__actions">
                    {canDelete ? (
                      <button type="button" className="danger-button" onClick={() => handleDeleteDeal(deal._id)}>
                        Delete
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
        {!fetching && deals.length === 0 ? <ScreenEmpty>No deals yet.</ScreenEmpty> : null}
      </div>
    </AppScreen>
  );
}
