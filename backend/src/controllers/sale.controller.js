const mongoose = require("mongoose");
const Sale = require("../model/sale.model");
const { applyVaultDelta } = require("../services/vault.service");

async function listSales(_req, res, next) {
  try {
    const data = await Sale.find({}).sort({ saleDate: -1, createdAt: -1 });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function createSale(req, res, next) {
  try {
    const amountReceived = Number(req.body.amountReceived) || 0;
    const buyerName = (req.body.buyerName || "Buyer").trim();
    const id = new mongoose.Types.ObjectId();

    if (amountReceived !== 0) {
      await applyVaultDelta(amountReceived, {
        kind: "sale_proceeds",
        label: `Gold sale proceeds — ${buyerName}`,
        refType: "sale",
        refId: id,
      });
    }

    const sale = await Sale.create({ ...req.body, _id: id });
    res.status(201).json(sale);
  } catch (error) {
    next(error);
  }
}

async function updateSale(req, res, next) {
  try {
    const existing = await Sale.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Sale not found" });
    }

    const nextReceived =
      req.body.amountReceived !== undefined ? Number(req.body.amountReceived) : Number(existing.amountReceived) || 0;
    const prevReceived = Number(existing.amountReceived) || 0;
    const delta = nextReceived - prevReceived;

    if (delta !== 0) {
      await applyVaultDelta(
        delta,
        {
          kind: "sale_proceeds_adjust",
          refType: "sale",
          refId: existing._id,
          label: "Sale amount received adjusted",
        },
        { allowNegative: delta < 0 }
      );
    }

    const updated = await Sale.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
}

async function deleteSale(req, res, next) {
  try {
    const sale = await Sale.findByIdAndDelete(req.params.id);
    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    const received = Number(sale.amountReceived) || 0;
    if (received !== 0) {
      await applyVaultDelta(
        -received,
        {
          kind: "sale_proceeds_reversal",
          label: "Gold sale removed — proceeds reversed from vault",
          refType: "sale",
          refId: sale._id,
        },
        { allowNegative: true }
      );
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = { listSales, createSale, updateSale, deleteSale };
