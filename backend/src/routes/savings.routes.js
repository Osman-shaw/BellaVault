const express = require("express");
const {
  listSavingsAccounts,
  getSavingsAccount,
  createSavingsAccount,
  updateSavingsAccount,
  depositSavings,
  withdrawSavings,
  listSavingsTransactions,
  deleteSavingsAccount,
} = require("../controllers/savings.controller");
const { validate } = require("../middleware/validate");
const {
  createSavingsAccountSchema,
  updateSavingsAccountSchema,
  savingsTransactionSchema,
  idParamSchema,
} = require("../config/validation");
const { requirePermission } = require("../middleware/authorize");
const { requireAuth } = require("../middleware/authenticate");

const router = express.Router();

router.get("/", requireAuth, requirePermission("savings:read"), listSavingsAccounts);
router.get("/:id", requireAuth, requirePermission("savings:read"), validate(idParamSchema), getSavingsAccount);
router.get(
  "/:id/transactions",
  requireAuth,
  requirePermission("savings:read"),
  validate(idParamSchema),
  listSavingsTransactions
);
router.post(
  "/",
  requireAuth,
  requirePermission("savings:create"),
  validate(createSavingsAccountSchema),
  createSavingsAccount
);
router.put(
  "/:id",
  requireAuth,
  requirePermission("savings:update"),
  validate(updateSavingsAccountSchema),
  updateSavingsAccount
);
router.post(
  "/:id/deposit",
  requireAuth,
  requirePermission("savings:transact"),
  validate(savingsTransactionSchema),
  depositSavings
);
router.post(
  "/:id/withdraw",
  requireAuth,
  requirePermission("savings:transact"),
  validate(savingsTransactionSchema),
  withdrawSavings
);
router.delete(
  "/:id",
  requireAuth,
  requirePermission("savings:delete"),
  validate(idParamSchema),
  deleteSavingsAccount
);

module.exports = router;
