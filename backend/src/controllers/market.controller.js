const { getLiveMarketData } = require("../services/market.service");

function fallbackBundle() {
  const z = (symbol, name) => ({
    symbol,
    name,
    price: 0,
    change: 0,
    changePercent: 0,
    currency: "USD",
    updatedAt: Date.now(),
  });
  return {
    gold: z("GC=F", "Gold"),
    forex: z("EURUSD=X", "EUR/USD"),
    sp500: z("^GSPC", "S&P 500"),
    nasdaq: z("^IXIC", "NASDAQ"),
    metalsSource: "unavailable",
  };
}

async function liveMarket(_req, res) {
  try {
    const data = await getLiveMarketData();
    return res.json(data);
  } catch {
    return res.json(fallbackBundle());
  }
}

module.exports = { liveMarket };
