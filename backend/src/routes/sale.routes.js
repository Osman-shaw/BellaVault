const express = require("express");
const { listSales, createSale, updateSale, deleteSale } = require("../controllers/sale.controller");
const { validate } = require("../middleware/validate");
const { createSaleSchema, updateSaleSchema, idParamSchema } = require("../config/validation");
const { requirePermission } = require("../middleware/authorize");
const { requireAuth } = require("../middleware/authenticate");

const router = express.Router();

router.get("/", requirePermission("sales:read"), listSales);
router.post("/", requireAuth, requirePermission("sales:create"), validate(createSaleSchema), createSale);
router.put("/:id", requireAuth, requirePermission("sales:update"), validate(updateSaleSchema), updateSale);
router.delete("/:id", requireAuth, requirePermission("sales:delete"), validate(idParamSchema), deleteSale);

module.exports = router;
