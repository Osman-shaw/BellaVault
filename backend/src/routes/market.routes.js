const express = require("express");
const { liveMarket } = require("../controllers/market.controller");

const router = express.Router();

router.get("/live", liveMarket);

module.exports = router;
