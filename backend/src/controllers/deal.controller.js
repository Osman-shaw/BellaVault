const Deal = require("../model/deal.model");
const { computeDealStatus, getDashboardSummary } = require("../services/deal.service");

async function listDeals(_req, res, next) {
  try {
    const data = await Deal.find({}).sort({ createdAt: -1 });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function createDeal(req, res, next) {
  try {
    const payload = req.body;
    const totalValue = payload.quantity * payload.spotPrice;
    const status = computeDealStatus(totalValue, payload.paidAmount || 0);

    const deal = await Deal.create({
      ...payload,
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
    const existingDeal = await Deal.findById(req.params.id);
    if (!existingDeal) {
      return res.status(404).json({ message: "Deal not found" });
    }

    const nextQuantity = req.body.quantity ?? existingDeal.quantity;
    const nextSpotPrice = req.body.spotPrice ?? existingDeal.spotPrice;
    const nextPaidAmount = req.body.paidAmount ?? existingDeal.paidAmount;
    const totalValue = nextQuantity * nextSpotPrice;
    const status = computeDealStatus(totalValue, nextPaidAmount);

    const updatedDeal = await Deal.findByIdAndUpdate(
      req.params.id,
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
    const deal = await Deal.findByIdAndDelete(req.params.id);
    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function dashboard(_req, res, next) {
  try {
    const summary = await getDashboardSummary();
    res.json(summary);
  } catch (error) {
    next(error);
  }
}

module.exports = { listDeals, createDeal, updateDeal, deleteDeal, dashboard };
