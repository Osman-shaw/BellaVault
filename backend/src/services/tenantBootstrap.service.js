const mongoose = require("mongoose");
const Tenant = require("../model/tenant.model");
const User = require("../model/user.model");
const Entity = require("../model/entity.model");
const Deal = require("../model/deal.model");
const Purchase = require("../model/purchase.model");
const Sale = require("../model/sale.model");
const Borrow = require("../model/borrow.model");
const VaultBalance = require("../model/vaultBalance.model");
const VaultMovement = require("../model/vaultMovement.model");
const PartnerLedger = require("../model/partnerLedger.model");

let defaultTenantDoc = null;

function fallbackTenantObjectId() {
  const hex = process.env.DEFAULT_TENANT_ID;
  if (hex && mongoose.Types.ObjectId.isValid(hex)) {
    return new mongoose.Types.ObjectId(hex);
  }
  return new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");
}

/**
 * Ensures a default tenant exists and assigns tenantId to legacy documents missing it.
 * Call once after MongoDB connects.
 */
async function ensureDefaultTenantAndBackfill() {
  defaultTenantDoc = await Tenant.findOneAndUpdate(
    { slug: "default" },
    { $setOnInsert: { name: "Default organization", slug: "default" } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const tid = defaultTenantDoc._id;
  const set = { $set: { tenantId: tid } };

  await Promise.all([
    User.updateMany({ tenantId: { $exists: false } }, set),
    Entity.updateMany({ tenantId: { $exists: false } }, set),
    Deal.updateMany({ tenantId: { $exists: false } }, set),
    Purchase.updateMany({ tenantId: { $exists: false } }, set),
    Sale.updateMany({ tenantId: { $exists: false } }, set),
    Borrow.updateMany({ tenantId: { $exists: false } }, set),
    VaultBalance.updateMany({ tenantId: { $exists: false } }, set),
    VaultMovement.updateMany({ tenantId: { $exists: false } }, set),
    PartnerLedger.updateMany({ tenantId: { $exists: false } }, set),
  ]);

  return defaultTenantDoc;
}

function getDefaultTenant() {
  if (!defaultTenantDoc) {
    throw new Error("Default tenant not initialized. Run ensureDefaultTenantAndBackfill after connect.");
  }
  return defaultTenantDoc;
}

function getDefaultTenantOrFallback() {
  if (defaultTenantDoc) return defaultTenantDoc;
  return { _id: fallbackTenantObjectId(), slug: "default", name: "Default organization" };
}

async function findTenantBySlug(slug) {
  let normalized = String(slug ?? "default")
    .trim()
    .toLowerCase();
  if (normalized.length < 2) normalized = "default";
  return Tenant.findOne({ slug: normalized }).lean();
}

module.exports = {
  ensureDefaultTenantAndBackfill,
  getDefaultTenant,
  getDefaultTenantOrFallback,
  findTenantBySlug,
  fallbackTenantObjectId,
};
