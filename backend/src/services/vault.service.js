const mongoose = require("mongoose");
const VaultBalance = require("../model/vaultBalance.model");
const VaultMovement = require("../model/vaultMovement.model");

const MAIN_KEY = "main";

async function ensureMainBalance(tenantId, session) {
  const tid = tenantId instanceof mongoose.Types.ObjectId ? tenantId : new mongoose.Types.ObjectId(tenantId);
  await VaultBalance.findOneAndUpdate(
    { tenantId: tid, key: MAIN_KEY },
    { $setOnInsert: { tenantId: tid, key: MAIN_KEY, balance: 0 } },
    { upsert: true, session, new: true, setDefaultsOnInsert: true }
  );
}

/**
 * @param {import('mongoose').Types.ObjectId} tenantId
 * @param {number} delta Positive adds cash to vault, negative removes.
 * @param {{ kind: string, label: string, refType?: string|null, refId?: import('mongoose').Types.ObjectId|null }} meta
 * @param {{ allowNegative?: boolean }} opts allowNegative default false — block if balance would go below 0
 */
async function applyVaultDelta(tenantId, delta, meta, opts = {}) {
  const allowNegative = opts.allowNegative === true;
  const tid = tenantId instanceof mongoose.Types.ObjectId ? tenantId : new mongoose.Types.ObjectId(tenantId);
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await ensureMainBalance(tid, session);

    const current = await VaultBalance.findOne({ tenantId: tid, key: MAIN_KEY }).session(session).lean();
    const nextBalance = Number(current.balance) + delta;

    if (!allowNegative && nextBalance < 0) {
      await session.abortTransaction();
      const err = new Error("Insufficient vault cash for this operation.");
      err.statusCode = 400;
      throw err;
    }

    const updated = await VaultBalance.findOneAndUpdate(
      { tenantId: tid, key: MAIN_KEY },
      { $inc: { balance: delta } },
      { new: true, session }
    );

    const movement = {
      tenantId: tid,
      delta,
      balanceAfter: updated.balance,
      kind: meta.kind,
      label: meta.label,
    };
    if (meta.refType) movement.refType = meta.refType;
    if (meta.refId) movement.refId = meta.refId;

    await VaultMovement.create([movement], { session });

    await session.commitTransaction();
    return updated.balance;
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}

async function getVaultBalance(tenantId) {
  const tid = tenantId instanceof mongoose.Types.ObjectId ? tenantId : new mongoose.Types.ObjectId(tenantId);
  const doc = await VaultBalance.findOne({ tenantId: tid, key: MAIN_KEY }).lean();
  return doc ? Number(doc.balance) : 0;
}

module.exports = {
  applyVaultDelta,
  getVaultBalance,
  MAIN_KEY,
};
