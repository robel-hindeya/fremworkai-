"use client";

import { ArrowUp, Check, ChevronDown, FileSpreadsheet, FileText, Image as ImageIcon, Paperclip, Scale, Search, Square, X, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useChat, type AttachedFile, type Mode } from "@/components/chat-store";
import { Banner } from "@/components/ui";
import { checkFiles } from "@/lib/format";

const MODES: { m: Mode; icon: typeof Zap }[] = [
  { m: "Fast", icon: Zap },
  { m: "Balanced", icon: Scale },
  { m: "Deep Analysis", icon: Search },
];
const KINDS = [
  { t: "Document", f: "PDF", accept: ".pdf", icon: FileText },
  { t: "Spreadsheet", f: "XLSX · CSV", accept: ".xlsx,.xls,.csv", icon: FileSpreadsheet },
  { t: "Image", f: "PNG · JPG", accept: "image/png,image/jpeg,image/webp", icon: ImageIcon },
  { t: "Any file", f: "ALL", accept: "", icon: Paperclip },
];

type Props = {
  onSend: (text: string, files: AttachedFile[]) => void;
  docked?: boolean;
  busy?: boolean;
  onStop?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
};

export function Composer({ onSend, docked, busy, onStop, autoFocus, placeholder }: Props) {
  const { mode, setMode } = useChat();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [menu, setMenu] = useState<"attach" | "mode" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => wrapRef.current && !wrapRef.current.contains(e.target as Node) && setMenu(null);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(200, Math.max(28, ta.scrollHeight)) + "px";
  }, [text]);

  const canSend = !busy && (text.trim().length > 0 || files.length > 0);
  const submit = () => {
    if (!canSend) return;
    if (text.length > 8000) {
      setErrors(["Your message is over 8,000 characters. Shorten it, or attach the text as a file."]);
      return;
    }
    onSend(text, files);
    setText("");
    setFiles([]);
    setErrors([]);
  };

  const pick = (accept: string) => {
    setMenu(null);
    if (!fileRef.current) return;
    fileRef.current.accept = accept;
    fileRef.current.click();
  };

  const ModeIcon = MODES.find((x) => x.m === mode)!.icon;

  return (
    <div ref={wrapRef} style={{ width: "100%" }}>
      <form className="composer" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {errors.length > 0 && (
          <Banner tone="err" action={<button type="button" className="icon-btn" style={{ width: 24, height: 24 }} aria-label="Dismiss" onClick={() => setErrors([])}><X size={14} /></button>}>
            {errors.map((e) => <div key={e}>{e}</div>)}
          </Banner>
        )}
        {files.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingBottom: 4 }}>
            {files.map((f, i) => (
              <span key={f.name + i} className="file-chip">
                <span className="tag solid">{f.ext}</span>
                <span className="name">{f.name}</span>
                <span className="muted">{f.size}</span>
                <button type="button" className="icon-btn" style={{ width: 22, height: 22 }} aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}><X size={13} /></button>
              </span>
            ))}
          </div>
        )}
        <label htmlFor="composer-input" className="sr-only">Message Fremwork</label>
        <textarea
          id="composer-input"
          ref={taRef}
          rows={1}
          autoFocus={autoFocus}
          placeholder={placeholder || (docked ? "Reply to Fremwork…" : "Ask about your finances, or record a transaction…")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <input ref={fileRef} type="file" multiple hidden onChange={(e) => {
          const r = checkFiles(Array.from(e.target.files ?? []), files.length);
          setFiles((f) => [...f, ...r.ok]);
          setErrors(r.errors);
          e.target.value = "";
        }} />
        <div className="composer-bar">
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="composer-btn-circle"
              aria-label="Attach files"
              aria-haspopup="menu"
              aria-expanded={menu === "attach"}
              onClick={() => setMenu(menu === "attach" ? null : "attach")}
              title="Attach document, sheet, or image"
            >
              <Paperclip size={16} />
            </button>
            {menu === "attach" && (
              <div className="menu" role="menu" style={{ bottom: "calc(100% + 8px)", left: 0, width: 240, zIndex: 60 }}>
                <div className="overline" style={{ padding: "6px 10px" }}>Attach</div>
                {KINDS.map((k) => (
                  <button key={k.t} type="button" role="menuitem" className="menu-item" onClick={() => pick(k.accept)}>
                    <span className="ic-box"><k.icon size={16} /></span>
                    <span style={{ flex: 1 }}>{k.t}</span>
                    <span className="mono muted" style={{ fontSize: 10.5 }}>{k.f}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="mode-btn"
              aria-haspopup="menu"
              aria-expanded={menu === "mode"}
              aria-label={`Reasoning mode: ${mode}`}
              onClick={() => setMenu(menu === "mode" ? null : "mode")}
            >
              <ModeIcon size={14} aria-hidden />
              <span>{mode}</span>
              <ChevronDown size={13} style={{ transform: menu === "mode" ? "rotate(180deg)" : undefined }} />
            </button>
            {menu === "mode" && (
              <div className="menu" role="menu" style={{ bottom: "calc(100% + 8px)", left: 0, width: 220, zIndex: 60 }}>
                <div className="overline" style={{ padding: "6px 10px" }}>Reasoning Mode</div>
                {MODES.map(({ m, icon: I }) => (
                  <button key={m} type="button" role="menuitemradio" aria-checked={mode === m} className="menu-item" onClick={() => { setMode(m); setMenu(null); }}>
                    <span className="ic-box"><I size={16} /></span>
                    <span style={{ flex: 1 }}>{m}</span>
                    {mode === m && <Check size={16} color="var(--blue)" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="spacer" />

          {busy && onStop ? (
            <button type="button" className="send busy" aria-label="Stop generating" onClick={onStop} title="Stop generating">
              <Square size={13} fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              className={`send ${canSend ? "active" : "disabled"}`}
              aria-label="Send message"
              disabled={!canSend}
              title="Send message"
            >
              <ArrowUp size={18} strokeWidth={2.4} />
            </button>
          )}
        </div>
      </form>
      <div className="composer-disclaimer">
        Fremwork can make mistakes. Verify important financial data.
      </div>
    </div>
  );
}
