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

/** Yahoo often blocks bare Node fetch; browser-like headers improve success from servers / CI. */
const YAHOO_FETCH_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
};

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

/**
 * Yahoo chart API — often works when v7 /quote returns empty or 401 from datacenters.
 * @see https://query1.finance.yahoo.com/v8/finance/chart/GC=F
 */
async function fetchYahooChartQuote(symbol) {
  const encoded = encodeURIComponent(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=5d`;
  const response = await fetchWithTimeout(url, { headers: { ...YAHOO_FETCH_HEADERS } });
  if (!response.ok) throw new Error(`Yahoo chart ${response.status}`);
  const data = await response.json();
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error("No chart result");
  const meta = result.meta || {};
  let price = meta.regularMarketPrice ?? meta.previousClose ?? meta.chartPreviousClose;
  if (price == null || Number(price) <= 0) {
    const closes = result.indicators?.quote?.[0]?.close;
    const last = Array.isArray(closes) ? closes.filter((x) => x != null && Number(x) > 0).pop() : null;
    price = last;
  }
  if (price == null || Number.isNaN(Number(price))) throw new Error("No chart price");
  const tsSec = meta.regularMarketTime != null ? Number(meta.regularMarketTime) : Math.floor(Date.now() / 1000);
  return {
    symbol,
    name: meta.shortName || meta.longName || symbol,
    price: Number(price),
    change: Number(meta.regularMarketChange ?? 0),
    changePercent: Number(meta.regularMarketChangePercent ?? 0),
    currency: meta.currency || "USD",
    updatedAt: tsSec > 1e12 ? tsSec : tsSec * 1000,
  };
}

/** Public quote source — no API key (Yahoo unofficial quote API). */
async function fetchYahooQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
  const response = await fetchWithTimeout(url, { headers: { ...YAHOO_FETCH_HEADERS } });
  if (!response.ok) throw new Error("Failed to fetch market quote");
  const data = await response.json();
  const quote = data?.quoteResponse?.result?.[0];
  if (!quote) throw new Error("No quote result");
  const price = quote.regularMarketPrice ?? quote.postMarketPrice ?? quote.preMarketPrice;
  if (price == null || Number(price) <= 0) throw new Error("No usable price");
  return {
    symbol,
    name: quote.shortName || quote.longName || symbol,
    price: Number(price),
    change: Number(quote.regularMarketChange ?? 0),
    changePercent: Number(quote.regularMarketChangePercent ?? 0),
    currency: quote.currency || "USD",
    updatedAt: quote.regularMarketTime ? quote.regularMarketTime * 1000 : Date.now(),
  };
}

/** Try v7 quote, then v8 chart (more reliable for futures symbols from servers). */
async function fetchYahooQuoteResilient(symbol) {
  try {
    return await fetchYahooQuote(symbol);
  } catch {
    return await fetchYahooChartQuote(symbol);
  }
}

/**
 * GoldAPI.io (app.goldapi.net) — documented pattern:
 *   GET /price/XAU/USD?x-api-key=KEY
 *   GET /price/XAU?x-api-key=KEY
 * See https://goldapi.net/docs — key stays server-side (GOLDAPI_API_KEY).
 */
async function fetchGoldApiMetal(metal, currency) {
  const key = env.goldapiApiKey;
  if (!key || !String(key).trim()) {
    return null;
  }
  const base = (env.goldapiBaseUrl || GOLDAPI_DEFAULT_BASE).replace(/\/$/, "");
  const token = String(key).trim();
  const metalUpper = String(metal).toUpperCase();
  const currencyUpper = String(currency).toUpperCase();
  const metalLower = String(metal).toLowerCase();
  const currencyLower = String(currency).toLowerCase();

  const jsonHeaders = { Accept: "application/json", "Content-Type": "application/json" };

  /** Try in order until one returns HTTP 200 + JSON. Official docs use query-param auth first. */
  const attempts = [
    `${base}/price/${metalUpper}/${currencyUpper}?x-api-key=${encodeURIComponent(token)}`,
    `${base}/price/${metalUpper}?x-api-key=${encodeURIComponent(token)}`,
    {
      url: `${base}/price/${metalUpper}/${currencyUpper}`,
      headers: { ...jsonHeaders, "x-api-key": token },
    },
    {
      url: `${base}/price/${metalUpper}`,
      headers: { ...jsonHeaders, "x-api-key": token },
    },
    {
      url: `${base}/api/price/${metalLower}/${currencyLower}`,
      headers: { ...jsonHeaders, "x-api-key": token },
    },
    {
      url: `${base}/api/price/${metalUpper}/${currencyUpper}`,
      headers: { ...jsonHeaders, "x-api-key": token },
    },
  ];

  let response;
  let lastStatus = 0;
  let lastSnippet = "";
  for (const attempt of attempts) {
    const url = typeof attempt === "string" ? attempt : attempt.url;
    const headers = typeof attempt === "string" ? { Accept: "application/json" } : attempt.headers;
    response = await fetchWithTimeout(url, { headers });
    lastStatus = response.status;
    if (response.ok) break;
    lastSnippet = await response.text().catch(() => "");
  }

  if (!response.ok) {
    throw new Error(`GoldAPI ${metal}/${currency}: ${lastStatus} ${lastSnippet.slice(0, 120)}`);
  }
  const data = await response.json();
  const tsRaw = data.timestamp != null ? Number(data.timestamp) : Math.floor(Date.now() / 1000);
  // Provider returns Unix seconds; guard against ms if they ever send 13-digit values.
  const tsSec = tsRaw > 1e12 ? Math.floor(tsRaw / 1000) : tsRaw;
  return {
    symbol: `${metalUpper}/${currencyUpper}`,
    name:
      metalUpper === "XAU"
        ? "Gold spot (USD)"
        : metalUpper === "XAG"
          ? "Silver spot (USD)"
          : metalUpper === "XPT"
            ? "Platinum spot (USD)"
            : metalUpper === "XPD"
              ? "Palladium spot (USD)"
              : `${metalUpper} (${currencyUpper})`,
    price: Number(data.price) || 0,
    change: Number(data.ch ?? data.change ?? 0) || 0,
    changePercent: Number(data.chp ?? data.change_percent ?? 0) || 0,
    currency: data.currency || currencyUpper,
    updatedAt: tsSec * 1000,
  };
}

async function safeYahoo(symbol) {
  try {
    return await fetchYahooQuoteResilient(symbol);
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
  if (!item || Number(item.price) <= 0) return null;
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

  const metalQuoted = (m) => m && Number(m.price) > 0;
  const anyMetalQuoted =
    metalQuoted(gold) || metalQuoted(silver) || metalQuoted(platinum) || metalQuoted(palladium);

  let metalsSource;
  if (usedGoldApi) metalsSource = "goldapi";
  else if (anyMetalQuoted) metalsSource = "yahoo";
  else metalsSource = "unavailable";

  const out = {
    gold: gold || zeroMarketItem("GC=F", "Gold"),
    forex: forex || zeroMarketItem("EURUSD=X", "EUR/USD"),
    sp500: sp500 || zeroMarketItem("^GSPC", "S&P 500"),
    nasdaq: nasdaq || zeroMarketItem("^IXIC", "NASDAQ"),
    metalsSource,
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
