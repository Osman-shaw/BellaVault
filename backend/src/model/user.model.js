const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "secretary", "associate_director"],
      required: true,
    },
    emailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, default: null },
    emailVerificationExpiresAt: { type: Date, default: null },
    phoneNormalized: { type: String, default: null, sparse: true, trim: true },
    phoneVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.index({ email: 1, tenantId: 1 }, { unique: true });
userSchema.index({ phoneNormalized: 1, tenantId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("User", userSchema);
