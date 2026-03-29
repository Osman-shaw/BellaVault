const express = require("express");
const {
  listPurchases,
  createPurchase,
  updatePurchase,
  deletePurchase,
} = require("../controllers/purchase.controller");
const { validate } = require("../middleware/validate");
const {
  createPurchaseSchema,
  updatePurchaseSchema,
  idParamSchema,
} = require("../config/validation");
const { requirePermission } = require("../middleware/authorize");
const { requireAuth } = require("../middleware/authenticate");

const router = express.Router();

router.get("/", requirePermission("purchases:read"), listPurchases);
router.post(
  "/",
  requireAuth,
  requirePermission("purchases:create"),
  validate(createPurchaseSchema),
  createPurchase
);
router.put(
  "/:id",
  requireAuth,
  requirePermission("purchases:update"),
  validate(updatePurchaseSchema),
  updatePurchase
);
router.delete(
  "/:id",
  requireAuth,
  requirePermission("purchases:delete"),
  validate(idParamSchema),
  deletePurchase
);

module.exports = router;
