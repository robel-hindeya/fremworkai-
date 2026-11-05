"use client";

import Link from "next/link";
import { BarChart3, Download } from "lucide-react";
import { useState } from "react";
import { Chart, DONUT_COLORS, Donut, Legend } from "@/components/charts";
import { Change, Empty, PageHeader, Seg, Status } from "@/components/ui";
import { downloadCsv, kfmt, money, pct } from "@/lib/format";
import { useData } from "@/lib/client/store";

export default function Analytics() {
  const { metrics, loading } = useData();
  const [range, setRange] = useState(12);

  const header = (actions?: React.ReactNode) => <PageHeader eyebrow="Financial tools" title="Analytics" sub="Revenue, spending and profitability over time." actions={actions} />;

  if (loading) return <div className="page">{header()}</div>;
  if (!metrics?.hasData) {
    return (
      <div className="page">
        {header()}
        <div className="card"><Empty icon={<BarChart3 size={18} />} title="Nothing to analyze yet." action={<Link href="/transactions" className="btn primary">Add transactions</Link>}>Charts appear here once you have transactions in your ledger.</Empty></div>
      </div>
    );
  }

  const { months: MONTHS, rev: REV, exp: EXP, periodLabel } = metrics;
  const idx = MONTHS.map((_, i) => i).slice(-range);
  const lab = idx.map((i) => MONTHS[i]);
  const R = idx.map((i) => REV[i]), E = idx.map((i) => EXP[i]);
  const N = R.map((r, j) => r - E[j]);
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const avg = sum(R) / (R.length || 1);
  const margins = R.map((r, j) => (r ? (N[j] / r) * 100 : 0));

  const groups = Object.entries(metrics.expenseByCat.current).map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
  const tot = groups.reduce((a, c) => a + c.v, 0);

  const exportCsv = () =>
    downloadCsv("Analytics.csv", [
      ["Month", "Revenue", "Expenses", "Net profit"],
      ...idx.map((i) => [MONTHS[i], REV[i], EXP[i], REV[i] - EXP[i]]),
    ]);

  return (
    <div className="page">
      {header(<>
        <Seg label="Date range" value={range} onChange={setRange} options={[{ v: 3, l: "3M" }, { v: 6, l: "6M" }, { v: 12, l: "12M" }]} />
        <button className="btn" onClick={exportCsv}><Download size={16} />Export CSV</button>
      </>)}

      <section className="card">
        <div className="grid cols-3" style={{ gap: 0, borderBottom: "1px solid var(--line)" }}>
          {[["Revenue", money(sum(R)), `${lab[0]} – ${lab.at(-1)}`], ["Expenses", money(sum(E)), sum(R) ? `${((sum(E) / sum(R)) * 100).toFixed(1)}% of revenue` : "No revenue in this period"], ["Net profit", money(sum(N)), sum(R) ? `${((sum(N) / sum(R)) * 100).toFixed(1)}% net margin` : "No revenue in this period"]].map(([l, v, n]) => (
            <div key={l} style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 4, borderRight: "1px solid var(--mist)" }}>
              <small className="muted" style={{ fontSize: 12 }}>{l}</small><b className="num" style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>{v}</b><small className="muted" style={{ fontSize: 12 }}>{n}</small>
            </div>
          ))}
        </div>
        <div className="card-head" style={{ paddingBottom: 0 }}><div><h2>Revenue analysis</h2><p>Monthly revenue, average {money(Math.round(avg))} a month</p></div><Legend items={[{ name: "Revenue", color: "#0A0A0A" }, { name: "Average", color: "#9E9E9A", line: true }]} /></div>
        <div style={{ padding: "10px 16px 16px 6px" }}>
          <Chart height={250} label="Revenue trend" labels={lab} series={[{ name: "Revenue", values: R, color: "#0A0A0A", kind: "line", area: true }, { name: "Average", values: R.map(() => Math.round(avg)), color: "#9E9E9A", kind: "line", dashed: true }]} />
        </div>
      </section>

      <div className="grid cols-2">
        <section className="card">
          <div className="card-head" style={{ paddingBottom: 0 }}><div><h2>Expense breakdown</h2><p>{periodLabel} by category</p></div></div>
          {groups.length === 0 ? (
            <Empty title="No expenses this month." />
          ) : (
            <div style={{ display: "flex", gap: 24, alignItems: "center", padding: "16px 20px 20px", flexWrap: "wrap" }}>
              <Donut segments={groups} center={kfmt(tot)} caption="total spend" />
              <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 8 }}>
                {groups.map((s, i) => (
                  <div key={s.k} style={{ display: "grid", gridTemplateColumns: "12px minmax(0,1fr) auto 52px", gap: 10, alignItems: "center", fontSize: 13.5 }}>
                    <i style={{ width: 10, height: 10, borderRadius: 3, background: DONUT_COLORS[i % DONUT_COLORS.length] }} /><span>{s.k}</span><span className="num">{money(s.v)}</span><span className="num muted" style={{ textAlign: "right" }}>{((s.v / tot) * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
        <section className="card">
          <div className="card-head" style={{ paddingBottom: 0 }}><div><h2>Profitability</h2><p>Net margin by month</p></div><Status tone={(margins.at(-1) || 0) >= 0 ? "ok" : "err"}>{(margins.at(-1) || 0).toFixed(1)}% latest</Status></div>
          <div style={{ padding: "14px 16px 16px 6px" }}>
            <Chart height={220} base="auto" label="Net margin trend" labels={lab} fmt={(n) => n.toFixed(1) + "%"} yfmt={(n) => Math.round(n) + "%"} series={[{ name: "Net margin", values: margins, color: "#3D5AFE", kind: "line", area: true }]} />
          </div>
        </section>
      </div>

      <section className="card" style={{ overflow: "hidden" }}>
        <div className="card-head"><div><h2>Monthly comparison</h2><p>Month-over-month change for each line</p></div></div>
        <div className="table-wrap">
          <table className="t num" style={{ minWidth: 640 }}>
            <thead><tr><th>Month</th><th className="r">Revenue</th><th className="r">MoM</th><th className="r">Expenses</th><th className="r">MoM</th><th className="r">Net profit</th><th className="r">Margin</th></tr></thead>
            <tbody>
              {idx.slice().reverse().map((i) => (
                <tr key={i}>
                  <td>{MONTHS[i]}</td><td className="r">{money(REV[i])}</td><td className="r">{i ? <Change value={pct(REV[i], REV[i - 1])} /> : "—"}</td>
                  <td className="r">{money(EXP[i])}</td><td className="r">{i ? <Change value={pct(EXP[i], EXP[i - 1])} invert /> : "—"}</td>
                  <td className="r">{money(REV[i] - EXP[i])}</td><td className="r">{REV[i] ? `${(((REV[i] - EXP[i]) / REV[i]) * 100).toFixed(1)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
