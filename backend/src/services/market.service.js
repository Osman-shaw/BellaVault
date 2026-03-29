async function fetchQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch market quote");
  const data = await response.json();
  const quote = data?.quoteResponse?.result?.[0];
  if (!quote) throw new Error("No quote result");
  return {
    symbol,
    name: quote.shortName || quote.longName || symbol,
    price: quote.regularMarketPrice,
    change: quote.regularMarketChange,
    changePercent: quote.regularMarketChangePercent,
    currency: quote.currency || "USD",
    updatedAt: quote.regularMarketTime ? quote.regularMarketTime * 1000 : Date.now(),
  };
}

async function getLiveMarketData() {
  const symbols = ["GC=F", "EURUSD=X", "^GSPC", "^IXIC"];
  const [gold, forex, sp500, nasdaq] = await Promise.all(symbols.map((symbol) => fetchQuote(symbol)));

  return {
    gold,
    forex,
    sp500,
    nasdaq,
  };
}

module.exports = { getLiveMarketData };
