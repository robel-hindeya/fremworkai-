"use client";

import Link from "next/link";
import { Plus, Wallet } from "lucide-react";
import { useState } from "react";
import { BudgetDialog } from "@/components/forms";
import { Banner, Empty, PageHeader, Progress, Status } from "@/components/ui";
import { money } from "@/lib/format";
import { useData } from "@/lib/client/store";

export default function Budgets() {
  const { budgets: cats, addBudget, metrics } = useData();
  const [creating, setCreating] = useState(false);
  const B = cats.reduce((a, c) => a + c.budget, 0), S = cats.reduce((a, c) => a + c.oct, 0);
  const over = cats.filter((c) => c.oct > c.budget);
  const sorted = [...cats].sort((a, b) => b.oct / b.budget - a.oct / a.budget);

  return (
    <div className="page">
      <PageHeader eyebrow="Financial tools" title="Budgets" sub={`${metrics?.periodLabel ?? "This month"} · monthly budgets by category.`}
        actions={<button className="btn primary" onClick={() => setCreating(true)}><Plus size={16} />Create budget</button>} />

      {cats.length === 0 ? (
        <div className="card"><Empty icon={<Wallet size={18} />} title="No budgets yet." action={<button className="btn primary" onClick={() => setCreating(true)}>Create your first budget</button>}>Set a monthly limit for a category and Fremwork tracks your spending against it.</Empty></div>
      ) : (
      <>
      <section className="card">
        <div className="grid cols-4" style={{ gap: 0 }}>
          {[["Total budget", money(B), `${cats.length} categories`], ["Total spent", money(S), `${B ? ((S / B) * 100).toFixed(1) : 0}% of budget`], ["Remaining", money(B - S), "This month"], ["Over budget", `${over.length} categories`, `${money(over.reduce((a, c) => a + c.oct - c.budget, 0))} over in total`]].map(([l, v, n], i) => (
            <div key={l} style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
              <small className="muted" style={{ fontSize: 12 }}>{l}</small>
              <b className="num" style={{ fontSize: 20, fontWeight: 600, color: i === 3 && over.length ? "var(--neg)" : undefined }}>{v}</b>
              <small className="muted" style={{ fontSize: 12 }}>{n}</small>
            </div>
          ))}
        </div>
        <div style={{ padding: "0 20px 20px" }}><Progress value={B ? (S / B) * 100 : 0} tone={S > B ? "over" : S / B > 0.9 ? "near" : undefined} /></div>
      </section>
      {over.length > 0 && (
        <Banner tone="err" title={`${over.map((c) => c.k).join(" and ")} ${over.length > 1 ? "are" : "is"} over budget.`} action={<Link className="btn sm" href="/chat">Ask for a plan</Link>}>
          {over.map((c) => `${c.k} is ${money(c.oct - c.budget)} over (${(((c.oct - c.budget) / c.budget) * 100).toFixed(1)}%)`).join("; ")}.
        </Banner>
      )}

      <section className="card">
        <div className="card-head">
          <div><h2>Category budgets</h2><p>Spent vs budget, sorted by how much is used</p></div>
          <div className="legend"><span><i style={{ background: "#0A0A0A" }} />On track</span><span><i style={{ background: "#F5A524" }} />Above 90%</span><span><i style={{ background: "#E5484D" }} />Over</span></div>
        </div>
        {sorted.map((c) => {
          const spent = c.oct;
          const r = spent / c.budget;
          const tone = r > 1 ? "over" : r >= 0.9 ? "near" : undefined;
          return (
            <div key={c.k} style={{ display: "grid", gridTemplateColumns: "minmax(140px,1.2fr) minmax(140px,2fr) 140px 140px", gap: "8px 20px", alignItems: "center", padding: "14px 20px", borderTop: "1px solid var(--mist)" }} className="budget-row">
              <div style={{ fontWeight: 500 }}>{c.k}<small className="muted" style={{ display: "block", fontWeight: 400, fontSize: 12 }}>{c.owner}</small></div>
              <Progress value={r * 100} tone={tone} />
              <div className="num" style={{ textAlign: "right", fontSize: 13.5 }}>{money(spent)}<small className="muted" style={{ display: "block", fontSize: 12 }}>of {money(c.budget)}</small></div>
              <div>{r > 1 ? <Status tone="err">Over by {money(spent - c.budget)}</Status> : r >= 0.9 ? <Status tone="warn">{Math.round(r * 100)}% used</Status> : <Status tone="ok">On track</Status>}</div>
            </div>
          );
        })}
      </section>
      </>
      )}
      <style>{`@media (max-width: 760px) { .budget-row { grid-template-columns: minmax(0,1fr) auto !important; } .budget-row > :nth-child(2) { grid-column: 1 / -1; order: 3; } .budget-row > :nth-child(4) { display: none; } }`}</style>
      {creating && (
        <BudgetDialog
          onClose={() => setCreating(false)}
          onAdd={(b) => addBudget(b)}
        />
      )}
    </div>
  );
}
