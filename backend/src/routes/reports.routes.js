const express = require("express");
const { overview } = require("../controllers/reports.controller");
const { validate } = require("../middleware/validate");
const { reportsQuerySchema } = require("../config/validation");
const { requirePermission } = require("../middleware/authorize");

const router = express.Router();

router.get("/overview", requirePermission("reports:read"), validate(reportsQuerySchema), overview);

module.exports = router;
