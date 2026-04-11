const mongoose = require("mongoose");

const vaultMovementSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    delta: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    kind: {
      type: String,
      required: true,
      enum: [
        "purchase_buy",
        "purchase_buy_reversal",
        "purchase_buy_adjust",
        "sale_proceeds",
        "sale_proceeds_reversal",
        "sale_proceeds_adjust",
        "deposit",
      ],
    },
    label: { type: String, required: true, trim: true, maxlength: 200 },
    refType: { type: String, enum: ["purchase", "sale"], default: undefined },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true }
);

vaultMovementSchema.index({ tenantId: 1, createdAt: -1 });

module.exports = mongoose.model("VaultMovement", vaultMovementSchema);
