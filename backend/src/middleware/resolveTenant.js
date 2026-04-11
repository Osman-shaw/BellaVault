const mongoose = require("mongoose");
const User = require("../model/user.model");
const { getDefaultTenant, getDefaultTenantOrFallback } = require("../services/tenantBootstrap.service");

/**
 * Sets req.tenantId (ObjectId) for all /api routes after optionalAuth.
 * - Authenticated JWT with `tid` uses that tenant.
 * - Authenticated legacy JWT (no tid): loads user's tenantId from DB when connected.
 * - Anonymous (guest) reads: default tenant only (no cross-tenant header trust).
 */
async function resolveTenant(req, res, next) {
  try {
    if (req.user?.tenantId && mongoose.Types.ObjectId.isValid(String(req.user.tenantId))) {
      req.tenantId = new mongoose.Types.ObjectId(String(req.user.tenantId));
      return next();
    }

    if (req.user?.id && mongoose.connection.readyState === 1) {
      const u = await User.findById(req.user.id).select("tenantId").lean();
      if (u?.tenantId) {
        req.tenantId = u.tenantId;
        return next();
      }
    }

    if (mongoose.connection.readyState === 1) {
      try {
        req.tenantId = getDefaultTenant()._id;
      } catch {
        req.tenantId = getDefaultTenantOrFallback()._id;
      }
    } else {
      req.tenantId = getDefaultTenantOrFallback()._id;
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { resolveTenant };
