"use client";

import { useSearchParams } from "next/navigation";
import { Download, Plus, Search, X } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { ConfirmDialog, TransactionDialog } from "@/components/forms";
import { useToast } from "@/components/toast";
import { Empty, Field, PageHeader, Status } from "@/components/ui";
import { STATUS_TONE, TX_CATEGORIES, type Tx } from "@/lib/data";
import { downloadCsv, fmtDate, money, signedMoney } from "@/lib/format";
import { useData } from "@/lib/client/store";

const RANGES = [{ v: "7", l: "Last 7 days" }, { v: "30", l: "Last 30 days" }, { v: "90", l: "Last 90 days" }, { v: "all", l: "All time" }];

function Details({ tx, onChange, onDelete, onClose }: { tx: Tx; onChange: (t: Tx) => void; onDelete: () => void; onClose: () => void }) {
  const toast = useToast();
  return (
    <aside className="card" aria-label="Transaction details" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
        <div><span className="overline">{tx.id}</span><div style={{ fontWeight: 600, fontSize: 16 }}>Transaction details</div></div>
        <button className="icon-btn" aria-label="Close details" onClick={onClose}><X size={18} /></button>
      </div>
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div className={tx.amt > 0 ? "num amt-in" : "num"} style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{signedMoney(tx.amt)}</div>
          <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><b style={{ fontWeight: 500 }}>{tx.name}</b><Status tone={STATUS_TONE[tx.status]}>{tx.status}</Status></div>
        </div>
        <dl style={{ display: "grid", gridTemplateColumns: "120px minmax(0,1fr)", gap: "10px 12px", margin: 0, fontSize: 13.5 }}>
          <dt className="muted">Description</dt><dd style={{ margin: 0 }}>{tx.memo}</dd>
          <dt className="muted">Date</dt><dd style={{ margin: 0 }}>{fmtDate(tx.date)}</dd>
          <dt className="muted">Payment method</dt><dd style={{ margin: 0 }}>{tx.method}</dd>
        </dl>
        <Field id="tx-cat" label="Category">{(a) => <select {...a} className="select" value={tx.cat} onChange={(e) => { onChange({ ...tx, cat: e.target.value }); toast(`Category changed to ${e.target.value}`); }}>{TX_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>}</Field>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "14px 20px", borderTop: "1px solid var(--line)", marginTop: "auto" }}>
        <button className="btn primary" disabled={tx.status === "Reviewed"} onClick={() => { onChange({ ...tx, status: "Reviewed" }); toast(`${tx.id} marked as reviewed`); }}>
          {tx.status === "Reviewed" ? "Reviewed" : "Mark as reviewed"}
        </button>
        <button className="btn text-danger" style={{ marginLeft: "auto" }} onClick={onDelete}>Delete</button>
      </div>
    </aside>
  );
}

