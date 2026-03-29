const Deal = require("../model/deal.model");

function computeDealStatus(totalValue, paidAmount) {
  if (paidAmount >= totalValue) return "SETTLED";
  if (paidAmount > 0) return "PARTIAL";
  return "OWED";
}

async function getDashboardSummary() {
  const deals = await Deal.find({}).lean();

  const totalValue = deals.reduce((sum, item) => sum + item.totalValue, 0);
  const totalPaid = deals.reduce((sum, item) => sum + item.paidAmount, 0);

  return {
    totalValue,
    totalPaid,
    balanceDue: totalValue - totalPaid,
    deals: deals.length,
  };
}

module.exports = { computeDealStatus, getDashboardSummary };
