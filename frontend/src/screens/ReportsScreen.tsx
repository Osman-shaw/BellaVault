"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  apiService,
  PeakLowBlock,
  ReportBucketPurchase,
  ReportBucketSale,
  ReportsOverview,
} from "@/services/apiService";
import { FormButton } from "@/components/form/FormButton";
import { FormCard } from "@/components/form/FormCard";
import { FormInput } from "@/components/form/FormInput";
import { AccessDenied, AppScreen, ScreenFeedback, ScreenSectionTitle } from "@/components/layout/AppScreen";
import { can } from "@/state/rbac";
import { useRole } from "@/state/useRole";
import { notifyError } from "@/utils/notify";
import { formatDateUtc } from "@/utils/formatDisplay";
import { ReportActivityChart } from "@/components/reports/ReportActivityChart";
import { ReportSalesChart } from "@/components/reports/ReportSalesChart";

function PeakLowSummary({ title, block }: { title: string; block: PeakLowBlock }) {
  return (
    <div className="report-peak-grid">
      <h4 className="report-subtitle">{title}</h4>
      <p className="report-muted" style={{ margin: "0 0 8px", fontSize: 13 }}>
        {block.basis}
      </p>
      <div className="report-peak-pair">
        <div className="report-peak-card peak">
          <strong>Peak</strong>
          {block.peak ? (
            <>
              <span className="report-period">{block.peak.period}</span>
              <span>
                Value: <strong>{block.peak.value.toFixed(2)}</strong>
              </span>
              <span className="report-muted">Tx: {block.peak.transactionCount}</span>
            </>
          ) : (
            <span className="report-muted">No data in range</span>
          )}
        </div>
        <div className="report-peak-card low">
          <strong>Low</strong>
          {block.low ? (
            <>
              <span className="report-period">{block.low.period}</span>
              <span>
                Value: <strong>{block.low.value.toFixed(2)}</strong>
              </span>
              <span className="report-muted">Tx: {block.low.transactionCount}</span>
            </>
          ) : (
            <span className="report-muted">No data in range</span>
          )}
        </div>
      </div>
    </div>
  );
}

