const express = require("express");
const { listBorrows, createBorrow, updateBorrow, deleteBorrow } = require("../controllers/borrow.controller");
const { validate } = require("../middleware/validate");
const { createBorrowSchema, updateBorrowSchema, idParamSchema } = require("../config/validation");
const { requirePermission } = require("../middleware/authorize");
const { requireAuth } = require("../middleware/authenticate");

const router = express.Router();

router.get("/", requirePermission("borrows:read"), listBorrows);
router.post("/", requireAuth, requirePermission("borrows:create"), validate(createBorrowSchema), createBorrow);
router.put("/:id", requireAuth, requirePermission("borrows:update"), validate(updateBorrowSchema), updateBorrow);
router.delete("/:id", requireAuth, requirePermission("borrows:delete"), validate(idParamSchema), deleteBorrow);

module.exports = router;
