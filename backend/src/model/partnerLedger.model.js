const mongoose = require("mongoose");

const partnerLedgerSchema = new mongoose.Schema(
  {
    entityId: { type: mongoose.Schema.Types.ObjectId, ref: "Entity", required: true, index: true },
    recordedAt: { type: Date, required: true },
    moneyInvested: { type: Number, required: true, min: 0, default: 0 },
    moneyReceived: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true }
);

partnerLedgerSchema.index({ entityId: 1, recordedAt: 1, _id: 1 });

module.exports = mongoose.model("PartnerLedger", partnerLedgerSchema);
