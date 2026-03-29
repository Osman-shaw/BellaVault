const express = require("express");
const { getVault, listVaultMovements, depositVault } = require("../controllers/vault.controller");
const { validate } = require("../middleware/validate");
const { vaultDepositSchema } = require("../config/validation");
const { requirePermission } = require("../middleware/authorize");
const { requireAuth } = require("../middleware/authenticate");

const router = express.Router();

router.get("/", requirePermission("vault:read"), getVault);
router.get("/movements", requirePermission("vault:read"), listVaultMovements);
router.post("/deposit", requireAuth, requirePermission("vault:deposit"), validate(vaultDepositSchema), depositVault);

module.exports = router;
