const Deal = require("../model/deal.model");
const Entity = require("../model/entity.model");
const { computeDealStatus, getDashboardSummary } = require("../services/deal.service");

async function listDeals(req, res, next) {
  try {
    const data = await Deal.find({ tenantId: req.tenantId }).sort({ createdAt: -1 });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function createDeal(req, res, next) {
  try {
    const payload = req.body;
    const entity = await Entity.findOne({ _id: payload.entityId, tenantId: req.tenantId });
    if (!entity) {
      return res.status(400).json({ message: "Partner not found in this organization." });
    }

    const totalValue = payload.quantity * payload.spotPrice;
    const status = computeDealStatus(totalValue, payload.paidAmount || 0);

    const deal = await Deal.create({
      ...payload,
      tenantId: req.tenantId,
      totalValue,
      status,
    });

    res.status(201).json(deal);
  } catch (error) {
    next(error);
  }
}

async function updateDeal(req, res, next) {
  try {
    const existingDeal = await Deal.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!existingDeal) {
      return res.status(404).json({ message: "Deal not found" });
    }

    if (req.body.entityId) {
      const entity = await Entity.findOne({ _id: req.body.entityId, tenantId: req.tenantId });
      if (!entity) {
        return res.status(400).json({ message: "Partner not found in this organization." });
      }
    }

    const nextQuantity = req.body.quantity ?? existingDeal.quantity;
    const nextSpotPrice = req.body.spotPrice ?? existingDeal.spotPrice;
    const nextPaidAmount = req.body.paidAmount ?? existingDeal.paidAmount;
    const totalValue = nextQuantity * nextSpotPrice;
    const status = computeDealStatus(totalValue, nextPaidAmount);

    const updatedDeal = await Deal.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      {
        ...req.body,
        totalValue,
        status,
      },
      { new: true, runValidators: true }
    );

    return res.json(updatedDeal);
  } catch (error) {
    return next(error);
  }
}

async function deleteDeal(req, res, next) {
  try {
    const deal = await Deal.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function dashboard(req, res, next) {
  try {
    const summary = await getDashboardSummary(req.tenantId);
    res.json(summary);
  } catch (error) {
    next(error);
  }
}

module.exports = { listDeals, createDeal, updateDeal, deleteDeal, dashboard };
