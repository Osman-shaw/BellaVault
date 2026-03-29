const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema(
  {
    purchaseDate: { type: Date, required: true },
    buyingPrice: { type: Number, required: true, min: 0 },
    weightCarat: { type: Number, required: true, min: 0 },
    clientName: { type: String, required: true, trim: true },
    clientContact: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
    amountReceived: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Purchase", purchaseSchema);
