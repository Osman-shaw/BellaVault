const express = require("express");
const { liveMarket, marketDiagnostics } = require("../controllers/market.controller");
const { requirePermission } = require("../middleware/authorize");

const router = express.Router();

router.get("/live", liveMarket);
router.get("/diagnostics", requirePermission("market:diagnostics"), marketDiagnostics);

module.exports = router;
