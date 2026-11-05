"use client";

import Image from "next/image";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "@/lib/format";

export function Logo({ height = 22 }: { height?: number }) {
  return <Image src="/brand/fremwork-logo.svg" alt="Fremwork" width={Math.round((height * 944) / 204)} height={height} priority />;
}

export function Mark({ size = 20 }: { size?: number }) {
  return <Image src="/brand/fremwork-icon-compact.svg" alt="" width={size} height={size} aria-hidden />;
}

export function PageHeader({ eyebrow, title, sub, actions }: { eyebrow: string; title: string; sub?: string; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <div className="head-row">
          <span className="overline">{eyebrow}</span>
        </div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {actions && <div className="head-actions">{actions}</div>}
    </header>
  );
}

const BANNER_ICON = { err: AlertTriangle, warn: AlertTriangle, ok: CheckCircle2, info: Info };

export function Banner({ tone = "err", title, children, action }: { tone?: "err" | "warn" | "ok" | "info"; title?: string; children?: ReactNode; action?: ReactNode }) {
  const Icon = BANNER_ICON[tone];
  return (
    <div className={cx("banner", tone)} role={tone === "err" || tone === "warn" ? "alert" : "status"}>
      <Icon size={16} strokeWidth={2} aria-hidden />
      <div className="body">
        {title && <b>{title} </b>}
        {children}
      </div>
      {action}
    </div>
  );
}

export function Status({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={cx("status", tone)}>{children}</span>;
}

export function Change({ value, invert = false, suffix = "%" }: { value: number; invert?: boolean; suffix?: string }) {
  const good = invert ? value < 0 : value > 0;
  const cls = Math.abs(value) < 0.05 ? "flat" : good ? "up" : "down";
  return (
    <span className={cx("chg", cls)}>
      {value >= 0 ? "▲" : "▼"} {Math.abs(value).toFixed(1)}
      {suffix}
    </span>
  );
}

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <span id={id} className="field-error">
      <AlertCircle size={14} strokeWidth={2} aria-hidden />
      {children}
    </span>
  );
}

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: (a11y: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode;
};

/** Label + control + error/hint, wired for screen readers. */
export function Field({ id, label, error, hint, className, children }: FieldProps) {
  const eid = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cx("field", className)}>
      <label htmlFor={id}>{label}</label>
      {children({ id, "aria-invalid": !!error, "aria-describedby": eid })}
      {error ? <FieldError id={eid}>{error}</FieldError> : hint ? <span id={eid} className="field-hint">{hint}</span> : null}
    </div>
  );
}

export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      {icon && <span className="ic-box">{icon}</span>}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Progress({ value, tone }: { value: number; tone?: "over" | "near" | "blue" }) {
  return (
    <div className={cx("progress", tone)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.v)} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}
