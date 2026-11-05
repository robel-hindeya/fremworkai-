"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, FileText, Folder, MessageSquare, Search as SearchIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useChat } from "@/components/chat-store";
import { Empty } from "@/components/ui";
import { fmtDate, signedMoney } from "@/lib/format";
import { useData } from "@/lib/client/store";

const REPORTS = [["Profit & Loss", "Revenue, costs and net profit"], ["Revenue Report", "Revenue by category"], ["Expense Report", "Spending by category against budget"]];

function Hl({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark style={{ background: "#E5E9FF", color: "inherit", borderRadius: 3 }}>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return <section className="card" style={{ overflow: "hidden" }}><h2 style={{ margin: 0, padding: "16px 18px 8px", fontSize: 15, fontWeight: 500 }}>{title}</h2>{children}</section>;
}

export default function SearchPage() {
  const [q, setQ] = useState("");
  const { conversations, send } = useChat();
  const { transactions, projects } = useData();
  const router = useRouter();
  const s = q.trim().toLowerCase();
  const m = (t: string) => t.toLowerCase().includes(s);
  const chats = s ? conversations.filter((c) => m(c.title) || c.messages.some((x) => x.role === "user" && m(x.text))) : [];
  const txs = s ? transactions.filter((t) => m(`${t.name} ${t.memo} ${t.cat} ${t.id}`)).slice(0, 8) : [];
  const reps = s ? REPORTS.filter(([a, b]) => m(a + " " + b)) : [];
  const projs = s ? projects.filter((p) => m(p.name + " " + p.desc)) : [];
  const total = chats.length + txs.length + reps.length + projs.length;

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div>
        <span className="overline">Workspace</span>
        <h1 style={{ margin: "4px 0 16px", fontSize: 28, letterSpacing: "-0.02em", fontWeight: 600 }}>Search</h1>
        <div className="search"><SearchIcon size={18} /><label htmlFor="global-q" className="sr-only">Search everything</label>
          <input id="global-q" type="search" autoFocus className="input" style={{ height: 52, fontSize: 16, paddingLeft: 44 }} placeholder="Search conversations, transactions, reports and projects" value={q} onChange={(e) => setQ(e.target.value)} maxLength={200} />
        </div>
      </div>
      {!s ? (
        <Group title="Try searching for">
          {["Software", "Payroll", "Profit & Loss", "Travel"].map((t) => <button key={t} className="list-row" onClick={() => setQ(t)}><SearchIcon size={18} color="var(--faint)" /><span className="main"><b>{t}</b></span></button>)}
        </Group>
      ) : total === 0 ? (
        <div className="card"><Empty icon={<SearchIcon size={18} />} title={`Nothing matches “${q.trim()}”.`} action={<button className="btn primary" onClick={() => router.push(`/chat/${send(null, q.trim(), [])}`)}>Ask Fremwork instead</button>}>Check the spelling, or try a payee, category or report name.</Empty></div>
      ) : (
        <>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>{total} result{total > 1 ? "s" : ""} for “{q.trim()}”</p>
          {chats.length > 0 && <Group title="Conversations">{chats.map((c) => <Link key={c.id} href={`/chat/${c.id}`} className="list-row"><MessageSquare size={18} color="var(--faint)" /><span className="main"><b><Hl text={c.title} q={s} /></b></span></Link>)}</Group>}
          {txs.length > 0 && <Group title="Transactions">{txs.map((t) => <Link key={t.id} href={`/transactions?tx=${t.id}`} className="list-row"><ArrowLeftRight size={18} color="var(--faint)" /><span className="main"><b><Hl text={`${t.name} · ${t.memo}`} q={s} /></b><small>{t.id} · {t.cat} · {fmtDate(t.date)}</small></span><span className={t.amt > 0 ? "num amt-in" : "num"}>{signedMoney(t.amt)}</span></Link>)}</Group>}
          {reps.length > 0 && <Group title="Reports">{reps.map(([a, b]) => <Link key={a} href="/reports" className="list-row"><FileText size={18} color="var(--faint)" /><span className="main"><b><Hl text={a} q={s} /></b><small>{b}</small></span></Link>)}</Group>}
          {projs.length > 0 && <Group title="Projects">{projs.map((p) => <Link key={p.id} href={`/projects/${p.id}`} className="list-row"><Folder size={18} color="var(--faint)" /><span className="main"><b><Hl text={p.name} q={s} /></b><small>{p.desc}</small></span></Link>)}</Group>}
        </>
      )}
    </div>
  );
}
