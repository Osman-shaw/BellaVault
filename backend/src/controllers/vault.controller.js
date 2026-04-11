const VaultMovement = require("../model/vaultMovement.model");
const { getVaultBalance, applyVaultDelta } = require("../services/vault.service");

async function getVault(req, res, next) {
  try {
    const balance = await getVaultBalance(req.tenantId);
    res.json({
      balance,
      currency: "SLL",
      currencyLabel: "Le",
    });
  } catch (error) {
    next(error);
  }
}

async function listVaultMovements(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const rows = await VaultMovement.find({ tenantId: req.tenantId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json(
      rows.map((r) => ({
        id: r._id.toString(),
        delta: r.delta,
        balanceAfter: r.balanceAfter,
        kind: r.kind,
        label: r.label,
        createdAt: r.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    next(error);
  }
}

async function depositVault(req, res, next) {
  try {
    const amount = Number(req.body.amount);
    const note = (req.body.note || "").trim().slice(0, 200);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number." });
    }

    const label = note ? `Cash deposit: ${note}` : "Cash deposit";

    const balance = await applyVaultDelta(
      req.tenantId,
      amount,
      {
        kind: "deposit",
        label,
      }
    );

    res.status(201).json({ balance, message: "Vault balance updated." });
  } catch (error) {
    next(error);
  }
}

module.exports = { getVault, listVaultMovements, depositVault };
