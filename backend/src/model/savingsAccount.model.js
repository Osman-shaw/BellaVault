const mongoose = require("mongoose");

// Human-friendly unique depositor account number like "SV-20260421-0001".
// Enough context (date + tenant scoped sequence) to be readable on a receipt.
function generateAccountNumber() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const suffix = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `SV-${y}${m}${d}-${suffix}`;
}

const savingsAccountSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    accountNumber: { type: String, required: true, trim: true, uppercase: true },
    depositorName: { type: String, required: true, trim: true },
    depositorContact: { type: String, required: true, trim: true },
    depositorAddress: { type: String, required: true, trim: true },
    openedAt: { type: Date, required: true },
    balance: { type: Number, default: 0, min: 0 },
    totalDeposited: { type: Number, default: 0, min: 0 },
    totalWithdrawn: { type: Number, default: 0, min: 0 },
    lastActivityAt: { type: Date, required: true },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

savingsAccountSchema.index({ tenantId: 1, accountNumber: 1 }, { unique: true });
savingsAccountSchema.index({ tenantId: 1, depositorName: 1 });

savingsAccountSchema.virtual("status").get(function () {
  return this.closedAt ? "closed" : "active";
});

savingsAccountSchema.set("toJSON", { virtuals: true });
savingsAccountSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("SavingsAccount", savingsAccountSchema);
module.exports.generateAccountNumber = generateAccountNumber;
