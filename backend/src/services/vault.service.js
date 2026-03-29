const mongoose = require("mongoose");
const VaultBalance = require("../model/vaultBalance.model");
const VaultMovement = require("../model/vaultMovement.model");

const MAIN_KEY = "main";

async function ensureMainBalance(session) {
  await VaultBalance.findOneAndUpdate(
    { key: MAIN_KEY },
    { $setOnInsert: { key: MAIN_KEY, balance: 0 } },
    { upsert: true, session, new: true, setDefaultsOnInsert: true }
  );
}

/**
 * @param {number} delta Positive adds cash to vault, negative removes.
 * @param {{ kind: string, label: string, refType?: string|null, refId?: import('mongoose').Types.ObjectId|null }} meta
 * @param {{ allowNegative?: boolean }} opts allowNegative default false — block if balance would go below 0
 */
async function applyVaultDelta(delta, meta, opts = {}) {
  const allowNegative = opts.allowNegative === true;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await ensureMainBalance(session);

    const current = await VaultBalance.findOne({ key: MAIN_KEY }).session(session).lean();
    const nextBalance = Number(current.balance) + delta;

    if (!allowNegative && nextBalance < 0) {
      await session.abortTransaction();
      const err = new Error("Insufficient vault cash for this operation.");
      err.statusCode = 400;
      throw err;
    }

    const updated = await VaultBalance.findOneAndUpdate(
      { key: MAIN_KEY },
      { $inc: { balance: delta } },
      { new: true, session }
    );

    const movement = {
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

async function getVaultBalance() {
  const doc = await VaultBalance.findOne({ key: MAIN_KEY }).lean();
  return doc ? Number(doc.balance) : 0;
}

module.exports = {
  applyVaultDelta,
  getVaultBalance,
  MAIN_KEY,
};
