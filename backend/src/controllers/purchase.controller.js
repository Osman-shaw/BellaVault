const mongoose = require("mongoose");
const Purchase = require("../model/purchase.model");
const { applyVaultDelta } = require("../services/vault.service");

async function listPurchases(req, res, next) {
  try {
    const data = await Purchase.find({ tenantId: req.tenantId }).sort({ purchaseDate: -1, createdAt: -1 });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function createPurchase(req, res, next) {
  try {
    const buyingPrice = Number(req.body.buyingPrice) || 0;
    const clientName = (req.body.clientName || "Client").trim();
    const id = new mongoose.Types.ObjectId();

    await applyVaultDelta(req.tenantId, -buyingPrice, {
      kind: "purchase_buy",
      label: `Gold purchase — ${clientName}`,
      refType: "purchase",
      refId: id,
    });

    const purchase = await Purchase.create({ ...req.body, _id: id, tenantId: req.tenantId });
    res.status(201).json(purchase);
  } catch (error) {
    next(error);
  }
}

async function updatePurchase(req, res, next) {
  try {
    const existing = await Purchase.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!existing) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    const nextBuying = req.body.buyingPrice !== undefined ? Number(req.body.buyingPrice) : existing.buyingPrice;
    const delta = Number(existing.buyingPrice) - Number(nextBuying);

    if (delta !== 0) {
      await applyVaultDelta(req.tenantId, delta, {
        kind: "purchase_buy_adjust",
        label: `Purchase buying price adjusted`,
        refType: "purchase",
        refId: existing._id,
      });
    }

    const updated = await Purchase.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, req.body, {
      new: true,
      runValidators: true,
    });
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
}

async function deletePurchase(req, res, next) {
  try {
    const purchase = await Purchase.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    const buyingPrice = Number(purchase.buyingPrice) || 0;
    if (buyingPrice !== 0) {
      await applyVaultDelta(req.tenantId, buyingPrice, {
        kind: "purchase_buy_reversal",
        label: "Gold purchase removed — cash restored to vault",
        refType: "purchase",
        refId: purchase._id,
      });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = { listPurchases, createPurchase, updatePurchase, deletePurchase };
