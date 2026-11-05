import { getDb } from "../db";
import type { Task } from "@/lib/data";

export interface TaskRecord extends Task {
  created_at?: string;
}

export const TasksRepo = {
  getAll(): TaskRecord[] {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM tasks ORDER BY created_at ASC").all() as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      prompt: r.prompt,
      freq: r.freq,
      next: r.next_run,
      last: r.last_run,
      lastFailed: Boolean(r.last_failed),
      on: Boolean(r.is_on),
      created_at: r.created_at,
    }));
  },

  create(data: { name: string; prompt: string; freq: string; next?: string }): TaskRecord {
    const db = getDb();
    const id = `t-${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    const next = data.next || "Run manually";

    db.prepare(`
      INSERT INTO tasks (id, name, prompt, freq, next_run, last_run, last_failed, is_on, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.prompt, data.freq, next, "Not run yet", 0, 1, now);

    const r = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as any;
    return {
      id: r.id,
      name: r.name,
      prompt: r.prompt,
      freq: r.freq,
      next: r.next_run,
      last: r.last_run,
      lastFailed: Boolean(r.last_failed),
      on: Boolean(r.is_on),
      created_at: r.created_at,
    };
  },

  update(id: string, patch: Partial<{ name: string; prompt: string; freq: string; next: string; last: string; lastFailed: boolean; on: boolean }>): TaskRecord | null {
    const db = getDb();
    const current = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as any;
    if (!current) return null;

    const name = patch.name ?? current.name;
    const prompt = patch.prompt ?? current.prompt;
    const freq = patch.freq ?? current.freq;
    const next_run = patch.next ?? current.next_run;
    const last_run = patch.last ?? current.last_run;
    const last_failed = patch.lastFailed !== undefined ? (patch.lastFailed ? 1 : 0) : current.last_failed;
    const is_on = patch.on !== undefined ? (patch.on ? 1 : 0) : current.is_on;

    db.prepare(`
      UPDATE tasks
      SET name = ?, prompt = ?, freq = ?, next_run = ?, last_run = ?, last_failed = ?, is_on = ?
      WHERE id = ?
    `).run(name, prompt, freq, next_run, last_run, last_failed, is_on, id);

    const r = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as any;
    return {
      id: r.id,
      name: r.name,
      prompt: r.prompt,
      freq: r.freq,
      next: r.next_run,
      last: r.last_run,
      lastFailed: Boolean(r.last_failed),
      on: Boolean(r.is_on),
      created_at: r.created_at,
    };
  },

  delete(id: string): boolean {
    const db = getDb();
    const res = db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
    return res.changes > 0;
  },
};
