const mongoose = require("mongoose");

const phoneOtpSchema = new mongoose.Schema(
  {
    phoneNormalized: { type: String, required: true },
    purpose: { type: String, enum: ["register", "login"], required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    pendingFullName: { type: String, default: null },
    pendingRole: { type: String, default: null },
  },
  { timestamps: true }
);

phoneOtpSchema.index({ phoneNormalized: 1, purpose: 1 }, { unique: true });

module.exports = mongoose.model("PhoneOtp", phoneOtpSchema);
