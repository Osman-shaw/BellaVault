const mongoose = require("mongoose");

/** Single logical row: operating cash pool for gold buy/sell. */
const vaultBalanceSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    key: { type: String, default: "main", required: true },
    balance: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

vaultBalanceSchema.index({ tenantId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model("VaultBalance", vaultBalanceSchema);
