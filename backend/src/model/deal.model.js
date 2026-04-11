const mongoose = require("mongoose");

const dealSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, ref: "Entity", required: true },
    commodity: {
      type: String,
      enum: ["GOLD", "SILVER", "PLATINUM", "DIAMOND"],
      required: true,
    },
    quantity: { type: Number, required: true, min: 0 },
    spotPrice: { type: Number, required: true, min: 0 },
    totalValue: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["OWED", "PARTIAL", "SETTLED"],
      default: "OWED",
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Deal", dealSchema);
