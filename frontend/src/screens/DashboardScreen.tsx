"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppScreen, ScreenFeedback } from "@/components/layout/AppScreen";
import { apiService, LiveMarketResponse, MarketItem } from "@/services/apiService";
import { formatNumberEnFlexible } from "@/utils/formatDisplay";
import { notifyError } from "@/utils/notify";

function MarketCard({ title, item }: { title: string; item: MarketItem }) {
  const up = (item.change || 0) >= 0;
  return (
    <article key={item.symbol} className="list-card dashboard-market-card">
      <div className="list-card__title">{title}</div>
      <div className="list-card__meta" style={{ marginTop: 2, marginBottom: 4 }}>
        {item.name}
      </div>
      <span className="dashboard-market-price">
        {item.currency} {formatNumberEnFlexible(Number(item.price || 0))}
      </span>
      <span className={up ? "dashboard-market-change--up" : "dashboard-market-change--down"}>
        {up ? "+" : ""}
        {Number(item.change || 0).toFixed(2)} ({Number(item.changePercent || 0).toFixed(2)}%)
      </span>
    </article>
  );
}

export function DashboardScreen() {
  const [data, setData] = useState<LiveMarketResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService
      .getLiveMarket()
      .then(setData)
      .catch(() => {
        const msg = "Unable to load live market data right now.";
        setError(msg);
        notifyError(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  const cards = useMemo(() => {
    if (!data) return [];
    const rows: { title: string; item: MarketItem }[] = [{ title: "Gold", item: data.gold }];
    if (data.silver) rows.push({ title: "Silver", item: data.silver });
    if (data.platinum) rows.push({ title: "Platinum", item: data.platinum });
    if (data.palladium) rows.push({ title: "Palladium", item: data.palladium });
    rows.push(
      { title: "Forex (EUR/USD)", item: data.forex },
      { title: "S&P 500", item: data.sp500 },
      { title: "NASDAQ", item: data.nasdaq }
    );
    return rows;
  }, [data]);

  const metalsNote =
    data?.metalsSource === "goldapi"
      ? "Precious metal spots via GoldAPI (server key). Forex and indices via public quotes."
      : data?.metalsSource === "yahoo"
        ? "Gold shown from a public quote feed; add GOLDAPI_API_KEY on the server for XAU/XAG/XPT/XPD spots."
        : null;

  return (
    <AppScreen
      title="BellaVault live market"
      description="Reference quotes: precious metals (GoldAPI when configured), plus EUR/USD and US indices from a public feed. Open Vault for operating cash. Sign in to manage records."
    >
      <div className="screen-banner screen-banner--muted" role="note">
        <Link href="/vault" className="screen-inline-link">
          Vault
        </Link>
        {" · "}
        <Link href="/auth/login" className="screen-inline-link">
          Sign in
        </Link>
        {" · "}
        <Link href="/auth/register" className="screen-inline-link">
          Register
        </Link>
      </div>
      {metalsNote ? <p className="dashboard-market-source-hint">{metalsNote}</p> : null}
      {error ? <ScreenFeedback variant="error">{error}</ScreenFeedback> : null}
      {loading ? (
        <div className="skeleton-grid">
          {Array.from({ length: 7 }).map((_, index) => (
            <article key={index} className="skeleton-card">
              <div className="skeleton-line md" />
              <div className="skeleton-line lg" />
              <div className="skeleton-line sm" />
              <div className="skeleton-shimmer" />
            </article>
          ))}
        </div>
      ) : (
        <div className="dashboard-market-grid">
          {cards.map(({ title, item }) => (
            <MarketCard key={`${title}-${item.symbol}`} title={title} item={item} />
          ))}
        </div>
      )}
    </AppScreen>
  );
}
