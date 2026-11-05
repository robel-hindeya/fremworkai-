"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Bell, Building2, Coins, Cpu, User } from "lucide-react";
import { Suspense, useState } from "react";
import { useToast } from "@/components/toast";
import { Banner, Field, Switch } from "@/components/ui";
import { isEmail } from "@/lib/format";
import { useData } from "@/lib/client/store";

const TABS = [
  { k: "profile", l: "Profile", icon: User },
  { k: "company", l: "Company", icon: Building2 },
  { k: "finance", l: "Financial preferences", icon: Coins },
  { k: "ai", l: "AI model", icon: Cpu },
  { k: "notifications", l: "Notifications", icon: Bell },
] as const;
type TabKey = (typeof TABS)[number]["k"];

function Row({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "center", padding: "14px 0", borderTop: "1px solid var(--mist)", flexWrap: "wrap" }}>
      <div style={{ minWidth: 0, flex: 1 }}><b style={{ display: "block", fontWeight: 500 }}>{title}</b><small className="muted" style={{ fontSize: 12.5 }}>{sub}</small></div>
      {children}
    </div>
  );
}

/** A form section with dirty tracking, validation on save and a saved state. */
function useForm<T extends Record<string, string>>(initial: T, validate: (v: T) => Partial<Record<keyof T, string>>) {
  const [saved, setSaved] = useState(initial);
  const [v, setV] = useState(initial);
  const [tried, setTried] = useState(false);
  const errs = validate(v);
  const bad = Object.values(errs).filter(Boolean).length;
  const dirty = JSON.stringify(v) !== JSON.stringify(saved);
  return {
    v, dirty, bad, tried,
    err: (k: keyof T) => (tried ? errs[k] : undefined),
    set: (k: keyof T) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value })),
    save: () => { if (bad) { setTried(true); return false; } setSaved(v); setTried(false); return true; },
    reset: () => { setV(saved); setTried(false); },
  };
}

type FormState = { dirty: boolean; bad: number; tried: boolean; save: () => boolean; reset: () => void };

function SaveBar({ f, toast }: { f: FormState; toast: (t: string, tone?: "ok" | "err") => void }) {
  return (
    <>
      {f.tried && f.bad > 0 && <Banner tone="err">{f.bad === 1 ? "Fix 1 field to save." : `Fix ${f.bad} fields to save.`}</Banner>}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, borderTop: "1px solid var(--line)", paddingTop: 16, flexWrap: "wrap" }}>
        {f.dirty && <span className="muted" style={{ fontSize: 13, marginRight: "auto" }}>You have unsaved changes.</span>}
        <button className="btn" disabled={!f.dirty} onClick={f.reset}>Discard</button>
        <button className="btn primary" disabled={!f.dirty} onClick={() => { if (f.save()) toast("Settings saved"); }}>Save changes</button>
      </div>
    </>
  );
}

function SettingsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const tab = (TABS.find((t) => t.k === params.get("tab"))?.k ?? "profile") as TabKey;
  const go = (k: TabKey) => router.replace(`/settings?tab=${k}`, { scroll: false });

  const { user } = useData();
  const profile = useForm({ name: user?.name ?? "", email: user?.email ?? "", role: user?.role ?? "", tz: "Africa/Addis_Ababa" }, (v) => ({
    name: !v.name.trim() ? "Enter your name." : "",
    email: !v.email.trim() ? "Enter your email." : !isEmail(v.email) ? "Enter a valid email, like name@company.com." : "",
  }));
  const company = useForm({ name: user?.company ?? "", industry: "Software & SaaS", country: "Ethiopia", tin: "", address: "" }, (v) => ({
    name: !v.name.trim() ? "Enter your company’s legal name." : "",
    tin: v.tin && !/^\d{10}$/.test(v.tin.replace(/\s/g, "")) ? "An Ethiopian TIN has 10 digits." : "",
  }));
  const finance = useForm({ currency: "USD — US dollar", fy: "January", basis: "Accrual", reserve: "3" }, (v) => ({
    reserve: !/^\d+$/.test(v.reserve) || +v.reserve < 1 || +v.reserve > 24 ? "Enter a whole number of months between 1 and 24." : "",
  }));
  const [toggles, setToggles] = useState<Record<string, boolean>>({ calc: true, charts: true, train: false, nBud: true, nCash: true, nAnom: true, nTask: true, nWeekly: false, nProd: false });
  const t = (k: string, label: string) => <Switch checked={toggles[k]} label={label} onChange={(v) => { setToggles({ ...toggles, [k]: v }); toast(`${label} ${v ? "on" : "off"}`); }} />;

  return (
    <div className="page">
      <div><span className="overline">Account</span><h1 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>Settings</h1></div>
      <div className="grid" style={{ gridTemplateColumns: "220px minmax(0,1fr)", gap: 28, alignItems: "start" }} id="settings-grid">
        <nav aria-label="Settings sections" style={{ display: "flex", flexDirection: "column", gap: 2, overflowX: "auto" }} id="settings-nav">
          {TABS.map((x) => (
            <button key={x.k} type="button" className="nav-item" aria-current={tab === x.k ? "page" : undefined} onClick={() => go(x.k)}><x.icon size={18} aria-hidden /><span className="label">{x.l}</span></button>
          ))}
        </nav>
        <section className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {tab === "profile" && <>
            <div><h2 style={{ margin: 0, fontSize: 18 }}>Profile</h2><p className="muted" style={{ margin: "4px 0 0" }}>How you appear in Fremwork and on shared reports.</p></div>
            <div className="form-grid">
              <Field id="p-name" label="Full name" error={profile.err("name")}>{(a) => <input {...a} className="input" value={profile.v.name} onChange={profile.set("name")} />}</Field>
              <Field id="p-email" label="Email" error={profile.err("email")} hint="We’ll send a link to confirm a new address.">{(a) => <input {...a} type="email" className="input" value={profile.v.email} onChange={profile.set("email")} />}</Field>
              <Field id="p-role" label="Role">{(a) => <input {...a} className="input" value={profile.v.role} onChange={profile.set("role")} />}</Field>
              <Field id="p-tz" label="Time zone">{(a) => <select {...a} className="select" value={profile.v.tz} onChange={profile.set("tz")}><option>America/Los_Angeles</option><option>Africa/Addis_Ababa</option><option>Africa/Nairobi</option><option>Europe/London</option></select>}</Field>
            </div>
            <SaveBar f={profile} toast={toast} />
          </>}
          {tab === "company" && <>
            <div><h2 style={{ margin: 0, fontSize: 18 }}>Company information</h2><p className="muted" style={{ margin: "4px 0 0" }}>Used on report headers and for tax and fiscal settings.</p></div>
            <div className="form-grid">
              <Field id="c-name" label="Legal name" error={company.err("name")}>{(a) => <input {...a} className="input" value={company.v.name} onChange={company.set("name")} />}</Field>
              <Field id="c-ind" label="Industry">{(a) => <select {...a} className="select" value={company.v.industry} onChange={company.set("industry")}><option>Software & SaaS</option><option>Professional services</option><option>Retail</option><option>Manufacturing</option></select>}</Field>
              <Field id="c-country" label="Country of registration">{(a) => <select {...a} className="select" value={company.v.country} onChange={company.set("country")}><option>Ethiopia</option><option>Kenya</option><option>United States</option><option>United Kingdom</option></select>}</Field>
              <Field id="c-tin" label="Tax ID (TIN)" error={company.err("tin")} hint="Optional. Shown on statements.">{(a) => <input {...a} className="input" inputMode="numeric" value={company.v.tin} onChange={company.set("tin")} placeholder="0000000000" />}</Field>
              <Field id="c-addr" label="Registered address" className="full">{(a) => <textarea {...a} className="textarea" rows={2} value={company.v.address} onChange={company.set("address")} />}</Field>
            </div>
            <SaveBar f={company} toast={toast} />
          </>}
          {tab === "finance" && <>
            <div><h2 style={{ margin: 0, fontSize: 18 }}>Financial preferences</h2><p className="muted" style={{ margin: "4px 0 0" }}>Defaults for analysis, reports and forecasts.</p></div>
            <div className="form-grid">
              <Field id="f-cur" label="Reporting currency" hint="Changing this converts history at month-end rates.">{(a) => <select {...a} className="select" value={finance.v.currency} onChange={finance.set("currency")}><option>USD — US dollar</option><option>ETB — Ethiopian birr</option><option>KES — Kenyan shilling</option><option>EUR — Euro</option></select>}</Field>
              <Field id="f-fy" label="Fiscal year starts">{(a) => <select {...a} className="select" value={finance.v.fy} onChange={finance.set("fy")}><option>January</option><option>April</option><option>July</option><option>October</option></select>}</Field>
              <Field id="f-basis" label="Accounting basis">{(a) => <select {...a} className="select" value={finance.v.basis} onChange={finance.set("basis")}><option>Accrual</option><option>Cash</option></select>}</Field>
              <Field id="f-res" label="Cash reserve policy (months)" error={finance.err("reserve")} hint="Fremwork warns you when cash falls below this.">{(a) => <input {...a} className="input" inputMode="numeric" value={finance.v.reserve} onChange={finance.set("reserve")} />}</Field>
            </div>
            <SaveBar f={finance} toast={toast} />
          </>}
          {tab === "ai" && <>
            <div><h2 style={{ margin: 0, fontSize: 18 }}>AI model preferences</h2><p className="muted" style={{ margin: "4px 0 0" }}>Choose the default reasoning mode in any chat. These settings apply to every answer.</p></div>
            <div>
              <Row title="Show calculations" sub="Include the working behind every number.">{t("calc", "Show calculations")}</Row>
              <Row title="Add charts automatically" sub="Draw a chart when an answer compares periods or categories.">{t("charts", "Add charts automatically")}</Row>
              <Row title="Use my conversations to improve Fremwork" sub="Off by default. Your financial data is never shared with other customers.">{t("train", "Use conversations to improve Fremwork")}</Row>
            </div>
          </>}
          {tab === "notifications" && <>
            <div><h2 style={{ margin: 0, fontSize: 18 }}>Notifications</h2><p className="muted" style={{ margin: "4px 0 0" }}>Choose what Fremwork tells you about.</p></div>
            <div>
              <Row title="Budget alerts" sub="When a category passes 90% or goes over budget.">{t("nBud", "Budget alerts")}</Row>
              <Row title="Cash flow warnings" sub="When runway falls below your reserve policy.">{t("nCash", "Cash flow warnings")}</Row>
              <Row title="Unusual transactions" sub="Large, duplicate or out-of-policy payments.">{t("nAnom", "Unusual transactions")}</Row>
              <Row title="Scheduled task results" sub="When a recurring analysis finishes or fails.">{t("nTask", "Scheduled task results")}</Row>
              <Row title="Weekly email digest" sub="A Monday summary of last week’s numbers.">{t("nWeekly", "Weekly email digest")}</Row>
              <Row title="Product updates" sub="New features and improvements.">{t("nProd", "Product updates")}</Row>
            </div>
          </>}
        </section>
      </div>
      <style>{`@media (max-width: 860px) { #settings-grid { grid-template-columns: minmax(0,1fr) !important; } #settings-nav { flex-direction: row !important; } #settings-nav .nav-item { width: auto; } }`}</style>
    </div>
  );
}

export default function SettingsPage() {
  return <Suspense><SettingsInner /></Suspense>;
}
