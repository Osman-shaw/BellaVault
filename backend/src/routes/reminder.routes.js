const express = require("express");
const { listThirtyDayReminders } = require("../controllers/reminder.controller");
const { requirePermission } = require("../middleware/authorize");
const { requireAuth } = require("../middleware/authenticate");

const router = express.Router();

router.get("/thirty-day", requireAuth, requirePermission("reminders:read"), listThirtyDayReminders);

module.exports = router;
