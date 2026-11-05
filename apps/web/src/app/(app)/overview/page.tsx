"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Search } from "lucide-react";
import { useState } from "react";
import { Chart, Legend, Sparkline } from "@/components/charts";
import { useChat } from "@/components/chat-store";
import { TransactionDialog } from "@/components/forms";
import { Change, Empty, Mark, PageHeader, Seg, Status } from "@/components/ui";
import { STATUS_TONE } from "@/lib/data";
import { fmtDate, kfmt, money, pct, signedMoney } from "@/lib/format";
import { useData } from "@/lib/client/store";

const QUESTIONS = [
  "How is my business doing this month?",
  "Where is most of my money going?",
  "How long will my cash last?",
  "Am I over budget anywhere?",
];

export default function Overview() {
  const [range, setRange] = useState(12);
  const [adding, setAdding] = useState(false);
  const { send } = useChat();
  const { transactions, metrics, user, loading, addTransaction } = useData();
  const router = useRouter();
  const ask = (q: string) => router.push(`/chat/${send(null, q, [])}`);

  const hr = new Date().getHours();
  const greet = hr < 5 ? "Working late" : hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
  const header = (
    <PageHeader
      eyebrow={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
      title={user ? `${greet}, ${user.name.split(" ")[0]}` : greet}
      actions={<Link href="/search" className="btn" style={{ color: "var(--muted)", fontWeight: 400 }}><Search size={16} />Search</Link>}
    />
  );
  const dialog = adding && <TransactionDialog onClose={() => setAdding(false)} onAdd={(t) => addTransaction(t)} />;

  if (loading) return <div className="page">{header}</div>;

  if (!metrics?.hasData) {
    return (
      <div className="page">
        {header}
        <div className="card">
          <Empty
            icon={<ArrowLeftRight size={18} />}
            title="Your dashboard is ready for your numbers."
            action={<div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}><button className="btn primary" onClick={() => setAdding(true)}>Add a transaction</button><Link href="/chat" className="btn">Tell Fremwork AI</Link></div>}
          >
            Add your first transaction and this page fills in with your revenue, expenses and cash. You can also tell the AI in chat, like “Record a $120 expense for Figma”.
          </Empty>
        </div>
        {dialog}
      </div>
    );
  }

  const { rev: REV, exp: EXP, net: NET, months: MONTHS, cash, summary, periodLabel, previousLabel } = metrics;
  const i = REV.length - 1;
  const lab = MONTHS.slice(-range), rv = REV.slice(-range), ex = EXP.slice(-range);
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const kpis = [
    { l: "Total revenue", v: REV, c: "#0A0A0A" },
    { l: "Total expenses", v: EXP, c: "#3D5AFE", inv: true },
    { l: "Net profit", v: NET, c: "#0A0A0A" },
  ];

  return (
    <div className="page">
      {header}
      <div className="grid cols-4">
        {kpis.map((k) => (
          <section key={k.l} className="card" style={{ padding: "18px 18px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>{k.l}</span><Change value={pct(k.v[i], k.v[i - 1])} invert={k.inv} /></div>
            <div className="num" style={{ fontSize: 26, letterSpacing: "-0.02em", fontWeight: 600, lineHeight: 1.1 }}>{money(k.v[i])}</div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
              <small className="muted" style={{ fontSize: 12, lineHeight: 1.35 }}>{periodLabel}<br />vs {money(k.v[i - 1])} in {previousLabel}</small>
              <Sparkline values={k.v.slice(-8)} color={k.c} />
            </div>
          </section>
        ))}
        <section className="card" style={{ padding: "18px 18px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>Cash on hand</span>
          <div className="num" style={{ fontSize: 26, letterSpacing: "-0.02em", fontWeight: 600, lineHeight: 1.1 }}>{money(cash)}</div>
          <small className="muted" style={{ fontSize: 12, lineHeight: 1.35 }}>{summary.runwayMonths === null ? "All cleared transactions" : `About ${summary.runwayMonths} months of expenses`}</small>
        </section>
      </div>

      <div className="grid cols-main">
        <div className="grid" style={{ alignContent: "start" }}>
          <section className="card">
            <div className="card-head" style={{ paddingBottom: 0 }}>
              <div><h2>Financial performance</h2><p>Revenue vs expenses by month</p></div>
              <Seg label="Date range" value={range} onChange={setRange} options={[{ v: 3, l: "3M" }, { v: 6, l: "6M" }, { v: 12, l: "12M" }]} />
            </div>
            <div style={{ padding: "14px 20px 4px" }}>
              <Legend items={[{ name: `Revenue ${kfmt(sum(rv))}`, color: "#0A0A0A" }, { name: `Expenses ${kfmt(sum(ex))}`, color: "#3D5AFE" }, { name: `Net profit ${kfmt(sum(rv) - sum(ex))}`, color: "#9E9E9A", line: true }]} />
            </div>
            <div style={{ padding: "6px 16px 14px 8px" }}>
              <Chart height={260} label="Monthly revenue versus expenses" labels={lab} series={[{ name: "Revenue", values: rv, color: "#0A0A0A" }, { name: "Expenses", values: ex, color: "#3D5AFE" }, { name: "Net profit", values: rv.map((r, j) => r - ex[j]), color: "#9E9E9A", kind: "line" }]} />
            </div>
          </section>
          <section className="card">
            <div className="card-head">
              <div><h2>Recent transactions</h2><p>Latest activity</p></div>
              <Link href="/transactions" className="btn sm">View all →</Link>
            </div>
            <div className="table-wrap">
              <table className="t" style={{ minWidth: 560 }}>
                <thead><tr><th>Transaction</th><th>Category</th><th>Date</th><th className="r">Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {transactions.slice(0, 6).map((t) => (
                    <tr key={t.id} className="click" onClick={() => router.push(`/transactions?tx=${t.id}`)}>
                      <td><Link href={`/transactions?tx=${t.id}`} style={{ color: "inherit", textDecoration: "none", fontWeight: 500 }}>{t.name}</Link><div className="sub">{t.memo}</div></td>
                      <td>{t.cat}</td>
                      <td className="num">{fmtDate(t.date)}</td>
                      <td className={t.amt > 0 ? "r num amt-in" : "r num"}>{signedMoney(t.amt)}</td>
                      <td><Status tone={STATUS_TONE[t.status]}>{t.status}</Status></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <section className="card">
          <div className="card-head" style={{ paddingBottom: 10 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}><Mark /><div><h2>Ask Fremwork AI</h2><p>Answers come from your ledger</p></div></div>
          </div>
          {QUESTIONS.map((q) => (
            <div key={q} style={{ padding: "12px 20px", borderTop: "1px solid var(--mist)" }}>
              <button className="link-btn" style={{ textAlign: "left", fontSize: 14 }} onClick={() => ask(q)}>{q}</button>
            </div>
          ))}
        </section>
      </div>
      {dialog}
    </div>
  );
}