function PurchaseTable({ rows }: { rows: ReportBucketPurchase[] }) {
  if (!rows.length) {
    return <p className="report-muted">No rows in this range.</p>;
  }
  return (
    <div className="report-table-wrap">
      <table className="report-table">
        <thead>
          <tr>
            <th>Period</th>
            <th>Transactions</th>
            <th>Amount received</th>
            <th>Buying total</th>
            <th>Weight (ct)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.period}>
              <td>{r.period}</td>
              <td>{r.transactionCount}</td>
              <td>Le {r.totalAmountReceived.toFixed(2)}</td>
              <td>Le {r.totalBuyingPrice.toFixed(2)}</td>
              <td>{r.totalWeightCarat.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SaleTable({ rows }: { rows: ReportBucketSale[] }) {
  if (!rows.length) {
    return <p className="report-muted">No rows in this range.</p>;
  }
  return (
    <div className="report-table-wrap">
      <table className="report-table">
        <thead>
          <tr>
            <th>Period</th>
            <th>Transactions</th>
            <th>Amount received</th>
            <th>Selling total</th>
            <th>Wt (g)</th>
            <th>Wt (ct)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.period}>
              <td>{r.period}</td>
              <td>{r.transactionCount}</td>
              <td>Le {r.totalAmountReceived.toFixed(2)}</td>
              <td>Le {r.totalSellingPrice.toFixed(2)}</td>
              <td>{r.totalWeightGram.toFixed(3)}</td>
              <td>{r.totalWeightCarat.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReportsScreen() {
  const { role } = useRole();
  const canRead = can(role, "reports:read");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<ReportsOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load(params?: { from?: string; to?: string }) {
    try {
      setLoading(true);
      setError("");
      const overview = await apiService.getReportsOverview(params);
      setData(overview);
    } catch {
      setError("Failed to load reports.");
      notifyError("Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canRead) return;
    load();
  }, [canRead]);

  function handleApply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const p: { from?: string; to?: string } = {};
    if (from) p.from = new Date(from).toISOString();
    if (to) p.to = new Date(to).toISOString();
    load(p);
  }

  if (!canRead) {
    return <AccessDenied message="Reports require a staff login." />;
  }

  return (
    <AppScreen
      title="Reports"
      description="Purchase and sales activity by day, ISO week, and calendar month. Peak and low use amount received or transaction count per period (UTC boundaries on the server)."
    >
      <FormCard
        variant="screen"
        title="Date range (optional)"
        description="Leave both empty for the default window, or set from / to and apply."
        onSubmit={handleApply}
      >
        <div className="form-grid--2col-sm">
          <FormInput type="date" placeholder="From" value={from} onChange={setFrom} />
          <FormInput type="date" placeholder="To" value={to} onChange={setTo} />
        </div>
        <FormButton label={loading ? "Loading…" : "Apply range"} loadingLabel="Loading…" loading={loading} />
        <button
          type="button"
          className="btn-ghost"
          style={{ justifySelf: "start" }}
          onClick={() => {
            setFrom("");
            setTo("");
            load();
          }}
        >
          Reset to last 365 days
        </button>
      </FormCard>

      {error ? <ScreenFeedback variant="error">{error}</ScreenFeedback> : null}

      {data ? (
        <>
          <ScreenSectionTitle>Active range</ScreenSectionTitle>
          <p className="report-muted" style={{ margin: "0 0 24px" }}>
            {formatDateUtc(data.range.from)} — {formatDateUtc(data.range.to)} (UTC)
          </p>

          <ScreenSectionTitle>Purchase reports</ScreenSectionTitle>
          <section className="report-section">
            <h3 className="report-subtitle">Daily</h3>
            <p className="report-muted" style={{ margin: "0 0 8px", fontSize: 13 }}>
              Bars: amount received · Line: transaction count
            </p>
            <ReportActivityChart
              rows={data.purchases.daily}
              barColor="#0d9488"
              lineColor="#134e4a"
              amountLabel="Amount received"
            />
            <PurchaseTable rows={data.purchases.daily} />
            <div className="report-peak-row">
              <PeakLowSummary title="By amount received" block={data.purchases.peakLow.daily.byAmountReceived} />
              <PeakLowSummary title="By transaction count" block={data.purchases.peakLow.daily.byTransactionCount} />
            </div>

            <h3 className="report-subtitle">Weekly</h3>
            <p className="report-muted" style={{ margin: "0 0 8px", fontSize: 13 }}>
              Bars: amount received · Line: transaction count
            </p>
            <ReportActivityChart
              rows={data.purchases.weekly}
              barColor="#0d9488"
              lineColor="#134e4a"
              amountLabel="Amount received"
            />
            <PurchaseTable rows={data.purchases.weekly} />
            <div className="report-peak-row">
              <PeakLowSummary title="By amount received" block={data.purchases.peakLow.weekly.byAmountReceived} />
              <PeakLowSummary title="By transaction count" block={data.purchases.peakLow.weekly.byTransactionCount} />
            </div>

            <h3 className="report-subtitle">Monthly</h3>
            <p className="report-muted" style={{ margin: "0 0 8px", fontSize: 13 }}>
              Bars: amount received · Line: transaction count
            </p>
            <ReportActivityChart
              rows={data.purchases.monthly}
              barColor="#0d9488"
              lineColor="#134e4a"
              amountLabel="Amount received"
            />
            <PurchaseTable rows={data.purchases.monthly} />
            <div className="report-peak-row">
              <PeakLowSummary title="By amount received" block={data.purchases.peakLow.monthly.byAmountReceived} />
              <PeakLowSummary title="By transaction count" block={data.purchases.peakLow.monthly.byTransactionCount} />
            </div>
          </section>

          <ScreenSectionTitle>Sales reports</ScreenSectionTitle>
          <section className="report-section">

            <h3 className="report-subtitle">Daily</h3>
            <p className="report-muted" style={{ margin: "0 0 8px", fontSize: 13 }}>
              Bars: selling total and amount received · Line: transaction count
            </p>
            <ReportSalesChart rows={data.sales.daily} />
            <SaleTable rows={data.sales.daily} />
            <div className="report-peak-row">
              <PeakLowSummary title="By amount received" block={data.sales.peakLow.daily.byAmountReceived} />
              <PeakLowSummary title="By transaction count" block={data.sales.peakLow.daily.byTransactionCount} />
            </div>

            <h3 className="report-subtitle">Weekly</h3>
            <p className="report-muted" style={{ margin: "0 0 8px", fontSize: 13 }}>
              Bars: selling total and amount received · Line: transaction count
            </p>
            <ReportSalesChart rows={data.sales.weekly} />
            <SaleTable rows={data.sales.weekly} />
            <div className="report-peak-row">
              <PeakLowSummary title="By amount received" block={data.sales.peakLow.weekly.byAmountReceived} />
              <PeakLowSummary title="By transaction count" block={data.sales.peakLow.weekly.byTransactionCount} />
            </div>

            <h3 className="report-subtitle">Monthly</h3>
            <p className="report-muted" style={{ margin: "0 0 8px", fontSize: 13 }}>
              Bars: selling total and amount received · Line: transaction count
            </p>
            <ReportSalesChart rows={data.sales.monthly} />
            <SaleTable rows={data.sales.monthly} />
            <div className="report-peak-row">
              <PeakLowSummary title="By amount received" block={data.sales.peakLow.monthly.byAmountReceived} />
              <PeakLowSummary title="By transaction count" block={data.sales.peakLow.monthly.byTransactionCount} />
            </div>
          </section>
        </>
      ) : null}
    </AppScreen>
  );
}
