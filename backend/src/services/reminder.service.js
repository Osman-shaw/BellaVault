const mongoose = require("mongoose");
const Borrow = require("../model/borrow.model");
const Entity = require("../model/entity.model");
const PartnerLedger = require("../model/partnerLedger.model");
const SavingsAccount = require("../model/savingsAccount.model");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(from, to) {
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY);
}

function periodIndex(anchor, now, intervalDays) {
  const ms = intervalDays * MS_PER_DAY;
  return Math.floor((now.getTime() - anchor.getTime()) / ms);
}

async function getBorrowReminderRows(tenantId, now = new Date(), intervalDays = 30) {
  const borrows = await Borrow.find({ tenantId }).sort({ borrowedAt: 1 }).lean();
  return borrows
    .map((b) => {
      const principal = Number(b.principalAmount) || 0;
      const paid = Number(b.amountPaid) || 0;
      const remainingBalance = Math.max(0, Math.round((principal - paid) * 100) / 100);
      const borrowedAt = new Date(b.borrowedAt);
      const d = daysBetween(borrowedAt, now);
      const idx = periodIndex(borrowedAt, now, intervalDays);
      const status = paid >= principal ? "paid" : "pending";
      return {
        id: b._id.toString(),
        borrowerName: b.borrowerName,
        borrowerContact: b.borrowerContact,
        borrowedAt: borrowedAt.toISOString(),
        principalAmount: principal,
        amountPaid: paid,
        remainingBalance,
        status,
        daysSinceBorrowed: Math.max(0, d),
        periodIndex: Math.max(0, idx),
      };
    })
    .filter((row) => row.status === "pending" && row.remainingBalance > 0);
}

async function getPartnerReminderRows(tenantId, now = new Date(), intervalDays = 30) {
  const pipeline = [
    { $match: { tenantId: new mongoose.Types.ObjectId(String(tenantId)) } },
    {
      $group: {
        _id: "$entityId",
        firstInvestedAt: { $min: "$recordedAt" },
        totalInvested: { $sum: "$moneyInvested" },
        totalReceived: { $sum: "$moneyReceived" },
        entryCount: { $sum: 1 },
      },
    },
  ];

  const groups = await PartnerLedger.aggregate(pipeline);
  if (!groups.length) return [];

  const entityIds = groups.map((g) => g._id);
  const entities = await Entity.find({ _id: { $in: entityIds }, tenantId }).select("name").lean();
  const nameById = new Map(entities.map((e) => [e._id.toString(), e.name]));

  return groups
    .map((g) => {
      const first = new Date(g.firstInvestedAt);
      const totalInvested = Number(g.totalInvested) || 0;
      const totalReceived = Number(g.totalReceived) || 0;
      const capitalRemaining = Math.round((totalInvested - totalReceived) * 100) / 100;
      const d = daysBetween(first, now);
      const idx = periodIndex(first, now, intervalDays);
      return {
        entityId: g._id.toString(),
        entityName: nameById.get(g._id.toString()) || "Partner",
        firstInvestedAt: first.toISOString(),
        totalInvested,
        totalReceived,
        capitalRemaining,
        ledgerEntryCount: g.entryCount,
        daysSinceFirstLedger: Math.max(0, d),
        periodIndex: Math.max(0, idx),
      };
    })
    .filter((row) => row.ledgerEntryCount > 0);
}

async function getSavingsReminderRows(tenantId, now = new Date(), intervalDays = 30) {
  const accounts = await SavingsAccount.find({ tenantId, closedAt: null })
    .sort({ openedAt: 1 })
    .lean();
  return accounts
    .map((a) => {
      const openedAt = new Date(a.openedAt);
      const lastActivityAt = new Date(a.lastActivityAt || a.openedAt);
      const balance = Math.round((Number(a.balance) || 0) * 100) / 100;
      const totalDeposited = Math.round((Number(a.totalDeposited) || 0) * 100) / 100;
      const totalWithdrawn = Math.round((Number(a.totalWithdrawn) || 0) * 100) / 100;
      return {
        id: a._id.toString(),
        accountNumber: a.accountNumber,
        depositorName: a.depositorName,
        depositorContact: a.depositorContact,
        depositorAddress: a.depositorAddress,
        openedAt: openedAt.toISOString(),
        lastActivityAt: lastActivityAt.toISOString(),
        balance,
        totalDeposited,
        totalWithdrawn,
        daysSinceOpened: Math.max(0, daysBetween(openedAt, now)),
        daysSinceLastActivity: Math.max(0, daysBetween(lastActivityAt, now)),
        periodIndex: Math.max(0, periodIndex(openedAt, now, intervalDays)),
      };
    })
    .filter((row) => row.balance > 0);
}

async function getThirtyDayReminders(tenantId, options = {}) {
  const intervalDays = options.intervalDays ?? 30;
  const now = options.now ? new Date(options.now) : new Date();
  const [borrows, partners, savings] = await Promise.all([
    getBorrowReminderRows(tenantId, now, intervalDays),
    getPartnerReminderRows(tenantId, now, intervalDays),
    getSavingsReminderRows(tenantId, now, intervalDays),
  ]);
  return { intervalDays, borrows, partners, savings, generatedAt: now.toISOString() };
}

module.exports = {
  getThirtyDayReminders,
  getBorrowReminderRows,
  getPartnerReminderRows,
  getSavingsReminderRows,
};
