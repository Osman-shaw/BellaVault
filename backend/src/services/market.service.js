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

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...(options || {}), signal: controller.signal });
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
  const token = String(key).trim();
  const metalLower = String(metal).toLowerCase();
  const currencyLower = String(currency).toLowerCase();
  const primaryEndpoint = `${base}/api/price/${metalLower}/${currencyLower}`;
  const fallbackEndpointWithCurrency = `${base}/price/${metal}/${currency}?x-api-key=${encodeURIComponent(token)}`;
  const fallbackEndpointMetalOnly = `${base}/price/${metal}?x-api-key=${encodeURIComponent(token)}`;

  // Primary mode requested by integration: /api/price/xau/usd with x-api-key header.
  let response = await fetchWithTimeout(primaryEndpoint, {
    headers: {
      "x-api-key": token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  // Backward compatibility fallback: old query-param paths.
  if (!response.ok) {
    response = await fetchWithTimeout(fallbackEndpointWithCurrency, {
      headers: { Accept: "application/json" },
    });
  }
  if (!response.ok) {
    response = await fetchWithTimeout(fallbackEndpointMetalOnly, {
      headers: { Accept: "application/json" },
    });
  }
  if (!response.ok) {
    // One final retry of primary with uppercase path segments for provider variance.
    response = await fetchWithTimeout(`${base}/api/price/${metal}/${currency}`, {
      headers: {
        "x-api-key": token,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }
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

async function safeYahooMetal(symbol, label) {
  const item = await safeYahoo(symbol);
  if (!item) return null;
  return {
    ...item,
    name: label,
  };
}

async function probeGoldApi() {
  const key = String(env.goldapiApiKey || "").trim();
  const base = (env.goldapiBaseUrl || GOLDAPI_DEFAULT_BASE).replace(/\/$/, "");
  if (!key) {
    return {
      ok: false,
      status: null,
      endpoint: `${base}/price/XAU/USD`,
      error: "GOLDAPI_API_KEY is missing",
    };
  }

  const candidates = [
    `${base}/price/XAU/USD?x-api-key=${encodeURIComponent(key)}`,
    `${base}/price/XAU?x-api-key=${encodeURIComponent(key)}`,
  ];

  for (const url of candidates) {
    try {
      const response = await fetchWithTimeout(url, {
        headers: { Accept: "application/json" },
      });
      const body = await response.text().catch(() => "");
      if (response.ok) {
        return {
          ok: true,
          status: response.status,
          endpoint: url.replace(key, "***"),
          error: null,
        };
      }
      const snippet = body.slice(0, 160);
      if (response.status >= 500) {
        continue;
      }
      return {
        ok: false,
        status: response.status,
        endpoint: url.replace(key, "***"),
        error: snippet || "GoldAPI request failed",
      };
    } catch (error) {
      return {
        ok: false,
        status: null,
        endpoint: url.replace(key, "***"),
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  return {
    ok: false,
    status: 500,
    endpoint: `${base}/price/XAU/USD`,
    error: "Provider responded with server errors",
  };
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
  let usedGoldApi = false;

  if (hasGoldApi) {
    [gold, silver, platinum, palladium] = await Promise.all([
      safeGoldApi("XAU", "USD"),
      safeGoldApi("XAG", "USD"),
      safeGoldApi("XPT", "USD"),
      safeGoldApi("XPD", "USD"),
    ]);
    usedGoldApi = Boolean(gold || silver || platinum || palladium);
  }

  // Always provide metal cards: use Yahoo futures as fallback if GoldAPI is unavailable.
  const [yahooGold, yahooSilver, yahooPlatinum, yahooPalladium] = await Promise.all([
    safeYahooMetal("GC=F", "Gold futures (USD)"),
    safeYahooMetal("SI=F", "Silver futures (USD)"),
    safeYahooMetal("PL=F", "Platinum futures (USD)"),
    safeYahooMetal("PA=F", "Palladium futures (USD)"),
  ]);

  if (!gold) gold = yahooGold;
  if (!silver) silver = yahooSilver;
  if (!platinum) platinum = yahooPlatinum;
  if (!palladium) palladium = yahooPalladium;

  const out = {
    gold: gold || zeroMarketItem("GC=F", "Gold"),
    forex: forex || zeroMarketItem("EURUSD=X", "EUR/USD"),
    sp500: sp500 || zeroMarketItem("^GSPC", "S&P 500"),
    nasdaq: nasdaq || zeroMarketItem("^IXIC", "NASDAQ"),
    metalsSource: usedGoldApi ? "goldapi" : "yahoo",
    goldapiConfigured: hasGoldApi,
  };

  if (silver) out.silver = silver;
  if (platinum) out.platinum = platinum;
  if (palladium) out.palladium = palladium;

  return out;
}

async function getMarketDiagnostics() {
  const data = await getLiveMarketData();
  const probe = await probeGoldApi();
  return {
    goldapi: {
      configured: Boolean(String(env.goldapiApiKey || "").trim()),
      baseUrl: (env.goldapiBaseUrl || GOLDAPI_DEFAULT_BASE).replace(/\/$/, ""),
      probe,
    },
    markets: {
      metalsSource: data.metalsSource || "unavailable",
      hasGold: Boolean(data.gold && Number(data.gold.price) > 0),
      hasSilver: Boolean(data.silver && Number(data.silver.price) > 0),
      hasPlatinum: Boolean(data.platinum && Number(data.platinum.price) > 0),
      hasPalladium: Boolean(data.palladium && Number(data.palladium.price) > 0),
      hasForex: Boolean(data.forex && Number(data.forex.price) > 0),
      hasSp500: Boolean(data.sp500 && Number(data.sp500.price) > 0),
      hasNasdaq: Boolean(data.nasdaq && Number(data.nasdaq.price) > 0),
    },
    checkedAt: Date.now(),
  };
}

module.exports = { getLiveMarketData, getMarketDiagnostics };
