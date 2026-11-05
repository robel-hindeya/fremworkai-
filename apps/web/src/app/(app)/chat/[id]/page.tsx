"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowDown,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  FolderPlus,
  RefreshCw,
  Sparkles,
  Square,
  SquarePen,
  Wrench,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useChat, type Message } from "@/components/chat-store";
import { Composer } from "@/components/composer";
import { Modal } from "@/components/dialog";
import { Markdown } from "@/components/markdown";
import { useToast } from "@/components/toast";
import { Banner, Empty, Field, Mark } from "@/components/ui";
import { useData } from "@/lib/client/store";

function AiMessage({ m, convoId, isLast }: { m: Extract<Message, { role: "ai" }>; convoId: string; isLast: boolean }) {
  const { stop, retry } = useChat();
  const toast = useToast();
  const [showThought, setShowThought] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(m.text ?? "");
      setCopied(true);
      toast("Answer copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Copy isn’t available here. Select the text instead.", "err");
    }
  };

  return (
    <div className="msg-ai-row">
      <div className="msg-ai-avatar">
        <Mark size={18} />
      </div>
      <div className="msg-ai-body">
        <div className="msg-ai-meta">
          <span className="msg-ai-name">Fremwork</span>
          <span className="msg-ai-badge">{m.mode}</span>
        </div>

        {m.status === "thinking" && (
          <div className="chat-thinking-box" role="status">
            <div className="thinking-pulsar">
              <span className="pulse-dot" />
              <span className="pulse-dot" />
              <span className="pulse-dot" />
            </div>
            <span className="thinking-text">Reading your ledger…</span>
            <button className="btn sm ghost stop-btn" onClick={() => stop(convoId, m.id)}>
              <Square size={11} fill="currentColor" /> Stop
            </button>
          </div>
        )}

        {m.status === "error" && (
          <Banner
            tone="err"
            title="Fremwork couldn’t answer."
            action={
              <button className="btn sm" onClick={() => retry(convoId, m.id)}>
                <RefreshCw size={14} /> Retry
              </button>
            }
          >
            {m.error}
          </Banner>
        )}

        {m.status === "stopped" && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span className="muted">You stopped this answer.</span>
            {isLast && (
              <button className="btn sm" onClick={() => retry(convoId, m.id)}>
                <RefreshCw size={14} /> Regenerate
              </button>
            )}
          </div>
        )}

        {m.status === "done" && (
          <>
            {m.thought && (
              <div className="thought-accordion">
                <button type="button" className="thought-toggle" onClick={() => setShowThought(!showThought)}>
                  <Sparkles size={14} color="var(--blue)" />
                  <span style={{ flex: 1 }}>Tools used</span>
                  {showThought ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {showThought && (
                  <div className="thought-details">
                    <p style={{ margin: "0 0 6px" }}>{m.thought}</p>
                    {m.toolCalls && m.toolCalls.length > 0 && (
                      <div className="thought-tools">
                        {m.toolCalls.map((tc, idx) => (
                          <div key={idx} className="tool-call-row">
                            <Wrench size={12} />
                            <span>
                              Executed: <b>{tc.tool}</b>({JSON.stringify(tc.args)})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {m.actionsTaken && m.actionsTaken.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {m.actionsTaken.map((act, idx) => (
                  <Banner key={idx} tone="ok">
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircle2 size={14} /> {act}
                    </span>
                  </Banner>
                ))}
              </div>
            )}

            {m.text && <Markdown>{m.text}</Markdown>}

            <div className="ai-actions-bar">
              <button className="ai-action-btn" onClick={copy} title={copied ? "Copied!" : "Copy response"}>
                {copied ? <Check size={14} color="var(--pos)" /> : <Copy size={14} />}
                <span className="action-label">{copied ? "Copied" : "Copy"}</span>
              </button>
              {isLast && (
                <button className="ai-action-btn" onClick={() => retry(convoId, m.id)} title="Regenerate answer">
                  <RefreshCw size={14} />
                  <span className="action-label">Regenerate</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Thread() {
  const { id } = useParams<{ id: string }>();
  const { conversations, loaded, send, stop, addToProject } = useChat();
  const { projects } = useData();
  const toast = useToast();
  const convo = conversations.find((c) => c.id === id);
  const [picker, setPicker] = useState(false);
  const [projectId, setProjectId] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const count = convo?.messages.length ?? 0;
  const last = convo?.messages.at(-1);
  const busy = last?.role === "ai" && last.status === "thinking";
  const project = projects.find((p) => p.id === convo?.projectId);
  const chosenProject = projectId || projects[0]?.id;

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [count, last?.role === "ai" ? last.status : null]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollBottom(distanceToBottom > 160);
  };

  if (!convo) {
    if (!loaded) return <div className="page" />;
    return (
      <div className="page">
        <div className="card" style={{ maxWidth: 560, margin: "48px auto 0" }}>
          <Empty
            icon={<AlertTriangle size={18} />}
            title="We can’t find this chat."
            action={<Link href="/chat" className="btn primary">Start a new chat</Link>}
          >
            It may have been deleted, or the link is from another account.
          </Empty>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-layout">
      <header className="chat-top-bar">
        <div className="chat-top-left">
          <div className="chat-model-pill">
            <span className="chat-model-name">Fremwork 1.0</span>
            <span className="chat-mode-tag">{last?.role === "ai" ? last.mode : "Balanced"}</span>
          </div>
          <div className="chat-title-divider" />
          <h1 className="chat-top-title" title={convo.title}>{convo.title}</h1>
        </div>
        <div className="chat-top-right">
          {project && <Link href={`/projects/${project.id}`} className="status ok">{project.name}</Link>}
          <button className="btn sm ghost" onClick={() => setPicker(true)} title="Add to project">
            <FolderPlus size={15} />
            <span className="hide-mobile">Project</span>
          </button>
          <Link href="/chat" className="btn sm ghost" title="New chat">
            <SquarePen size={15} />
            <span className="hide-mobile">New chat</span>
          </Link>
        </div>
      </header>

      <div className="thread-messages" ref={scrollContainerRef} onScroll={handleScroll}>
        <div className="thread-center">
          {convo.messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="msg-user-row">
                <div className="msg-user-bubble">
                  {m.files && m.files.length > 0 && (
                    <div className="msg-user-files">
                      {m.files.map((f, i) => (
                        <div key={i} className="msg-file-pill">
                          <span className="file-tag">{f.ext}</span>
                          <span className="file-name">{f.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="msg-user-text">{m.text}</div>
                </div>
              </div>
            ) : (
              <AiMessage key={m.id} m={m} convoId={convo.id} isLast={m.id === last?.id} />
            )
          )}
          <div ref={endRef} />
        </div>
      </div>

      {showScrollBottom && (
        <button type="button" className="scroll-bottom-btn" onClick={scrollToBottom} aria-label="Scroll to bottom" title="Scroll to bottom">
          <ArrowDown size={16} />
        </button>
      )}

      <div className="thread-composer-dock">
        <div className="composer-center">
          <Composer
            docked
            busy={busy}
            onSend={(text, files) => {
              send(convo.id, text, files);
            }}
            onStop={() => {
              if (last && last.role === "ai") stop(convo.id, last.id);
            }}
          />
        </div>
      </div>

      {picker && (
        <Modal
          title="Add to project"
          sub="Group this conversation with related chats and reports."
          onClose={() => setPicker(false)}
          footer={
            <>
              <button className="btn" onClick={() => setPicker(false)}>Cancel</button>
              {projects.length > 0 && (
                <button
                  className="btn primary"
                  onClick={() => {
                    addToProject(convo.id, chosenProject);
                    setPicker(false);
                    toast(`Added to ${projects.find((p) => p.id === chosenProject)?.name}`);
                  }}
                >
                  Add to project
                </button>
              )}
            </>
          }
        >
          <div className="dialog-body">
            {projects.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>You don’t have any projects yet. <Link href="/projects">Create one first.</Link></p>
            ) : (
              <Field id="proj-pick" label="Choose project">
                {(a) => (
                  <select {...a} className="select" value={chosenProject} onChange={(e) => setProjectId(e.target.value)}>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
              </Field>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
