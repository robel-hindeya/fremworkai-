"use client";

import Link from "next/link";
import { Download, FileText, Plus, Scale, TrendingUp, Wallet } from "lucide-react";
import { useState } from "react";
import { Empty, PageHeader } from "@/components/ui";
import { downloadCsv, money } from "@/lib/format";
import { useData } from "@/lib/client/store";

type Line = ["sec" | "ind" | "tot" | "grand", string, string?];
const TYPES = [
  { k: "pl", t: "Profit & Loss", d: "Revenue, costs and net profit for the period", icon: Scale },
  { k: "rev", t: "Revenue Report", d: "Revenue by category", icon: TrendingUp },
  { k: "exp", t: "Expense Report", d: "Spending by category against budget", icon: Wallet },
] as const;

const byAmount = (r: Record<string, number>) => Object.entries(r).sort((a, b) => b[1] - a[1]);
const total = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

export default function Reports() {
  const { metrics, budgets, loading } = useData();
  const [sel, setSel] = useState<(typeof TYPES)[number]["k"]>("pl");
  const [when, setWhen] = useState<"current" | "previous">("current");
  const cur = TYPES.find((t) => t.k === sel)!;
  const header = <PageHeader eyebrow="Workspace" title="Financial reports" sub="Statements built from your ledger." actions={<Link className="btn primary" href="/chat"><Plus size={16} />Ask the AI</Link>} />;

  if (loading) return <div className="page">{header}</div>;
  if (!metrics?.hasData) {
    return <div className="page">{header}<div className="card"><Empty icon={<FileText size={18} />} title="No reports yet." action={<Link href="/transactions" className="btn primary">Add transactions</Link>}>Reports are built from your transactions, so they’ll appear once you’ve added some.</Empty></div></div>;
  }

  const period = when === "current" ? metrics.periodLabel : metrics.previousLabel;
  const income = metrics.incomeByCat[when];
  const expenses = metrics.expenseByCat[when];
  const net = total(income) - total(expenses);

  const lines: Line[] =
    sel === "rev"
      ? [["sec", "By category"], ...byAmount(income).map(([k, v]): Line => ["ind", k, money(v)]), ["grand", "Total revenue", money(total(income))]]
      : sel === "exp"
      ? [["sec", "Category · actual / budget"], ...byAmount(expenses).map(([k, v]): Line => {
          const b = budgets.find((x) => x.k.toLowerCase() === k.toLowerCase());
          return ["ind", b && v > b.budget ? `${k} · over` : k, b ? `${money(v)} / ${money(b.budget)}` : money(v)];
        }), ["grand", "Total expenses", money(total(expenses))]]
      : [["sec", "Revenue"], ...byAmount(income).map(([k, v]): Line => ["ind", k, money(v)]), ["tot", "Total revenue", money(total(income))], ["sec", "Expenses"], ...byAmount(expenses).map(([k, v]): Line => ["ind", k, `(${money(v)})`]), ["tot", "Total expenses", `(${money(total(expenses))})`], ["grand", "Net profit", money(net)]];

  return (
    <div className="page">
      {header}
      <div className="grid" style={{ gridTemplateColumns: "minmax(0,340px) minmax(0,1fr)", alignItems: "start" }} id="reports-grid">
        <div role="group" aria-label="Report types" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {TYPES.map((t) => (
            <button key={t.k} type="button" aria-pressed={sel === t.k} onClick={() => setSel(t.k)} className="card" style={{ display: "flex", gap: 12, padding: 14, textAlign: "left", alignItems: "flex-start", borderRadius: 12, borderColor: sel === t.k ? "var(--ink)" : undefined, boxShadow: sel === t.k ? "0 0 0 1px var(--ink)" : undefined }}>
              <span className="ic-box"><t.icon size={18} /></span>
              <span><b style={{ display: "block", fontWeight: 500 }}>{t.t}</b><small className="muted" style={{ fontSize: 12.5 }}>{t.d}</small></span>
            </button>
          ))}
        </div>
        <section className="card" style={{ overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label htmlFor="r-period" className="overline">Period</label>
              <select id="r-period" className="select pill-input" style={{ width: "auto", height: 34 }} value={when} onChange={(e) => setWhen(e.target.value as typeof when)}>
                <option value="current">{metrics.periodLabel}</option><option value="previous">{metrics.previousLabel}</option>
              </select>
            </div>
            <button className="btn sm" onClick={() => downloadCsv(`${cur.t.replace(/[^A-Za-z]+/g, "_")}_${period.replace(/ /g, "_")}.csv`, lines.map(([, a, b]) => [a, b ?? ""]))}><Download size={14} />CSV</button>
          </div>
          <div className="doc">
            <div className="doc-head">
              <div><h2>{cur.t}</h2><p className="muted" style={{ margin: "2px 0 0", fontSize: 13 }}>{period} · USD</p></div>
            </div>
            <table className="st"><tbody>{lines.map(([c, a, b], i) => <tr key={i} className={c}><td>{a}</td><td className="r">{b ?? ""}</td></tr>)}</tbody></table>
            <p className="muted" style={{ fontSize: 12, margin: "16px 0 0" }}>Prepared by Fremwork from your ledger. Unaudited.</p>
          </div>
        </section>
      </div>
      <style>{`@media (max-width: 980px) { #reports-grid { grid-template-columns: minmax(0,1fr) !important; } }`}</style>
    </div>
  );
}
