const Purchase = require("../model/purchase.model");
const Sale = require("../model/sale.model");

function defaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 365);
  from.setUTCHours(0, 0, 0, 0);
  to.setUTCHours(23, 59, 59, 999);
  return { from, to };
}

function normalizeRange(fromInput, toInput) {
  const { from: df, to: dt } = defaultRange();
  let from = fromInput ? new Date(fromInput) : df;
  let to = toInput ? new Date(toInput) : dt;
  if (Number.isNaN(from.getTime())) from = df;
  if (Number.isNaN(to.getTime())) to = dt;
  if (from > to) {
    const t = from;
    from = to;
    to = t;
  }
  return { from, to };
}

function formatWeekPeriod(year, week) {
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function mapPurchaseDaily(rows) {
  return rows.map((r) => ({
    period: r._id,
    transactionCount: r.transactionCount,
    totalAmountReceived: roundMoney(r.totalAmountReceived),
    totalBuyingPrice: roundMoney(r.totalBuyingPrice),
    totalWeightCarat: roundWeight(r.totalWeightCarat),
  }));
}

function mapPurchaseWeekly(rows) {
  return rows.map((r) => ({
    period: formatWeekPeriod(r._id.year, r._id.week),
    transactionCount: r.transactionCount,
    totalAmountReceived: roundMoney(r.totalAmountReceived),
    totalBuyingPrice: roundMoney(r.totalBuyingPrice),
    totalWeightCarat: roundWeight(r.totalWeightCarat),
  }));
}

function mapPurchaseMonthly(rows) {
  return rows.map((r) => ({
    period: r._id,
    transactionCount: r.transactionCount,
    totalAmountReceived: roundMoney(r.totalAmountReceived),
    totalBuyingPrice: roundMoney(r.totalBuyingPrice),
    totalWeightCarat: roundWeight(r.totalWeightCarat),
  }));
}

function mapSaleDaily(rows) {
  return rows.map((r) => ({
    period: r._id,
    transactionCount: r.transactionCount,
    totalAmountReceived: roundMoney(r.totalAmountReceived),
    totalSellingPrice: roundMoney(r.totalSellingPrice),
    totalWeightGram: roundWeight(r.totalWeightGram),
    totalWeightCarat: roundWeight(r.totalWeightCarat),
  }));
}

function mapSaleWeekly(rows) {
  return rows.map((r) => ({
    period: formatWeekPeriod(r._id.year, r._id.week),
    transactionCount: r.transactionCount,
    totalAmountReceived: roundMoney(r.totalAmountReceived),
    totalSellingPrice: roundMoney(r.totalSellingPrice),
    totalWeightGram: roundWeight(r.totalWeightGram),
    totalWeightCarat: roundWeight(r.totalWeightCarat),
  }));
}

function mapSaleMonthly(rows) {
  return rows.map((r) => ({
    period: r._id,
    transactionCount: r.transactionCount,
    totalAmountReceived: roundMoney(r.totalAmountReceived),
    totalSellingPrice: roundMoney(r.totalSellingPrice),
    totalWeightGram: roundWeight(r.totalWeightGram),
    totalWeightCarat: roundWeight(r.totalWeightCarat),
  }));
}

function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function roundWeight(n) {
  return Math.round((Number(n) || 0) * 1000) / 1000;
}

function peakLowFromBuckets(buckets, valueKey) {
  if (!buckets.length) {
    return {
      peak: null,
      low: null,
      basis: `total ${valueKey} per period`,
    };
  }
  let peak = buckets[0];
  let low = buckets[0];
  for (const b of buckets) {
    if (b[valueKey] > peak[valueKey]) peak = b;
    if (b[valueKey] < low[valueKey]) low = b;
  }
  return {
    peak: {
      period: peak.period,
      transactionCount: peak.transactionCount,
      value: peak[valueKey],
    },
    low: {
      period: low.period,
      transactionCount: low.transactionCount,
      value: low[valueKey],
    },
    basis: `total ${valueKey} per period`,
  };
}

function tenantMatch(tenantId, extra = {}) {
  return { tenantId, ...extra };
}

async function aggregatePurchasesDaily(tenantId, from, to) {
  return Purchase.aggregate([
    { $match: tenantMatch(tenantId, { purchaseDate: { $gte: from, $lte: to } }) },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$purchaseDate", timezone: "UTC" } },
        transactionCount: { $sum: 1 },
        totalAmountReceived: { $sum: "$amountReceived" },
        totalBuyingPrice: { $sum: "$buyingPrice" },
        totalWeightCarat: { $sum: "$weightCarat" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
}

async function aggregatePurchasesWeekly(tenantId, from, to) {
  return Purchase.aggregate([
    { $match: tenantMatch(tenantId, { purchaseDate: { $gte: from, $lte: to } }) },
    {
      $group: {
        _id: {
          year: { $isoWeekYear: "$purchaseDate" },
          week: { $isoWeek: "$purchaseDate" },
        },
        transactionCount: { $sum: 1 },
        totalAmountReceived: { $sum: "$amountReceived" },
        totalBuyingPrice: { $sum: "$buyingPrice" },
        totalWeightCarat: { $sum: "$weightCarat" },
      },
    },
    { $sort: { "_id.year": 1, "_id.week": 1 } },
  ]);
}

async function aggregatePurchasesMonthly(tenantId, from, to) {
  return Purchase.aggregate([
    { $match: tenantMatch(tenantId, { purchaseDate: { $gte: from, $lte: to } }) },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$purchaseDate", timezone: "UTC" } },
        transactionCount: { $sum: 1 },
        totalAmountReceived: { $sum: "$amountReceived" },
        totalBuyingPrice: { $sum: "$buyingPrice" },
        totalWeightCarat: { $sum: "$weightCarat" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
}

async function aggregateSalesDaily(tenantId, from, to) {
  return Sale.aggregate([
    { $match: tenantMatch(tenantId, { saleDate: { $gte: from, $lte: to } }) },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$saleDate", timezone: "UTC" } },
        transactionCount: { $sum: 1 },
        totalAmountReceived: { $sum: "$amountReceived" },
        totalSellingPrice: { $sum: "$sellingPrice" },
        totalWeightGram: {
          $sum: { $cond: [{ $eq: ["$weightUnit", "gram"] }, "$weight", 0] },
        },
        totalWeightCarat: {
          $sum: { $cond: [{ $eq: ["$weightUnit", "carat"] }, "$weight", 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);
}

async function aggregateSalesWeekly(tenantId, from, to) {
  return Sale.aggregate([
    { $match: tenantMatch(tenantId, { saleDate: { $gte: from, $lte: to } }) },
    {
      $group: {
        _id: {
          year: { $isoWeekYear: "$saleDate" },
          week: { $isoWeek: "$saleDate" },
        },
        transactionCount: { $sum: 1 },
        totalAmountReceived: { $sum: "$amountReceived" },
        totalSellingPrice: { $sum: "$sellingPrice" },
        totalWeightGram: {
          $sum: { $cond: [{ $eq: ["$weightUnit", "gram"] }, "$weight", 0] },
        },
        totalWeightCarat: {
          $sum: { $cond: [{ $eq: ["$weightUnit", "carat"] }, "$weight", 0] },
        },
      },
    },
    { $sort: { "_id.year": 1, "_id.week": 1 } },
  ]);
}

async function aggregateSalesMonthly(tenantId, from, to) {
  return Sale.aggregate([
    { $match: tenantMatch(tenantId, { saleDate: { $gte: from, $lte: to } }) },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$saleDate", timezone: "UTC" } },
        transactionCount: { $sum: 1 },
        totalAmountReceived: { $sum: "$amountReceived" },
        totalSellingPrice: { $sum: "$sellingPrice" },
        totalWeightGram: {
          $sum: { $cond: [{ $eq: ["$weightUnit", "gram"] }, "$weight", 0] },
        },
        totalWeightCarat: {
          $sum: { $cond: [{ $eq: ["$weightUnit", "carat"] }, "$weight", 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);
}

async function getReportsOverview(tenantId, query) {
  const { from, to } = normalizeRange(query?.from, query?.to);

  const [
    pDayRaw,
    pWeekRaw,
    pMonthRaw,
    sDayRaw,
    sWeekRaw,
    sMonthRaw,
  ] = await Promise.all([
    aggregatePurchasesDaily(tenantId, from, to),
    aggregatePurchasesWeekly(tenantId, from, to),
    aggregatePurchasesMonthly(tenantId, from, to),
    aggregateSalesDaily(tenantId, from, to),
    aggregateSalesWeekly(tenantId, from, to),
    aggregateSalesMonthly(tenantId, from, to),
  ]);

  const purchasesDaily = mapPurchaseDaily(pDayRaw);
  const purchasesWeekly = mapPurchaseWeekly(pWeekRaw);
  const purchasesMonthly = mapPurchaseMonthly(pMonthRaw);
  const salesDaily = mapSaleDaily(sDayRaw);
  const salesWeekly = mapSaleWeekly(sWeekRaw);
  const salesMonthly = mapSaleMonthly(sMonthRaw);

  return {
    range: {
      from: from.toISOString(),
      to: to.toISOString(),
    },
    purchases: {
      daily: purchasesDaily,
      weekly: purchasesWeekly,
      monthly: purchasesMonthly,
      peakLow: {
        daily: {
          byAmountReceived: peakLowFromBuckets(purchasesDaily, "totalAmountReceived"),
          byTransactionCount: peakLowFromBuckets(purchasesDaily, "transactionCount"),
        },
        weekly: {
          byAmountReceived: peakLowFromBuckets(purchasesWeekly, "totalAmountReceived"),
          byTransactionCount: peakLowFromBuckets(purchasesWeekly, "transactionCount"),
        },
        monthly: {
          byAmountReceived: peakLowFromBuckets(purchasesMonthly, "totalAmountReceived"),
          byTransactionCount: peakLowFromBuckets(purchasesMonthly, "transactionCount"),
        },
      },
    },
    sales: {
      daily: salesDaily,
      weekly: salesWeekly,
      monthly: salesMonthly,
      peakLow: {
        daily: {
          byAmountReceived: peakLowFromBuckets(salesDaily, "totalAmountReceived"),
          byTransactionCount: peakLowFromBuckets(salesDaily, "transactionCount"),
        },
        weekly: {
          byAmountReceived: peakLowFromBuckets(salesWeekly, "totalAmountReceived"),
          byTransactionCount: peakLowFromBuckets(salesWeekly, "transactionCount"),
        },
        monthly: {
          byAmountReceived: peakLowFromBuckets(salesMonthly, "totalAmountReceived"),
          byTransactionCount: peakLowFromBuckets(salesMonthly, "transactionCount"),
        },
      },
    },
  };
}

module.exports = { getReportsOverview, normalizeRange };
