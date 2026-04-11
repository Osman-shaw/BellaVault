const Entity = require("../model/entity.model");
const PartnerLedger = require("../model/partnerLedger.model");

function enrichRows(rows) {
  let cumulativeInvested = 0;
  let cumulativeReceived = 0;
  return rows.map((row) => {
    const moneyInvested = Number(row.moneyInvested) || 0;
    const moneyReceived = Number(row.moneyReceived) || 0;
    cumulativeInvested += moneyInvested;
    cumulativeReceived += moneyReceived;
    return {
      _id: row._id.toString(),
      entityId: row.entityId.toString(),
      recordedAt: row.recordedAt.toISOString(),
      moneyInvested,
      moneyReceived,
      cumulativeInvested,
      cumulativeReceived,
      totalCapital: cumulativeInvested + cumulativeReceived,
      remainingBalance: cumulativeInvested - cumulativeReceived,
    };
  });
}

async function listPartnerLedger(req, res, next) {
  try {
    const { entityId } = req.params;
    const entity = await Entity.findOne({ _id: entityId, tenantId: req.tenantId });
    if (!entity) {
      return res.status(404).json({ message: "Partner not found" });
    }
    const rows = await PartnerLedger.find({ entityId, tenantId: req.tenantId })
      .sort({ recordedAt: 1, _id: 1 })
      .lean();
    res.json(enrichRows(rows));
  } catch (error) {
    next(error);
  }
}

async function createPartnerLedgerEntry(req, res, next) {
  try {
    const { entityId } = req.params;
    const entity = await Entity.findOne({ _id: entityId, tenantId: req.tenantId });
    if (!entity) {
      return res.status(404).json({ message: "Partner not found" });
    }
    const entry = await PartnerLedger.create({
      tenantId: req.tenantId,
      entityId,
      recordedAt: req.body.recordedAt,
      moneyInvested: req.body.moneyInvested ?? 0,
      moneyReceived: req.body.moneyReceived ?? 0,
    });
    res.status(201).json({
      _id: entry._id.toString(),
      entityId: entry.entityId.toString(),
      recordedAt: entry.recordedAt.toISOString(),
      moneyInvested: entry.moneyInvested,
      moneyReceived: entry.moneyReceived,
    });
  } catch (error) {
    next(error);
  }
}

async function deletePartnerLedgerEntry(req, res, next) {
  try {
    const { entityId, entryId } = req.params;
    const entity = await Entity.findOne({ _id: entityId, tenantId: req.tenantId });
    if (!entity) {
      return res.status(404).json({ message: "Partner not found" });
    }
    const deleted = await PartnerLedger.findOneAndDelete({ _id: entryId, entityId, tenantId: req.tenantId });
    if (!deleted) {
      return res.status(404).json({ message: "Ledger entry not found" });
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = { listPartnerLedger, createPartnerLedgerEntry, deletePartnerLedgerEntry };
