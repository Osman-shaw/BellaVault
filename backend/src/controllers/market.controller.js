const { getLiveMarketData } = require("../services/market.service");

async function liveMarket(_req, res) {
  try {
    const data = await getLiveMarketData();
    return res.json(data);
  } catch {
    return res.json({
      gold: { symbol: "GC=F", name: "Gold Futures", price: 0, change: 0, changePercent: 0, currency: "USD", updatedAt: Date.now() },
      forex: { symbol: "EURUSD=X", name: "EUR/USD", price: 0, change: 0, changePercent: 0, currency: "USD", updatedAt: Date.now() },
      sp500: { symbol: "^GSPC", name: "S&P 500", price: 0, change: 0, changePercent: 0, currency: "USD", updatedAt: Date.now() },
      nasdaq: { symbol: "^IXIC", name: "NASDAQ", price: 0, change: 0, changePercent: 0, currency: "USD", updatedAt: Date.now() },
    });
  }
}

module.exports = { liveMarket };
