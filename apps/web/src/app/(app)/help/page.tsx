"use client";

import { BookOpen, ChevronDown, Copy, MessageSquare, FileText, Shield, Send } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/toast";
import { Banner, Field, PageHeader } from "@/components/ui";

const FAQS = [
  ["Where does Fremwork get my financial data?", "From the transactions you add, either on the Transactions page or by telling the AI in chat."],
  ["How accurate are the answers?", "Fremwork shows its calculations so you can check them. Choose Deep Analysis for scenario work, and review figures before you file or share them."],
  ["Can my accountant use Fremwork?", "Yes. Invite them from Settings › Company. Accountants can view reports and conversations in projects you share."],
  ["Is my data used to train models?", "No, not by default. You can review this under Settings › AI model."],
  ["Why does a chat say it can’t see my data?", "There are no transactions for that period yet. Add them and ask again."],
];

export default function Help() {
  const toast = useToast();
  const [open, setOpen] = useState(0);
  const [subject, setSubject] = useState("");
  const [msg, setMsg] = useState("");
  const [tried, setTried] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const errs = { subject: !subject.trim() ? "Add a subject." : "", msg: !msg.trim() ? "Describe the problem." : msg.trim().length < 20 ? "Add a little more detail so we can help. A few sentences is enough." : "" };
  const copy = async () => { try { await navigator.clipboard.writeText("support@fremwork.com"); toast("Email address copied"); } catch { toast("Copy isn’t available here. Select the address instead.", "err"); } };

  return (
    <div className="page">
      <PageHeader eyebrow="Account" title="Help & Support" sub="Guides, answers and a direct line to our team." />
      <div className="grid cols-4">
        {[[BookOpen, "Getting started", "Connect data, ask your first question and read the overview."], [MessageSquare, "Using the AI assistant", "Reasoning modes, uploads and exports."], [FileText, "Reports and statements", "Generate, customise and export financial reports."], [Shield, "Security and privacy", "How your data is stored, encrypted and protected."]].map(([I, t, d]) => {
          const Icon = I as typeof BookOpen;
          return <button key={t as string} className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }} onClick={() => toast("Help articles open in the help center")}><span className="ic-box"><Icon size={18} /></span><b style={{ fontWeight: 500 }}>{t as string}</b><small className="muted" style={{ fontSize: 12.5 }}>{d as string}</small></button>;
        })}
      </div>
      <div className="grid cols-2" style={{ alignItems: "start" }}>
        <section className="card">
          <div className="card-head" style={{ paddingBottom: 6 }}><h2>Frequently asked questions</h2></div>
          {FAQS.map(([q, a], i) => (
            <div key={q} style={{ borderTop: "1px solid var(--mist)", padding: "0 20px" }}>
              <button aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)} style={{ width: "100%", border: 0, background: "none", padding: "16px 0", display: "flex", justifyContent: "space-between", gap: 12, textAlign: "left", fontWeight: 500 }}>
                {q}<ChevronDown size={16} color="var(--muted)" style={{ flex: "none", transform: open === i ? "rotate(180deg)" : undefined }} />
              </button>
              {open === i && <p className="muted" style={{ margin: "0 0 16px", maxWidth: "65ch" }}>{a}</p>}
            </div>
          ))}
        </section>
        <section className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>Contact support</h2>
          <p className="muted" style={{ margin: 0 }}>We usually reply within one business day.</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}><div><b style={{ display: "block", fontWeight: 500 }}>Email</b><span className="mono muted" style={{ fontSize: 13, userSelect: "all" }}>support@fremwork.com</span></div><button className="btn sm" onClick={copy}><Copy size={14} />Copy</button></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, borderTop: "1px solid var(--mist)", paddingTop: 14 }}><div><b style={{ display: "block", fontWeight: 500 }}>Telegram</b><span className="mono muted" style={{ fontSize: 13 }}>t.me/fremwork</span></div><a className="btn sm" href="https://t.me/fremwork" target="_blank" rel="noopener noreferrer">Open ↗</a></div>
          {state === "sent" ? (
            <Banner tone="ok" title="Message sent.">We’ll reply by email.</Banner>
          ) : (
            <form noValidate style={{ display: "grid", gap: 12, borderTop: "1px solid var(--mist)", paddingTop: 14 }} onSubmit={(e) => {
              e.preventDefault();
              if (errs.subject || errs.msg) return setTried(true);
              if (!navigator.onLine) { toast("You’re offline. Your message will send when you reconnect.", "err"); return; }
              setState("sending"); setTimeout(() => setState("sent"), 1100);
            }}>
              {tried && (errs.subject || errs.msg) && <Banner tone="err">Fix the highlighted fields to send.</Banner>}
              <Field id="s-subject" label="Subject" error={tried ? errs.subject || undefined : undefined}>{(a) => <input {...a} className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What do you need help with?" />}</Field>
              <Field id="s-msg" label="Message" error={tried ? errs.msg || undefined : undefined}>{(a) => <textarea {...a} className="textarea" rows={4} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Describe the problem" />}</Field>
              <div><button className="btn primary" type="submit" disabled={state === "sending"}><Send size={15} />{state === "sending" ? "Sending…" : "Send message"}</button></div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
