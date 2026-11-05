"use client";

import { useState } from "react";
import { Field } from "@/components/ui";

export function PasswordField({ id, label, value, onChange, error, hint, autoComplete, aside }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string; autoComplete: string; aside?: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      {aside && <div style={{ position: "absolute", right: 0, top: 0 }}>{aside}</div>}
      <Field id={id} label={label} error={error} hint={hint}>
        {(a) => (
          <div className="pw-wrap">
            <input {...a} type={show ? "text" : "password"} className="input lg" value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} />
            <button type="button" className="pw-toggle" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button>
          </div>
        )}
      </Field>
    </div>
  );
}

export const passwordRule = (pw: string) => (!pw ? "Create a password." : pw.length < 8 ? "Use at least 8 characters." : !/\d/.test(pw) || !/[a-z]/i.test(pw) ? "Include at least one letter and one number." : "");
