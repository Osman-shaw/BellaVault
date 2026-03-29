const express = require("express");
const { listEntities, createEntity, updateEntity, deleteEntity } = require("../controllers/entity.controller");
const {
  listPartnerLedger,
  createPartnerLedgerEntry,
  deletePartnerLedgerEntry,
} = require("../controllers/partnerLedger.controller");
const { validate } = require("../middleware/validate");
const {
  createEntitySchema,
  idParamSchema,
  updateEntitySchema,
  entityIdParamSchema,
  createPartnerLedgerSchema,
  deletePartnerLedgerSchema,
} = require("../config/validation");
const { requirePermission } = require("../middleware/authorize");
const { requireAuth } = require("../middleware/authenticate");

const router = express.Router();

router.get("/", requirePermission("entities:read"), listEntities);
router.post("/", requireAuth, requirePermission("entities:create"), validate(createEntitySchema), createEntity);
router.get(
  "/:entityId/ledger",
  requirePermission("entities:read"),
  validate(entityIdParamSchema),
  listPartnerLedger
);
router.post(
  "/:entityId/ledger",
  requireAuth,
  requirePermission("entities:create"),
  validate(createPartnerLedgerSchema),
  createPartnerLedgerEntry
);
router.delete(
  "/:entityId/ledger/:entryId",
  requireAuth,
  requirePermission("entities:create"),
  validate(deletePartnerLedgerSchema),
  deletePartnerLedgerEntry
);
router.put("/:id", requireAuth, requirePermission("entities:update"), validate(updateEntitySchema), updateEntity);
router.delete("/:id", requireAuth, requirePermission("entities:delete"), validate(idParamSchema), deleteEntity);

module.exports = router;
