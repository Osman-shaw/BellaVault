const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    saleDate: { type: Date, required: true },
    buyerName: { type: String, required: true, trim: true },
    buyerContact: { type: String, required: true, trim: true },
    weight: { type: Number, required: true, min: 0 },
    weightUnit: {
      type: String,
      enum: ["gram", "carat"],
      required: true,
    },
    sellingPrice: { type: Number, required: true, min: 0 },
    amountReceived: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Sale", saleSchema);
