const mongoose = require("mongoose");

const borrowSchema = new mongoose.Schema(
  {
    borrowerName: { type: String, required: true, trim: true },
    borrowerContact: { type: String, required: true, trim: true },
    borrowedAt: { type: Date, required: true },
    principalAmount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: (v) => typeof v === "number" && v > 0,
        message: "Principal must be greater than 0",
      },
    },
    amountPaid: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

borrowSchema.virtual("remainingBalance").get(function () {
  const p = Number(this.principalAmount) || 0;
  const paid = Number(this.amountPaid) || 0;
  return Math.max(0, Math.round((p - paid) * 100) / 100);
});

borrowSchema.virtual("status").get(function () {
  const p = Number(this.principalAmount) || 0;
  const paid = Number(this.amountPaid) || 0;
  return paid >= p ? "paid" : "pending";
});

borrowSchema.set("toJSON", { virtuals: true });
borrowSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Borrow", borrowSchema);
