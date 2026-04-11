"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppScreen, ScreenFeedback } from "@/components/layout/AppScreen";
import { apiService, LiveMarketApiResponse, LiveMarketResponse, MarketItem } from "@/services/apiService";
import { formatNumberEnFlexible } from "@/utils/formatDisplay";
import { notifyError } from "@/utils/notify";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
function MarketCard({ title, item }: { title: string; item: MarketItem }) {
  const up = (item.change ?? 0) >= 0;
  const changeClass = up ? "dashboard-market-change--up" : "dashboard-market-change--down";
  const updatedAtText = new Date(item.updatedAt || Date.now()).toLocaleTimeString();
  return (
    <article key={item.symbol} className="list-card dashboard-market-card">
      <div className="dashboard-market-head">
        <div className="list-card__title">{title}</div>
        <span className="dashboard-market-chip">{item.symbol}</span>
      </div>
      <div className="list-card__meta dashboard-market-name">
        {item.name}
      </div>
      <span className="dashboard-market-price">
        {item.currency} {formatNumberEnFlexible(Number(item.price || 0))}
      </span>
      <span className={changeClass}>
        {up ? "+" : ""}
        {Number(item.change || 0).toFixed(2)} ({Number(item.changePercent || 0).toFixed(2)}%)
      </span>
      <div className="dashboard-market-updated">Updated {updatedAtText}</div>
    </article>
  );
}

export function DashboardScreen() {
  const [data, setData] = useState<LiveMarketResponse | null>(null);
  const [meta, setMeta] = useState<Pick<LiveMarketApiResponse, "requestedAt" | "endpoint" | "success"> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async (notifyOnFailure: boolean) => {
      try {
        const response = await apiService.getLiveMarket();
        if (!mounted) return;
        setMeta({
          requestedAt: response.requestedAt,
          endpoint: response.endpoint,
          success: response.success,
        });
        setData(response.data);
        if (response.data.metalsSource !== "goldapi") {
          setError("GoldAPI real-time metals feed is currently unavailable. Metal cards require GoldAPI live data.");
        } else {
          setError("");
        }
      } catch {
        if (!mounted) return;
        const msg = "We could not refresh live quotes. Check your connection or try again shortly.";
        setError(msg);
        if (notifyOnFailure) notifyError(msg, "Live quotes unavailable");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load(true);
    const interval = setInterval(() => {
      void load(false);
    }, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const cards = useMemo(() => {
    if (!data) return [];
    const rows: { title: string; item: MarketItem }[] = [];

    // Enforce GoldAPI-only metal cards.
    if (data.metalsSource === "goldapi") {
      rows.push({ title: "Gold", item: data.gold });
      if (data.silver) rows.push({ title: "Silver", item: data.silver });
      if (data.platinum) rows.push({ title: "Platinum", item: data.platinum });
      if (data.palladium) rows.push({ title: "Palladium", item: data.palladium });
    }
    return rows;
  }, [data]);

  const metalsNote =
    data?.metalsSource === "goldapi"
      ? "Precious metal spots via GoldAPI (server key)."
      : data?.metalsSource === "yahoo"
        ? data?.goldapiConfigured
          ? "GoldAPI key is configured, but the provider is currently unavailable. Showing public quote fallback for now."
          : "Gold shown from a public quote feed; add GOLDAPI_API_KEY on the server for XAU/XAG/XPT/XPD spots."
        : null;

  return (
    <AppScreen
      title="BellaVault live market"
      description="Real-time precious metal quotes from GoldAPI. Open Vault for operating cash and sign in to manage records."
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
      {meta ? (
        <div className="dashboard-market-meta">
          <span className={`status-pill ${meta.success ? "status-pill--success" : "status-pill--warn"}`}>
            {meta.success ? "Live" : "Fallback"}
          </span>
          <span className="dashboard-market-source-hint">
            Source: <code>{meta.endpoint}</code> · {new Date(meta.requestedAt).toLocaleString()}
          </span>
        </div>
      ) : null}
      {metalsNote ? <p className="dashboard-market-source-hint">{metalsNote}</p> : null}
      {error ? <ScreenFeedback variant="error">{error}</ScreenFeedback> : null}
      {loading ? (
        <div className="page-loading">
          <LoadingSpinner size="lg" />
          <span>Loading live market…</span>
        </div>
      ) : (
        <>
          {cards.length === 0 ? (
            <p className="screen-empty">No metal cards available yet. Waiting for GoldAPI live feed.</p>
          ) : (
            <div className="dashboard-market-grid">
              {cards.map(({ title, item }) => (
                <MarketCard key={`${title}-${item.symbol}`} title={title} item={item} />
              ))}
            </div>
          )}
        </>
      )}
    </AppScreen>
  );
}