function TransactionsInner() {
  const params = useSearchParams();
  const toast = useToast();
  const { transactions: list, addTransaction, updateTransaction, deleteTransaction } = useData();
  const [tab, setTab] = useState<"all" | "income" | "expense">("all");
  const [q, setQ] = useState("");
  const [range, setRange] = useState("all");
  const [cat, setCat] = useState("all");
  const [sel, setSel] = useState<string | null>(params.get("tx"));
  const [dialog, setDialog] = useState<"add" | "delete" | null>(null);

  const rows = useMemo(() => {
    const days = range === "all" ? Infinity : +range;
    const t0 = Date.now();
    const s = q.trim().toLowerCase();
    return list.filter((t) =>
      (tab === "all" || (tab === "income" ? t.amt > 0 : t.amt < 0)) &&
      (cat === "all" || t.cat === cat) &&
      (t0 - new Date(t.date + "T12:00:00").getTime()) / 864e5 <= days &&
      (!s || `${t.name} ${t.memo} ${t.id} ${t.cat} ${t.method}`.toLowerCase().includes(s))
    );
  }, [list, tab, q, range, cat]);

  const selected = list.find((t) => t.id === sel) ?? null;
  const moneyIn = rows.filter((t) => t.amt > 0).reduce((a, t) => a + t.amt, 0);
  const moneyOut = rows.filter((t) => t.amt < 0).reduce((a, t) => a + t.amt, 0);
  const count = (k: typeof tab) => list.filter((t) => k === "all" || (k === "income" ? t.amt > 0 : t.amt < 0)).length;
  const filtered = q || cat !== "all" || range !== "all" || tab !== "all";
  const clear = () => { setQ(""); setCat("all"); setRange("all"); setTab("all"); };
  const exportCsv = () => downloadCsv("Transactions.csv", [["ID", "Date", "Name", "Memo", "Category", "Method", "Status", "Amount"], ...rows.map((t) => [t.id, t.date, t.name, t.memo, t.cat, t.method, t.status, t.amt])]);

  return (
    <div className="page">
      <PageHeader eyebrow="Financial tools" title="Transactions" sub="Every payment in and out, with status and payment method."
        actions={<><button className="btn" disabled={rows.length === 0} onClick={exportCsv}><Download size={16} />Export CSV</button><button className="btn primary" onClick={() => setDialog("add")}><Plus size={16} />Add transaction</button></>} />

      <div className="grid" style={{ gridTemplateColumns: selected ? "minmax(0,1fr) minmax(0,360px)" : "minmax(0,1fr)", alignItems: "start" }}>
        <section className="card" style={{ overflow: "hidden" }}>
          <div className="tabs" role="tablist" aria-label="Transaction type">
            {([["all", "All"], ["income", "Income"], ["expense", "Expenses"]] as const).map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} className="tab-btn" onClick={() => setTab(k)}>{l} <span className="mono" style={{ fontSize: 11, color: "var(--faint)" }}>{count(k)}</span></button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
            <div className="search" style={{ flex: 1, minWidth: 200 }}><Search size={16} /><label htmlFor="tx-q" className="sr-only">Search transactions</label><input id="tx-q" type="search" className="input pill-input" placeholder="Search by name, ID or memo" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <label htmlFor="tx-range" className="sr-only">Date range</label>
            <select id="tx-range" className="select pill-input" style={{ width: "auto" }} value={range} onChange={(e) => setRange(e.target.value)}>{RANGES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}</select>
            <label htmlFor="tx-cat-filter" className="sr-only">Category</label>
            <select id="tx-cat-filter" className="select pill-input" style={{ width: "auto" }} value={cat} onChange={(e) => setCat(e.target.value)}><option value="all">All categories</option>{TX_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          {list.length === 0 ? (
            <Empty icon={<Plus size={18} />} title="No transactions yet." action={<button className="btn primary" onClick={() => setDialog("add")}>Add your first transaction</button>}>
              Everything on your dashboard is built from the transactions you add here.
            </Empty>
          ) : rows.length === 0 ? (
            <Empty icon={<Search size={18} />} title="No transactions match these filters." action={filtered ? <button className="btn" onClick={clear}>Clear filters</button> : undefined}>
              {q ? `Nothing matches “${q}”. Check the spelling, or try a wider date range.` : "Try a wider date range or another category."}
            </Empty>
          ) : (
            <div className="table-wrap">
              <table className="t" style={{ minWidth: 680 }}>
                <thead><tr><th>Transaction</th><th>Category</th><th>Date</th><th>Payment method</th><th className="r">Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {rows.map((t) => (
                    <tr key={t.id} className={t.id === sel ? "click sel" : "click"} onClick={() => setSel(t.id)}>
                      <td><button className="link-btn" style={{ color: "var(--ink)", fontSize: 13.5 }} onClick={(e) => { e.stopPropagation(); setSel(t.id); }}>{t.name}</button><div className="sub">{t.id} · {t.memo}</div></td>
                      <td>{t.cat}</td>
                      <td className="num">{fmtDate(t.date)}</td>
                      <td className="sub">{t.method}</td>
                      <td className={t.amt > 0 ? "num r amt-in" : "num r"}>{signedMoney(t.amt)}</td>
                      <td><Status tone={STATUS_TONE[t.status]}>{t.status}</Status></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <footer style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderTop: "1px solid var(--line)", fontSize: 12.5, color: "var(--muted)" }}>
            <div>Showing <b>{rows.length}</b> of <b>{list.length}</b> transactions</div>
            <div style={{ display: "flex", gap: 16 }}>
              <span>Money in: <b className="num amt-in">{money(moneyIn)}</b></span>
              <span>Money out: <b className="num">{money(moneyOut)}</b></span>
            </div>
          </footer>
        </section>

        {selected && (
          <Details
            tx={selected}
            onChange={(updated) => updateTransaction(updated)}
            onDelete={() => setDialog("delete")}
            onClose={() => setSel(null)}
          />
        )}
      </div>

      {dialog === "add" && <TransactionDialog onClose={() => setDialog(null)} onAdd={(t) => addTransaction(t)} />}
      {dialog === "delete" && selected && (
        <ConfirmDialog
          title={`Delete ${selected.id}?`}
          body={`This removes the ${money(selected.amt)} transaction from ${selected.name}. You can’t undo this.`}
          confirmLabel="Delete transaction"
          danger
          onClose={() => setDialog(null)}
          onConfirm={() => {
            deleteTransaction(selected.id);
            setSel(null);
            toast(`${selected.id} deleted`);
          }}
        />
      )}
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="page"><PageHeader eyebrow="Financial tools" title="Transactions" sub="Loading…" /></div>}>
      <TransactionsInner />
    </Suspense>
  );
}
