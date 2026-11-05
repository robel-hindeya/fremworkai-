import { getDb } from "../db";
import type { AttachedFile } from "@/components/chat-store";

export interface MessageRecord {
  id: string;
  conversation_id: string;
  role: "user" | "ai";
  kind?: string;
  mode?: string;
  status: "thinking" | "done" | "error" | "stopped" | "limit";
  text?: string;
  file_name?: string;
  files: AttachedFile[];
  created_at: string;
}

export interface ConversationRecord {
  id: string;
  title: string;
  project_id?: string;
  created_at: string;
  updated_at: string;
  messages?: MessageRecord[];
}

export const ChatRepo = {
  getAllConversations(): ConversationRecord[] {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM conversations ORDER BY updated_at DESC").all() as any[];
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      project_id: r.project_id || undefined,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  },

  getConversation(id: string): ConversationRecord | null {
    const db = getDb();
    const c = db.prepare("SELECT * FROM conversations WHERE id = ?").get(id) as any;
    if (!c) return null;

    const msgs = db.prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC").all(id) as any[];

    return {
      id: c.id,
      title: c.title,
      project_id: c.project_id || undefined,
      created_at: c.created_at,
      updated_at: c.updated_at,
      messages: msgs.map((m) => ({
        id: m.id,
        conversation_id: m.conversation_id,
        role: m.role as "user" | "ai",
        kind: m.kind || undefined,
        mode: m.mode || undefined,
        status: m.status as any,
        text: m.text || undefined,
        file_name: m.file_name || undefined,
        files: JSON.parse(m.files_json || "[]"),
        created_at: m.created_at,
      })),
    };
  },

  createConversation(title: string, id?: string, projectId?: string): ConversationRecord {
    const db = getDb();
    const cid = id || `c-${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO conversations (id, title, project_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(cid, title, projectId || null, now, now);

    return this.getConversation(cid)!;
  },

  addMessage(conversationId: string, msg: Omit<MessageRecord, "conversation_id" | "created_at" | "id"> & { id?: string }): MessageRecord {
    const db = getDb();
    let convo = this.getConversation(conversationId);
    if (!convo) {
      convo = this.createConversation(msg.text?.slice(0, 48) || "New chat", conversationId);
    }

    const mid = msg.id || `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO messages (id, conversation_id, role, kind, mode, status, text, file_name, files_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      mid,
      conversationId,
      msg.role,
      msg.kind || null,
      msg.mode || "Balanced",
      msg.status || "done",
      msg.text || null,
      msg.file_name || null,
      JSON.stringify(msg.files || []),
      now
    );

    db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(now, conversationId);

    return {
      id: mid,
      conversation_id: conversationId,
      role: msg.role,
      kind: msg.kind,
      mode: msg.mode,
      status: msg.status,
      text: msg.text,
      file_name: msg.file_name,
      files: msg.files || [],
      created_at: now,
    };
  },

  /** Removes the AI replies after the last user message, so that message can be answered again. */
  dropTrailingAiMessages(conversationId: string) {
    const db = getDb();
    const messages = this.getConversation(conversationId)?.messages ?? [];
    for (const m of messages.reverse()) {
      if (m.role !== "ai") break;
      db.prepare("DELETE FROM messages WHERE id = ?").run(m.id);
    }
  },

  updateMessage(id: string, patch: Partial<MessageRecord>) {
    const db = getDb();
    const current = db.prepare("SELECT * FROM messages WHERE id = ?").get(id) as any;
    if (!current) return;

    const status = patch.status ?? current.status;
    const kind = patch.kind ?? current.kind;
    const text = patch.text ?? current.text;

    db.prepare("UPDATE messages SET status = ?, kind = ?, text = ? WHERE id = ?").run(status, kind, text, id);
  },

  renameConversation(id: string, title: string) {
    const db = getDb();
    db.prepare("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?").run(title, new Date().toISOString(), id);
  },

  deleteConversation(id: string): boolean {
    const db = getDb();
    db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(id);
    const res = db.prepare("DELETE FROM conversations WHERE id = ?").run(id);
    return res.changes > 0;
  },
};
