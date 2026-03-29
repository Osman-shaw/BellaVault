const express = require("express");
const dealRoutes = require("./deal.routes");
const entityRoutes = require("./entity.routes");
const authRoutes = require("./auth.routes");
const marketRoutes = require("./market.routes");
const purchaseRoutes = require("./purchase.routes");
const saleRoutes = require("./sale.routes");
const reportsRoutes = require("./reports.routes");
const borrowRoutes = require("./borrow.routes");
const vaultRoutes = require("./vault.routes");
const { dashboard } = require("../controllers/deal.controller");
const { requirePermission } = require("../middleware/authorize");

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});
router.use("/auth", authRoutes);
router.use("/market", marketRoutes);
router.get("/dashboard", requirePermission("dashboard:read"), dashboard);
router.use("/deals", dealRoutes);
router.use("/entities", entityRoutes);
router.use("/purchases", purchaseRoutes);
router.use("/sales", saleRoutes);
router.use("/reports", reportsRoutes);
router.use("/borrows", borrowRoutes);
router.use("/vault", vaultRoutes);

module.exports = router;
