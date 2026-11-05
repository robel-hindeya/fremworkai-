"use client";

import { Plus, Target } from "lucide-react";
import { useState } from "react";
import { GoalDialog } from "@/components/forms";
import { Empty, Mark, PageHeader, Progress, Status } from "@/components/ui";
import { fmtDate, money } from "@/lib/format";
import { useData } from "@/lib/client/store";

export default function Goals() {
  const { goals, addGoal } = useData();
  const [creating, setCreating] = useState(false);
  const today = Date.now();

  return (
    <div className="page">
      <PageHeader eyebrow="Financial tools" title="Financial goals" sub="Targets for savings, revenue and spending, with progress and AI guidance."
        actions={<button className="btn primary" onClick={() => setCreating(true)}><Plus size={16} />Create goal</button>} />
      {goals.length === 0 ? (
        <div className="card"><Empty icon={<Target size={18} />} title="No goals yet." action={<button className="btn primary" onClick={() => setCreating(true)}>Create your first goal</button>}>Set a savings, revenue or spending target and Fremwork will track it and suggest how to get there.</Empty></div>
      ) : (
        <div className="grid cols-2">
          {goals.map((g) => {
            const p = Math.max(0, Math.min(1, g.down ? (g.start - g.cur) / (g.start - g.target) : (g.cur - g.start) / (g.target - g.start)));
            const left = Math.round((new Date(g.date + "T12:00:00").getTime() - today) / 864e5);
            return (
              <article key={g.id} className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <div><span className="overline">{g.type}</span><h2 style={{ margin: "4px 0 0", fontSize: 17, fontWeight: 500 }}>{g.name}</h2></div>
                  <Status tone={g.status === "On track" ? "ok" : g.status === "Behind pace" ? "warn" : ""}>{g.status}</Status>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <b className="num" style={{ fontSize: 22, fontWeight: 600 }}>{money(g.cur)}</b>
                  <span className="muted" style={{ fontSize: 13 }}>{g.down ? `a month now · target ${money(g.target)}` : `of ${money(g.target)}`}</span>
                </div>
                <div>
                  <Progress value={p * 100} tone={g.down ? "blue" : undefined} />
                  <div className="muted num" style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5, marginTop: 8 }}><span>{Math.round(p * 100)}% complete</span><span>Target {fmtDate(g.date)}</span><span>{left} days left</span></div>
                </div>
                <div style={{ background: "var(--rail)", borderRadius: 12, padding: "12px 14px", fontSize: 13, display: "flex", gap: 10, color: "var(--ink2)" }}>
                  <Mark size={16} /><div><b style={{ fontWeight: 500 }}>Fremwork recommends</b><br />{g.ai}</div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {creating && (
        <GoalDialog
          onClose={() => setCreating(false)}
          onAdd={(g) => addGoal({ type: g.type, name: g.name, cur: g.cur, target: g.target, date: g.date, down: g.type === "Expense reduction" })}
        />
      )}
    </div>
  );
}
