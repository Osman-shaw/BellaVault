const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 2,
      maxlength: 64,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tenant", tenantSchema);
