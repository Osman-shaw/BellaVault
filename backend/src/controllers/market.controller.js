const { getLiveMarketData, getMarketDiagnostics } = require("../services/market.service");

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
  const endpoint = "/api/market/live";
  try {
    const data = await getLiveMarketData();
    return res.json({
      success: true,
      endpoint,
      requestedAt: Date.now(),
      data,
    });
  } catch {
    return res.json({
      success: false,
      endpoint,
      requestedAt: Date.now(),
      data: fallbackBundle(),
    });
  }
}

async function marketDiagnostics(_req, res) {
  try {
    const diagnostics = await getMarketDiagnostics();
    return res.json(diagnostics);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to collect market diagnostics.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

module.exports = { liveMarket, marketDiagnostics };
