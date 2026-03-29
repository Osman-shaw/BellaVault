"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReportBucketSale } from "@/services/apiService";

type Props = {
  rows: ReportBucketSale[];
  emptyLabel?: string;
};

const sellBar = "#c2410c";
const receivedBar = "#fb923c";
const txLine = "#475569";

export function ReportSalesChart({ rows, emptyLabel = "No data in range for this chart." }: Props) {
  if (!rows.length) {
    return <p className="report-muted">{emptyLabel}</p>;
  }

  const data = rows.map((r) => ({
    period: r.period,
    selling: r.totalSellingPrice,
    received: r.totalAmountReceived,
    tx: r.transactionCount,
  }));

  return (
    <div className="report-chart-wrap">
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 12, right: 16, left: 4, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={{ stroke: "#cbd5e1" }}
            axisLine={{ stroke: "#cbd5e1" }}
            angle={rows.length > 10 ? -40 : 0}
            textAnchor={rows.length > 10 ? "end" : "middle"}
            height={rows.length > 10 ? 72 : 28}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="amt"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={{ stroke: "#cbd5e1" }}
            axisLine={{ stroke: "#cbd5e1" }}
            tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`)}
            width={48}
            label={{ value: "Le", angle: 0, position: "insideTopLeft", fill: "#94a3b8", fontSize: 11 }}
          />
          <YAxis
            yAxisId="tx"
            orientation="right"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={{ stroke: "#cbd5e1" }}
            axisLine={{ stroke: "#cbd5e1" }}
            allowDecimals={false}
            width={36}
            label={{ value: "Tx", angle: 0, position: "insideTopRight", fill: "#94a3b8", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
            }}
            formatter={(value: number | string, name: string) => {
              const n = typeof value === "number" ? value : Number(value);
              if (name === "selling" || name === "Selling total") return [`Le ${n.toFixed(2)}`, "Selling total"];
              if (name === "received" || name === "Amount received") return [`Le ${n.toFixed(2)}`, "Amount received"];
              return [n, "Transactions"];
            }}
            labelFormatter={(label) => `Period: ${label}`}
          />
          <Legend wrapperStyle={{ paddingTop: 12 }} />
          <Bar yAxisId="amt" dataKey="selling" name="Selling total" fill={sellBar} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar yAxisId="amt" dataKey="received" name="Amount received" fill={receivedBar} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Line
            yAxisId="tx"
            type="monotone"
            dataKey="tx"
            name="Transactions"
            stroke={txLine}
            strokeWidth={2}
            dot={{ r: 3, strokeWidth: 1, fill: "#fff" }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
