"use client";

import { useState, type ReactNode } from "react";
import { Modal, ResultView, WorkingView } from "@/components/dialog";
import { Banner, Field } from "@/components/ui";
import { PAY_METHODS, TX_CATEGORIES } from "@/lib/data";
import { money, today } from "@/lib/format";
import { useData } from "@/lib/client/store";

type FieldDef = {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "time" | "select" | "textarea";
  options?: string[];
  placeholder?: string;
  initial?: string;
  hint?: string;
  full?: boolean;
};
type Values = Record<string, string>;

type FormDialogProps = {
  title: string;
  sub?: string;
  submitLabel: string;
  fields: FieldDef[];
  validate: (v: Values) => Record<string, string>;
  /** Return [title, detail] for the success view. */
  onSubmit: (v: Values) => [string, string];
  onClose: () => void;
  slow?: boolean;
};

/** Generic form dialog: inline errors on submit, a summary banner, then a success view. */
export function FormDialog({ title, sub, submitLabel, fields, validate, onSubmit, onClose, slow }: FormDialogProps) {
  const [values, setValues] = useState<Values>(() => Object.fromEntries(fields.map((f) => [f.id, f.initial ?? ""])));
  const [tried, setTried] = useState(false);
  const [phase, setPhase] = useState<"form" | "working" | "done">("form");
  const [result, setResult] = useState<[string, string]>(["", ""]);
  const errors = validate(values);
  const bad = Object.keys(errors).filter((k) => errors[k]);

  const submit = () => {
    if (bad.length) {
      setTried(true);
      return;
    }
    const r = onSubmit(values);
    if (slow) {
      setPhase("working");
      setTimeout(() => {
        setResult(r);
        setPhase("done");
      }, 1200);
    } else {
      setResult(r);
      setPhase("done");
    }
  };

  if (phase === "working") return <Modal title={title} sub={sub} onClose={onClose}><WorkingView label="Working on it…" /></Modal>;
  if (phase === "done") return <Modal title={title} sub={sub} onClose={onClose}><ResultView tone="ok" title={result[0]} onClose={onClose}>{result[1]}</ResultView></Modal>;

  return (
    <Modal
      title={title}
      sub={sub}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn primary" onClick={submit}>{submitLabel}</button>
        </>
      }
    >
      <form className="dialog-body" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {tried && bad.length > 0 && <Banner tone="err">{bad.length === 1 ? "Fix 1 field to continue." : `Fix ${bad.length} fields to continue.`}</Banner>}
        <div className="form-grid">
          {fields.map((f) => {
            const err = tried ? errors[f.id] : undefined;
            const set = (v: string) => setValues((s) => ({ ...s, [f.id]: v }));
            return (
              <Field key={f.id} id={`f-${f.id}`} label={f.label} error={err || undefined} hint={f.hint} className={f.full ? "full" : undefined}>
                {(a) =>
                  f.type === "select" ? (
                    <select {...a} className="select" value={values[f.id]} onChange={(e) => set(e.target.value)}>
                      {f.options!.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea {...a} className="textarea" rows={3} placeholder={f.placeholder} value={values[f.id]} onChange={(e) => set(e.target.value)} />
                  ) : (
                    <input {...a} className="input" type={f.type} inputMode={f.type === "number" ? "decimal" : undefined} placeholder={f.placeholder} value={values[f.id]} onChange={(e) => set(e.target.value)} />
                  )
                }
              </Field>
            );
          })}
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

type Close = { onClose: () => void };

export function TransactionDialog({ onClose, onAdd }: Close & { onAdd?: (t: { name: string; amt: number; cat: string; date: string; method: string; memo: string }) => void }) {
  return (
    <FormDialog
      title="Add transaction"
      sub="Record money in or out of your business."
      submitLabel="Add transaction"
      onClose={onClose}
      fields={[
        { id: "type", label: "Type", type: "select", options: ["Expense", "Income"], initial: "Expense" },
        { id: "amount", label: "Amount (USD)", type: "number", placeholder: "0.00" },
        { id: "payee", label: "Payee or customer", type: "text", placeholder: "e.g. Amazon Web Services", full: true },
        { id: "memo", label: "Description", type: "text", placeholder: "What was it for?", full: true, hint: "Optional." },
        { id: "cat", label: "Category", type: "select", options: TX_CATEGORIES, initial: "Other expense" },
        { id: "date", label: "Date", type: "date", initial: today() },
        { id: "method", label: "Payment method", type: "select", options: PAY_METHODS, initial: PAY_METHODS[0], full: true },
      ]}
      validate={(v) => ({
        amount: v.amount === "" ? "Enter the amount." : !(+v.amount > 0) ? "Enter an amount greater than zero." : +v.amount > 10_000_000 ? "That’s over $10M. Check the amount, or split it into separate transactions." : "",
        payee: !v.payee.trim() ? "Add who you paid, or who paid you." : "",
        date: !v.date ? "Pick the date of the payment." : v.date > today() ? "The date can’t be in the future." : "",
      })}
      onSubmit={(v) => {
        const amt = (v.type === "Income" ? 1 : -1) * +v.amount;
        onAdd?.({ name: v.payee.trim(), amt, cat: v.cat, date: v.date, method: v.method, memo: v.memo.trim() || "Manual entry" });
        return ["Transaction added.", `${v.payee.trim()} · ${amt > 0 ? "+" : ""}${money(amt, 2)}. It now shows in Transactions and on your dashboard.`];
      }}
    />
  );
}

export function BudgetDialog({ onClose, onAdd }: Close & { onAdd?: (b: { k: string; budget: number; owner: string }) => void }) {
  const { budgets } = useData();
  const existing = budgets.map((c) => c.k.toLowerCase());
  return (
    <FormDialog
      title="Create budget"
      sub="Set a monthly limit for a spending category."
      submitLabel="Create budget"
      onClose={onClose}
      fields={[
        { id: "name", label: "Category", type: "text", placeholder: "e.g. Training", full: true, hint: "Use a new category or one of your transaction categories." },
        { id: "amount", label: "Monthly budget (USD)", type: "number", placeholder: "2000" },
        { id: "owner", label: "Owner", type: "text", placeholder: "Team or person" },
        { id: "alert", label: "Alert me at", type: "select", options: ["90% of budget", "75% of budget", "100% of budget"], initial: "90% of budget", full: true },
      ]}
      validate={(v) => ({
        name: !v.name.trim() ? "Name the category this budget covers." : existing.includes(v.name.trim().toLowerCase()) ? `A budget for ${v.name.trim()} already exists. Edit that one instead.` : "",
        amount: v.amount === "" ? "Enter a monthly amount." : !(+v.amount > 0) ? "The budget must be more than zero." : "",
      })}
      onSubmit={(v) => {
        onAdd?.({ k: v.name.trim(), budget: +v.amount, owner: v.owner.trim() || "Unassigned" });
        return ["Budget created.", `${v.name.trim()} · ${money(+v.amount)} a month. You’ll get an alert at ${v.alert.replace(" of budget", "")}.`];
      }}
    />
  );
}

export function GoalDialog({ onClose, onAdd }: Close & { onAdd?: (g: { type: string; name: string; cur: number; target: number; date: string }) => void }) {
  return (
    <FormDialog
      title="Create financial goal"
      sub="Track a savings, revenue or spending target."
      submitLabel="Create goal"
      onClose={onClose}
      fields={[
        { id: "type", label: "Goal type", type: "select", options: ["Savings target", "Revenue target", "Expense reduction"], initial: "Savings target", full: true },
        { id: "name", label: "Goal name", type: "text", placeholder: "e.g. Emergency fund", full: true },
        { id: "cur", label: "Where you are now (USD)", type: "number", placeholder: "0" },
        { id: "target", label: "Target (USD)", type: "number", placeholder: "100000" },
        { id: "date", label: "Target date", type: "date", full: true },
      ]}
      validate={(v) => {
        const down = v.type === "Expense reduction";
        return {
          name: !v.name.trim() ? "Give the goal a name." : "",
          cur: v.cur === "" ? "Enter where you are today. Use 0 if you’re starting fresh." : +v.cur < 0 ? "This can’t be negative." : "",
          target:
            v.target === "" ? "Enter a target." : !(+v.target > 0) ? "The target must be more than zero."
              : v.cur !== "" && down && +v.target >= +v.cur ? "For an expense reduction, the target must be lower than today’s amount."
              : v.cur !== "" && !down && +v.target <= +v.cur ? "The target must be higher than where you are now." : "",
          date: !v.date ? "Pick a target date." : v.date <= today() ? "Pick a date after today." : "",
        };
      }}
      onSubmit={(v) => {
        onAdd?.({ type: v.type, name: v.name.trim(), cur: +v.cur, target: +v.target, date: v.date });
        return ["Goal created.", `${v.name.trim()} · target ${money(+v.target)} by ${v.date}. Fremwork will add a recommendation after the next sync.`];
      }}
    />
  );
}

export function ProjectDialog({ onClose, onAdd, taken = [] }: Close & { taken?: string[]; onAdd?: (p: { name: string; desc: string }) => void }) {
  return (
    <FormDialog
      title="New project"
      sub="Group related chats, files and reports."
      submitLabel="Create project"
      onClose={onClose}
      fields={[
        { id: "name", label: "Project name", type: "text", placeholder: "e.g. FY2027 audit prep", full: true },
        { id: "desc", label: "What is it for?", type: "textarea", placeholder: "Fremwork uses this to keep answers on topic.", full: true, hint: "Optional." },
      ]}
      validate={(v) => ({
        name: !v.name.trim() ? "Name the project." : v.name.length > 60 ? "Keep the name under 60 characters." : taken.map((t) => t.toLowerCase()).includes(v.name.trim().toLowerCase()) ? `You already have a project called ${v.name.trim()}.` : "",
      })}
      onSubmit={(v) => {
        onAdd?.({ name: v.name.trim(), desc: v.desc.trim() });
        return ["Project created.", `${v.name.trim()} is ready. Add files or start a chat in it.`];
      }}
    />
  );
}

export function TaskDialog({ onClose, onAdd }: Close & { onAdd?: (t: { name: string; prompt: string; freq: string; time: string }) => void }) {
  return (
    <FormDialog
      title="New scheduled task"
      sub="Fremwork runs it on a schedule and sends you the result."
      submitLabel="Create task"
      onClose={onClose}
      fields={[
        { id: "name", label: "Task name", type: "text", placeholder: "e.g. Friday receivables check", full: true },
        { id: "prompt", label: "What should Fremwork do?", type: "textarea", placeholder: "List invoices older than 30 days and draft reminders.", full: true },
        { id: "freq", label: "Frequency", type: "select", options: ["Daily", "Weekly", "Monthly", "Quarterly"], initial: "Weekly" },
        { id: "time", label: "Time", type: "time", initial: "08:00" },
        { id: "deliver", label: "Deliver to", type: "select", options: ["Notifications and email", "Notifications only"], initial: "Notifications and email", full: true },
      ]}
      validate={(v) => ({
        name: !v.name.trim() ? "Name the task." : "",
        prompt: !v.prompt.trim() ? "Tell Fremwork what to do." : v.prompt.trim().length < 15 ? "Add a little more detail so the result is useful. A sentence is enough." : "",
        time: !v.time ? "Pick a time." : "",
      })}
      onSubmit={(v) => {
        onAdd?.({ name: v.name.trim(), prompt: v.prompt.trim(), freq: v.freq, time: v.time });
        return ["Scheduled task created.", `${v.name.trim()} runs ${v.freq.toLowerCase()} at ${v.time}.`];
      }}
    />
  );
}

export function ConfirmDialog({ title, sub, body, confirmLabel, danger, onConfirm, onClose, children }: Close & { title: string; sub?: string; body: string; confirmLabel: string; danger?: boolean; onConfirm: () => void; children?: ReactNode }) {
  return (
    <Modal title={title} sub={sub} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className={danger ? "btn danger" : "btn primary"} onClick={onConfirm}>{confirmLabel}</button></>}>
      <p style={{ margin: 0, padding: "12px 20px 0", color: "var(--ink2)" }}>{body}</p>
      {children}
    </Modal>
  );
}
