const mongoose = require("mongoose");
const SavingsAccount = require("../model/savingsAccount.model");
const SavingsTransaction = require("../model/savingsTransaction.model");
const { generateAccountNumber } = require("../model/savingsAccount.model");

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

function serializeAccount(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject({ virtuals: true }) : doc;
  return {
    _id: String(o._id),
    accountNumber: o.accountNumber,
    depositorName: o.depositorName,
    depositorContact: o.depositorContact,
    depositorAddress: o.depositorAddress,
    openedAt: new Date(o.openedAt).toISOString(),
    balance: roundMoney(o.balance || 0),
    totalDeposited: roundMoney(o.totalDeposited || 0),
    totalWithdrawn: roundMoney(o.totalWithdrawn || 0),
    lastActivityAt: new Date(o.lastActivityAt).toISOString(),
    status: o.closedAt ? "closed" : "active",
    createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : undefined,
    updatedAt: o.updatedAt ? new Date(o.updatedAt).toISOString() : undefined,
  };
}

function serializeTransaction(txn) {
  return {
    _id: String(txn._id),
    accountId: String(txn.accountId),
    accountNumber: txn.accountNumber,
    kind: txn.kind,
    amount: roundMoney(txn.amount),
    balanceAfter: roundMoney(txn.balanceAfter),
    occurredAt: new Date(txn.occurredAt).toISOString(),
    note: txn.note || "",
    createdAt: txn.createdAt ? new Date(txn.createdAt).toISOString() : undefined,
  };
}

async function allocateAccountNumber(tenantId) {
  // Retry a few times in case of a rare random collision per tenant.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generateAccountNumber();
    const existing = await SavingsAccount.findOne({ tenantId, accountNumber: candidate })
      .select("_id")
      .lean();
    if (!existing) return candidate;
  }
  throw new Error("Could not allocate a unique savings account number. Please retry.");
}

async function listSavingsAccounts(req, res, next) {
  try {
    const accounts = await SavingsAccount.find({ tenantId: req.tenantId })
      .sort({ lastActivityAt: -1, createdAt: -1 })
      .lean({ virtuals: true });
    res.json(accounts.map(serializeAccount));
  } catch (error) {
    next(error);
  }
}

async function getSavingsAccount(req, res, next) {
  try {
    const account = await SavingsAccount.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!account) return res.status(404).json({ message: "Savings account not found" });
    res.json(serializeAccount(account));
  } catch (error) {
    next(error);
  }
}

async function createSavingsAccount(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      depositorName,
      depositorContact,
      depositorAddress,
      openedAt,
      initialDeposit,
      note,
    } = req.body;

    const amount = Number(initialDeposit);
    const openedDate = new Date(openedAt);
    const accountNumber = await allocateAccountNumber(req.tenantId);

    const [account] = await SavingsAccount.create(
      [
        {
          tenantId: req.tenantId,
          accountNumber,
          depositorName: depositorName.trim(),
          depositorContact: depositorContact.trim(),
          depositorAddress: depositorAddress.trim(),
          openedAt: openedDate,
          balance: amount,
          totalDeposited: amount,
          totalWithdrawn: 0,
          lastActivityAt: openedDate,
        },
      ],
      { session }
    );

    await SavingsTransaction.create(
      [
        {
          tenantId: req.tenantId,
          accountId: account._id,
          accountNumber: account.accountNumber,
          kind: "opening",
          amount,
          balanceAfter: amount,
          occurredAt: openedDate,
          note: (note || "Opening deposit").toString().slice(0, 200),
          recordedBy: req.user?.id || null,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    res.status(201).json(serializeAccount(account));
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

async function updateSavingsAccount(req, res, next) {
  try {
    const allowed = ["depositorName", "depositorContact", "depositorAddress"];
    const patch = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) patch[key] = req.body[key];
    }

    const updated = await SavingsAccount.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: patch },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Savings account not found" });
    res.json(serializeAccount(updated));
  } catch (error) {
    next(error);
  }
}

async function depositSavings(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const account = await SavingsAccount.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .session(session);
    if (!account) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Savings account not found" });
    }
    if (account.closedAt) {
      await session.abortTransaction();
      return res.status(400).json({ message: "This savings account is closed." });
    }

    const amount = Number(req.body.amount);
    const occurredAt = req.body.occurredAt ? new Date(req.body.occurredAt) : new Date();
    const note = (req.body.note || "").toString().slice(0, 200);

    account.balance = roundMoney(Number(account.balance) + amount);
    account.totalDeposited = roundMoney(Number(account.totalDeposited) + amount);
    account.lastActivityAt = occurredAt;
    await account.save({ session });

    const [txn] = await SavingsTransaction.create(
      [
        {
          tenantId: req.tenantId,
          accountId: account._id,
          accountNumber: account.accountNumber,
          kind: "deposit",
          amount,
          balanceAfter: account.balance,
          occurredAt,
          note,
          recordedBy: req.user?.id || null,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    res.status(201).json({
      account: serializeAccount(account),
      transaction: serializeTransaction(txn),
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

async function withdrawSavings(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const account = await SavingsAccount.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .session(session);
    if (!account) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Savings account not found" });
    }
    if (account.closedAt) {
      await session.abortTransaction();
      return res.status(400).json({ message: "This savings account is closed." });
    }

    const amount = Number(req.body.amount);
    const occurredAt = req.body.occurredAt ? new Date(req.body.occurredAt) : new Date();
    const note = (req.body.note || "").toString().slice(0, 200);

    if (amount > Number(account.balance)) {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Withdrawal exceeds balance (Le ${Number(account.balance).toFixed(2)}).`,
      });
    }

    account.balance = roundMoney(Number(account.balance) - amount);
    account.totalWithdrawn = roundMoney(Number(account.totalWithdrawn) + amount);
    account.lastActivityAt = occurredAt;
    await account.save({ session });

    const [txn] = await SavingsTransaction.create(
      [
        {
          tenantId: req.tenantId,
          accountId: account._id,
          accountNumber: account.accountNumber,
          kind: "withdrawal",
          amount,
          balanceAfter: account.balance,
          occurredAt,
          note,
          recordedBy: req.user?.id || null,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    res.status(201).json({
      account: serializeAccount(account),
      transaction: serializeTransaction(txn),
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
}

async function listSavingsTransactions(req, res, next) {
  try {
    const account = await SavingsAccount.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .select("_id")
      .lean();
    if (!account) return res.status(404).json({ message: "Savings account not found" });

    const rows = await SavingsTransaction.find({ tenantId: req.tenantId, accountId: account._id })
      .sort({ occurredAt: -1, createdAt: -1 })
      .limit(500)
      .lean();
    res.json(rows.map(serializeTransaction));
  } catch (error) {
    next(error);
  }
}

async function deleteSavingsAccount(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const account = await SavingsAccount.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .session(session);
    if (!account) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Savings account not found" });
    }
    if (Number(account.balance) > 0) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Cannot delete an account with a positive balance. Withdraw the funds first.",
      });
    }

    await SavingsTransaction.deleteMany({ tenantId: req.tenantId, accountId: account._id }).session(
      session
    );
    await SavingsAccount.deleteOne({ _id: account._id, tenantId: req.tenantId }).session(session);

    await session.commitTransaction();
    return res.status(204).send();
  } catch (error) {
    await session.abortTransaction();
    return next(error);
  } finally {
    session.endSession();
  }
}

module.exports = {
  listSavingsAccounts,
  getSavingsAccount,
  createSavingsAccount,
  updateSavingsAccount,
  depositSavings,
  withdrawSavings,
  listSavingsTransactions,
  deleteSavingsAccount,
};
