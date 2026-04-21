const mongoose = require("mongoose");

const savingsTransactionSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SavingsAccount",
      required: true,
      index: true,
    },
    accountNumber: { type: String, required: true, trim: true, uppercase: true },
    kind: { type: String, required: true, enum: ["opening", "deposit", "withdrawal"] },
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: (v) => typeof v === "number" && v > 0,
        message: "Amount must be greater than 0",
      },
    },
    balanceAfter: { type: Number, required: true, min: 0 },
    occurredAt: { type: Date, required: true },
    note: { type: String, trim: true, maxlength: 200, default: "" },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

savingsTransactionSchema.index({ tenantId: 1, accountId: 1, occurredAt: -1 });

module.exports = mongoose.model("SavingsTransaction", savingsTransactionSchema);
