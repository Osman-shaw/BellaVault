const mongoose = require("mongoose");

/** Single logical row: operating cash pool for gold buy/sell. */
const vaultBalanceSchema = new mongoose.Schema(
  {
    key: { type: String, default: "main", unique: true },
    balance: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VaultBalance", vaultBalanceSchema);
