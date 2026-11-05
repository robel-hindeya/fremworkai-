"use client";

import Link from "next/link";
import { Building2, Check, CheckCircle2, AlertTriangle, Landmark, Upload, X as XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Banner, Field, FieldError, Logo, Progress } from "@/components/ui";
import { cx, fileSize } from "@/lib/format";

type SrcState = "idle" | "busy" | "ok" | "err";
const SOURCES = [
  { k: "qb", t: "QuickBooks Online", x: "Accounts, transactions and invoices", icon: Building2 },
  { k: "xero", t: "Xero", x: "Ledger, bills and bank reconciliation", icon: XIcon },
  { k: "bank", t: "Bank feed", x: "Daily balances and transactions", icon: Landmark, failFirst: true },
];
const TOPICS = ["Cash flow", "Expenses", "Revenue", "Budgets", "Forecasting", "Reports for the board"];
const STEPS = ["Company", "Data", "Preferences", "Ready"];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [tried, setTried] = useState(false);
  const [name, setName] = useState("");
  const [src, setSrc] = useState<Record<string, SrcState>>({});
  const [triedSrc, setTriedSrc] = useState<Record<string, boolean>>({});
  const [uploads, setUploads] = useState<{ name: string; ext: string; ok: boolean; note: string }[]>([]);
  const [skipped, setSkipped] = useState(false);
  const [reserve, setReserve] = useState("3");
  const [topics, setTopics] = useState<string[]>(["Cash flow"]);
  const fileRef = useRef<HTMLInputElement>(null);

  const connected = Object.values(src).filter((s) => s === "ok").length + uploads.filter((u) => u.ok).length;
  const resBad = !/^\d+$/.test(reserve) || +reserve < 1 || +reserve > 24;
  const next = () => {
    if (step === 1 && !name.trim()) return setTried(true);
    if (step === 2 && connected === 0 && !skipped) return setTried(true);
    if (step === 3 && (resBad || topics.length === 0)) return setTried(true);
    setTried(false);
    setStep(step + 1);
  };
  const connect = (k: string, failFirst?: boolean) => {
    setSrc((s) => ({ ...s, [k]: "busy" }));
    setTimeout(() => {
      const fail = failFirst && !triedSrc[k];
      setTriedSrc((t) => ({ ...t, [k]: true }));
      setSrc((s) => ({ ...s, [k]: fail ? "err" : "ok" }));
    }, 1100);
  };

  const titles = [
    ["Tell us about your company.", "Fremwork uses this for report headers, currency and tax settings."],
    ["Connect your financial data.", "Fremwork reads it to answer with your real numbers. Read-only access; we never move money."],
    ["Set your preferences.", "You can change these any time in Settings."],
    ["You’re ready.", "Here’s what happens next."],
  ][step - 1];

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px clamp(16px, 4vw, 40px)", borderBottom: "1px solid var(--line)" }}>
        <Logo />
        <ol className="steps" aria-label="Setup progress">
          {STEPS.map((l, i) => (
            <li key={l} className={cx("step", i + 1 < step && "done")} aria-current={i + 1 === step ? "step" : undefined}>
              <span className="dot">{i + 1 < step ? <Check size={13} strokeWidth={2.4} /> : i + 1}</span><span className="txt">{l}</span>
            </li>
          ))}
        </ol>
        <Link href="/sign-in" className="muted hide-sm" style={{ fontSize: 13, textDecoration: "none" }}>Sign out</Link>
      </header>

      <main style={{ flex: 1, width: "100%", maxWidth: 640, margin: "0 auto", padding: "40px 16px 56px", display: "flex", flexDirection: "column", gap: 22 }}>
        <div><span className="overline">Step {step} of 4</span><h1 style={{ margin: "4px 0", fontSize: 30, lineHeight: 1.15, letterSpacing: "-0.02em", fontWeight: 600 }}>{titles[0]}</h1><p className="muted" style={{ margin: 0 }}>{titles[1]}</p></div>

        {step === 1 && (
          <section className="card card-pad form-grid">
            {tried && !name.trim() && <div className="full"><Banner tone="err">Fix the highlighted field to continue.</Banner></div>}
            <Field id="ob-name" label="Company name" className="full" error={tried && !name.trim() ? "Enter your company’s name. It appears on your reports." : undefined}>{(a) => <input {...a} className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your company" />}</Field>
            <Field id="ob-ind" label="Industry">{(a) => <select {...a} className="select"><option>Software & SaaS</option><option>Professional services</option><option>Retail</option><option>Manufacturing</option><option>Hospitality</option><option>Other</option></select>}</Field>
            <Field id="ob-country" label="Country">{(a) => <select {...a} className="select"><option>Ethiopia</option><option>Kenya</option><option>United States</option><option>United Kingdom</option><option>Other</option></select>}</Field>
            <Field id="ob-cur" label="Reporting currency">{(a) => <select {...a} className="select"><option>USD — US dollar</option><option>ETB — Ethiopian birr</option><option>KES — Kenyan shilling</option><option>EUR — Euro</option></select>}</Field>
            <Field id="ob-size" label="Team size">{(a) => <select {...a} className="select"><option>1–10</option><option>11–50</option><option>51–200</option><option>201+</option></select>}</Field>
          </section>
        )}

        {step === 2 && (
          <>
            {tried && connected === 0 && <Banner tone="warn">Connect at least one source or upload a file, so Fremwork can answer with your numbers. You can also skip and do it later.</Banner>}
            <div className="grid cols-2">
              <section className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 10, borderColor: uploads.some((u) => u.ok) ? "var(--pos-line)" : undefined }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}><span className="ic-box"><Upload size={18} /></span><div><b style={{ fontWeight: 500 }}>Upload files</b><div className="muted" style={{ fontSize: 12.5 }}>Statements, ledgers, invoices · PDF, XLSX, CSV</div></div></div>
                <button className="btn sm" style={{ alignSelf: "flex-start" }} onClick={() => fileRef.current?.click()}>{uploads.some((u) => u.ok) ? "Add more files" : "Choose files"}</button>
              </section>
              {SOURCES.map((s) => {
                const st = src[s.k] ?? "idle";
                return (
                  <section key={s.k} className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 10, borderColor: st === "ok" ? "var(--pos-line)" : st === "err" ? "var(--neg-line)" : undefined }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}><span className="ic-box"><s.icon size={18} /></span><div><b style={{ fontWeight: 500 }}>{s.t}</b><div className="muted" style={{ fontSize: 12.5 }}>{s.x}</div></div></div>
                    {st === "ok" && <span style={{ color: "var(--pos)", fontSize: 12.5 }}>Connected. First sync started.</span>}
                    {st === "err" && <FieldError>We couldn’t reach your bank. Its service may be down. Try again in a few minutes, or upload a statement instead.</FieldError>}
                    <button className={st === "ok" ? "btn sm" : "btn sm primary"} style={{ alignSelf: "flex-start" }} disabled={st === "busy" || st === "ok"} onClick={() => connect(s.k, s.failFirst)}>
                      {st === "busy" ? "Connecting…" : st === "ok" ? "Connected" : st === "err" ? "Try again" : "Connect"}
                    </button>
                  </section>
                );
              })}
            </div>
            <input ref={fileRef} type="file" multiple hidden onChange={(e) => {
              const add = Array.from<File>(e.target.files ?? []).map((f) => {
                const ext = (f.name.split(".").pop() || "").toUpperCase();
                const note = !["PDF", "XLSX", "XLS", "CSV"].includes(ext) ? "Not supported. Upload PDF, XLSX or CSV." : f.size > 25e6 ? `Too large (${fileSize(f.size)}). Files can be up to 25 MB.` : f.size === 0 ? "This file is empty." : `Ready · ${fileSize(f.size)}`;
                return { name: f.name, ext: ext || "FILE", ok: note.startsWith("Ready"), note };
              });
              setUploads((u) => [...u, ...add]);
              setTried(false);
              e.target.value = "";
            }} />
            {uploads.length > 0 && (
              <section className="card">
                {uploads.map((u, i) => (
                  <div key={u.name + i} className="list-row">
                    {u.ok ? <CheckCircle2 size={18} color="var(--pos)" /> : <AlertTriangle size={18} color="var(--neg)" />}
                    <span className="main"><b>{u.name}</b><small style={{ color: u.ok ? undefined : "var(--neg)" }}>{u.note}</small></span>
                    <button className="icon-btn" aria-label={`Remove ${u.name}`} onClick={() => setUploads(uploads.filter((_, j) => j !== i))}><XIcon size={16} /></button>
                  </div>
                ))}
              </section>
            )}
          </>
        )}

        {step === 3 && (
          <section className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {tried && (resBad || topics.length === 0) && <Banner tone="err">Fix the highlighted fields to continue.</Banner>}
            {skipped && connected === 0 && <Banner tone="warn">Without data, Fremwork can only answer general finance questions. Connect a source any time in Data sources.</Banner>}
            <div className="form-grid">
              <Field id="ob-fy" label="Fiscal year starts">{(a) => <select {...a} className="select"><option>January</option><option>April</option><option>July</option><option>October</option></select>}</Field>
              <Field id="ob-basis" label="Accounting basis">{(a) => <select {...a} className="select"><option>Accrual</option><option>Cash</option></select>}</Field>
              <Field id="ob-res" label="Cash reserve policy (months of expenses)" className="full" error={tried && resBad ? "Enter a whole number of months between 1 and 24." : undefined} hint="Fremwork warns you when cash falls below this.">{(a) => <input {...a} className="input" inputMode="numeric" value={reserve} onChange={(e) => setReserve(e.target.value)} />}</Field>
            </div>
            <fieldset style={{ border: 0, margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              <legend className="label" style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>What do you want help with first? Pick any.</legend>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {TOPICS.map((t) => <button key={t} type="button" className="chip-toggle" aria-pressed={topics.includes(t)} onClick={() => setTopics(topics.includes(t) ? topics.filter((x) => x !== t) : [...topics, t])}>{t}</button>)}
              </div>
              {tried && topics.length === 0 && <FieldError>Pick at least one, so your first answers are about what matters to you.</FieldError>}
            </fieldset>
          </section>
        )}

        {step === 4 && (
          <section className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span className="ic-box ok" style={{ width: 44, height: 44, borderRadius: "50%" }}><Check size={22} strokeWidth={2.4} /></span>
              <div><b style={{ fontWeight: 600 }}>{name.trim() || "Your company"} is set up.</b><p className="muted" style={{ margin: 0, fontSize: 13.5 }}>{connected ? `${connected} data source${connected > 1 ? "s" : ""} connected. Fremwork is reading your history now.` : "No data connected yet. Add it any time in Data sources."}</p></div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>Reading your data</span><span className="muted">About 2 minutes</span></div>
            <Progress value={38} />
            <span className="muted" style={{ fontSize: 13 }}>You can start asking questions now. Answers get sharper as the sync finishes.</span>
          </section>
        )}

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {step > 1 && step < 4 && <button className="btn lg" onClick={() => { setTried(false); setStep(step - 1); }}>Back</button>}
          <span style={{ flex: 1 }} />
          {step === 2 && <button className="btn lg ghost muted" onClick={() => { setSkipped(true); setTried(false); setStep(3); }}>Skip for now</button>}
          {step < 4 ? <button className="btn primary lg" onClick={next}>Continue</button> : <Link className="btn primary lg" href="/chat">Open Fremwork</Link>}
        </div>
      </main>
      <style>{`@media (max-width: 640px) { .hide-sm { display: none; } }`}</style>
    </div>
  );
}
