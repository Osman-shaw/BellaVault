const express = require("express");
const { listDeals, createDeal, updateDeal, deleteDeal, dashboard } = require("../controllers/deal.controller");
const { validate } = require("../middleware/validate");
const { createDealSchema, idParamSchema, updateDealSchema } = require("../config/validation");
const { requirePermission } = require("../middleware/authorize");
const { requireAuth } = require("../middleware/authenticate");

const router = express.Router();

router.get("/", requirePermission("deals:read"), listDeals);
router.post("/", requireAuth, requirePermission("deals:create"), validate(createDealSchema), createDeal);
router.put("/:id", requireAuth, requirePermission("deals:update"), validate(updateDealSchema), updateDeal);
router.delete("/:id", requireAuth, requirePermission("deals:delete"), validate(idParamSchema), deleteDeal);
router.get("/dashboard/summary", requirePermission("dashboard:read"), dashboard);

module.exports = router;
