const { env } = require("../config/env");

const GOLDAPI_DEFAULT_BASE = "https://app.goldapi.net";
const FETCH_TIMEOUT_MS = 12000;

function zeroMarketItem(symbol, name, currency = "USD") {
  return {
    symbol,
    name,
    price: 0,
    change: 0,
    changePercent: 0,
    currency,
    updatedAt: Date.now(),
  };
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(t);
  }
}

/** Public quote source — no API key (Yahoo unofficial quote API). */
async function fetchYahooQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error("Failed to fetch market quote");
  const data = await response.json();
  const quote = data?.quoteResponse?.result?.[0];
  if (!quote) throw new Error("No quote result");
  return {
    symbol,
    name: quote.shortName || quote.longName || symbol,
    price: quote.regularMarketPrice ?? 0,
    change: quote.regularMarketChange ?? 0,
    changePercent: quote.regularMarketChangePercent ?? 0,
    currency: quote.currency || "USD",
    updatedAt: quote.regularMarketTime ? quote.regularMarketTime * 1000 : Date.now(),
  };
}

/** GoldAPI.io / goldapi.net — key must stay server-side in GOLDAPI_API_KEY. */
async function fetchGoldApiMetal(metal, currency) {
  const key = env.goldapiApiKey;
  if (!key || !String(key).trim()) {
    return null;
  }
  const base = (env.goldapiBaseUrl || GOLDAPI_DEFAULT_BASE).replace(/\/$/, "");
  const url = `${base}/price/${metal}/${currency}?x-api-key=${encodeURIComponent(String(key).trim())}`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`GoldAPI ${metal}/${currency}: ${response.status} ${text.slice(0, 120)}`);
  }
  const data = await response.json();
  const ts = data.timestamp != null ? Number(data.timestamp) : Math.floor(Date.now() / 1000);
  return {
    symbol: `${metal}/${currency}`,
    name:
      metal === "XAU"
        ? "Gold spot (USD)"
        : metal === "XAG"
          ? "Silver spot (USD)"
          : metal === "XPT"
            ? "Platinum spot (USD)"
            : metal === "XPD"
              ? "Palladium spot (USD)"
              : `${metal} (${currency})`,
    price: Number(data.price) || 0,
    change: Number(data.ch) || 0,
    changePercent: Number(data.chp) || 0,
    currency: data.currency || currency,
    updatedAt: ts * 1000,
  };
}

async function safeYahoo(symbol) {
  try {
    return await fetchYahooQuote(symbol);
  } catch {
    return null;
  }
}

async function safeGoldApi(metal, currency) {
  try {
    return await fetchGoldApiMetal(metal, currency);
  } catch {
    return null;
  }
}

/**
 * Live market bundle:
 * - Precious metals: GoldAPI when GOLDAPI_API_KEY is set (XAU, XAG, XPT, XPD vs USD).
 * - Forex + indices: Yahoo (no key).
 * - Without GoldAPI key, gold falls back to Yahoo GC=F; other metals omitted.
 */
async function getLiveMarketData() {
  const hasGoldApi = Boolean(env.goldapiApiKey && String(env.goldapiApiKey).trim());

  const [forex, sp500, nasdaq] = await Promise.all([
    safeYahoo("EURUSD=X"),
    safeYahoo("^GSPC"),
    safeYahoo("^IXIC"),
  ]);

  let gold;
  let silver;
  let platinum;
  let palladium;

  if (hasGoldApi) {
    [gold, silver, platinum, palladium] = await Promise.all([
      safeGoldApi("XAU", "USD"),
      safeGoldApi("XAG", "USD"),
      safeGoldApi("XPT", "USD"),
      safeGoldApi("XPD", "USD"),
    ]);
  }

  if (!gold) {
    gold = await safeYahoo("GC=F");
    if (gold) {
      gold = {
        ...gold,
        name: gold.name || "Gold futures (USD)",
      };
    }
  }

  const out = {
    gold: gold || zeroMarketItem("GC=F", "Gold"),
    forex: forex || zeroMarketItem("EURUSD=X", "EUR/USD"),
    sp500: sp500 || zeroMarketItem("^GSPC", "S&P 500"),
    nasdaq: nasdaq || zeroMarketItem("^IXIC", "NASDAQ"),
    metalsSource: hasGoldApi ? "goldapi" : "yahoo",
  };

  if (silver) out.silver = silver;
  if (platinum) out.platinum = platinum;
  if (palladium) out.palladium = palladium;

  return out;
}

module.exports = { getLiveMarketData };
