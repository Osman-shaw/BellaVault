"use client";

import { FormEvent, Fragment, useEffect, useState } from "react";
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
import { notifyError } from "@/utils/notify";
import { actionFeedback } from "@/utils/actionFeedback";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { DeleteIconButton, EditIconButton, ViewIconButton } from "@/components/ui/CrudIconButtons";
import { formatDateTimeUtc } from "@/utils/formatDisplay";

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
  const canUpdate = can(role, "deals:update");
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
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [editPaidAmount, setEditPaidAmount] = useState("");
  const [editDealNotes, setEditDealNotes] = useState("");
  const [dealEditLoading, setDealEditLoading] = useState(false);

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
      actionFeedback.dealCreated();
      await loadData();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to create deal.";
      setMessage(text);
      notifyError(text);
    } finally {
      setLoading(false);
    }
  }

  function startEditDeal(deal: Deal) {
    setEditingDealId(deal._id);
    setEditPaidAmount(String(deal.paidAmount));
    setEditDealNotes(deal.notes ?? "");
    setViewingId(null);
  }

  function cancelDealEdit() {
    setEditingDealId(null);
  }

  async function handleSaveDealEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingDealId) return;
    const paid = Number(editPaidAmount);
    if (!Number.isFinite(paid) || paid < 0) {
      setMessage("Paid amount cannot be negative.");
      return;
    }
    try {
      setDealEditLoading(true);
      await apiService.updateDeal(editingDealId, {
        paidAmount: paid,
        notes: editDealNotes.trim() || undefined,
      });
      setEditingDealId(null);
      setMessage("Deal updated.");
      actionFeedback.dealUpdated();
      await loadData();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to update deal.";
      setMessage(text);
      notifyError(text);
    } finally {
      setDealEditLoading(false);
    }
  }

  async function handleDeleteDeal(id: string) {
    if (!window.confirm("Delete this deal permanently?")) return;
    try {
      await apiService.deleteDeal(id);
      await loadData();
      actionFeedback.dealDeleted();
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
      {fetching ? (
        <div className="page-loading">
          <LoadingSpinner size="lg" />
          <span>Loading deals…</span>
        </div>
      ) : deals.length === 0 ? (
        <ScreenEmpty>No deals yet.</ScreenEmpty>
      ) : (
        <div className="crud-table-wrap">
          <table className="crud-table">
            <thead>
              <tr>
                <th scope="col">Partner</th>
                <th scope="col">Commodity</th>
                <th scope="col" className="num">
                  Qty
                </th>
                <th scope="col" className="num">
                  Spot (Le)
                </th>
                <th scope="col" className="num">
                  Value (Le)
                </th>
                <th scope="col" className="num">
                  Paid (Le)
                </th>
                <th scope="col">Status</th>
                <th scope="col" className="crud-table__actions">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => {
                const partnerName = entities.find((e) => e._id === deal.entityId)?.name ?? "Partner";
                const isEditing = editingDealId === deal._id && canUpdate;
                const colCount = 8;
                return (
                  <Fragment key={deal._id}>
                    <tr>
                      <td>{partnerName}</td>
                      <td>{deal.commodity}</td>
                      <td className="num">{deal.quantity}</td>
                      <td className="num">{deal.spotPrice.toFixed(2)}</td>
                      <td className="num">{deal.totalValue.toFixed(2)}</td>
                      <td className="num">{deal.paidAmount.toFixed(2)}</td>
                      <td>
                        <StatusPill tone={dealStatusTone(deal.status)}>{deal.status}</StatusPill>
                      </td>
                      <td className="crud-table__actions">
                        <div className="crud-table__actions-inner">
                          <ViewIconButton
                            label={viewingId === deal._id ? "Hide details" : "View details"}
                            onClick={() => setViewingId((id) => (id === deal._id ? null : deal._id))}
                          />
                          {canUpdate ? (
                            <EditIconButton label="Update deal" onClick={() => startEditDeal(deal)} disabled={isEditing} />
                          ) : null}
                          {canDelete ? <DeleteIconButton label="Delete deal" onClick={() => handleDeleteDeal(deal._id)} /> : null}
                        </div>
                      </td>
                    </tr>
                    {viewingId === deal._id ? (
                      <tr className="crud-detail-row">
                        <td colSpan={colCount}>
                          <strong>Recorded:</strong> {formatDateTimeUtc(deal.createdAt)}
                          {deal.notes ? (
                            <>
                              {" "}
                              · <strong>Notes:</strong> {deal.notes}
                            </>
                          ) : (
                            <> · No notes on this deal.</>
                          )}
                        </td>
                      </tr>
                    ) : null}
                    {isEditing ? (
                      <tr className="crud-table-row--edit">
                        <td colSpan={colCount}>
                          <form className="list-form-stack" onSubmit={handleSaveDealEdit}>
                            <div className="form-grid form-grid--2col-sm">
                              <FormInput
                                label="Paid amount (Le)"
                                type="number"
                                step="any"
                                min="0"
                                value={editPaidAmount}
                                onChange={setEditPaidAmount}
                                placeholder="0"
                                required
                              />
                              <FormTextarea label="Notes" rows={2} value={editDealNotes} onChange={setEditDealNotes} placeholder="Optional" />
                            </div>
                            <div className="list-form-actions">
                              <FormButton label="Save changes" loadingLabel="Saving…" loading={dealEditLoading} />
                              <button type="button" className="btn-ghost" onClick={cancelDealEdit}>
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
