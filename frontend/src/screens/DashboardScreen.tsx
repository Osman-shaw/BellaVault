"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppScreen, ScreenFeedback } from "@/components/layout/AppScreen";
import { apiService, LiveMarketResponse } from "@/services/apiService";
import { formatNumberEnFlexible } from "@/utils/formatDisplay";
import { notifyError } from "@/utils/notify";

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

  const cards = data
    ? [
        { title: "Gold", item: data.gold },
        { title: "Forex (EUR/USD)", item: data.forex },
        { title: "S&P 500", item: data.sp500 },
        { title: "NASDAQ", item: data.nasdaq },
      ]
    : [];

  return (
    <AppScreen
      title="BellaVault live market"
      description="Reference quotes for gold, FX, and major indices. Open Vault to see operating cash for gold trading (visible to everyone). Sign in to manage purchases, sales, deals, partners, borrows, and reports."
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
      {error ? <ScreenFeedback variant="error">{error}</ScreenFeedback> : null}
      {loading ? (
        <div className="skeleton-grid">
          {Array.from({ length: 4 }).map((_, index) => (
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
          {cards.map(({ title, item }) => {
            const up = (item.change || 0) >= 0;
            return (
              <article key={item.symbol} className="list-card dashboard-market-card">
                <div className="list-card__title">{title}</div>
                <span className="dashboard-market-price">
                  {item.currency} {formatNumberEnFlexible(Number(item.price || 0))}
                </span>
                <span className={up ? "dashboard-market-change--up" : "dashboard-market-change--down"}>
                  {up ? "+" : ""}
                  {Number(item.change || 0).toFixed(2)} ({Number(item.changePercent || 0).toFixed(2)}%)
                </span>
              </article>
            );
          })}
        </div>
      )}
    </AppScreen>
  );
}
