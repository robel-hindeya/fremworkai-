"use client";

import { Clock, Pause, Play, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useChat } from "@/components/chat-store";
import { TaskDialog } from "@/components/forms";
import { useToast } from "@/components/toast";
import { Banner, Empty, PageHeader, Status } from "@/components/ui";
import { type Task } from "@/lib/data";
import { useData } from "@/lib/client/store";

export default function Scheduled() {
  const { tasks, addTask, updateTask, runTask } = useData();
  const { reload } = useChat();
  const [creating, setCreating] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const toast = useToast();

  const run = async (t: Task) => {
    if (running) {
      toast("Another task is running. Try again when it finishes.", "err");
      return;
    }
    setRunning(t.id);
    const res = await runTask(t.id);
    setRunning(null);
    if (res.success) reload();
    toast(res.message, res.success ? "ok" : "err");
  };

  const active = tasks.filter((t) => t.on).length;
  const failing = tasks.filter((t) => t.lastFailed);

  return (
    <div className="page">
      <PageHeader eyebrow="Workspace" title="Scheduled tasks" sub="Saved analyses you can run with one click. Automatic scheduling isn’t active yet."
        actions={<button className="btn primary" onClick={() => setCreating(true)}><Plus size={16} />New task</button>} />
      {failing.length > 0 && <Banner tone="err" title={`${failing.map((t) => t.name).join(", ")} failed on its last run.`}>Run it again, or check that the AI is connected.</Banner>}
      {tasks.length === 0 ? (
        <div className="card"><Empty icon={<Clock size={18} />} title="No tasks yet." action={<button className="btn primary" onClick={() => setCreating(true)}>Create your first task</button>}>Save a question you ask often, like a weekly summary, and run it any time.</Empty></div>
      ) : (
      <section className="card" style={{ overflow: "hidden" }}>
        <div className="card-head"><div><h2>{active} active · {tasks.length - active} paused</h2><p>Times shown in your time zone</p></div></div>
        <div className="table-wrap">
          <table className="t" style={{ minWidth: 900 }}>
            <thead><tr><th>Task</th><th>Frequency</th><th>Next run</th><th>Last run</th><th>Status</th><th className="r">Actions</th></tr></thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td style={{ whiteSpace: "normal", minWidth: 260 }}><b style={{ fontWeight: 500 }}>{t.name}</b><div className="muted" style={{ fontSize: 12.5, maxWidth: "44ch" }}>{t.prompt}</div></td>
                  <td>{t.freq}</td>
                  <td className="num" style={{ color: t.on ? undefined : "var(--muted)" }}>{t.on ? t.next : "Paused"}</td>
                  <td style={{ color: t.lastFailed ? "var(--neg)" : "var(--muted)" }}>{t.last}</td>
                  <td><Status tone={t.lastFailed ? "err" : t.on ? "ok" : ""}>{t.lastFailed ? "Failed" : t.on ? "Active" : "Paused"}</Status></td>
                  <td className="r" style={{ whiteSpace: "nowrap" }}>
                    <button className="icon-btn" aria-label={t.lastFailed ? `Retry ${t.name}` : `Run ${t.name} now`} title={t.lastFailed ? "Retry" : "Run now"} disabled={running === t.id} onClick={() => run(t)}>{t.lastFailed ? <RotateCcw size={16} /> : <Play size={16} />}</button>
                    <button className="btn sm" onClick={() => { updateTask(t.id, { on: !t.on }); toast(`${t.name} ${t.on ? "paused" : "resumed"}`); }}>{t.on ? <><Pause size={14} />Pause</> : <><Play size={14} />Resume</>}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}
      {creating && (
        <TaskDialog
          onClose={() => setCreating(false)}
          onAdd={(n) =>
            addTask({
              name: n.name,
              prompt: n.prompt,
              freq: `${n.freq} · ${n.time}`,
              next: "Run manually",
            })
          }
        />
      )}
    </div>
  );
}
