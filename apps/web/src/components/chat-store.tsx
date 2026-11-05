"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "@/lib/client/api";
import { useData } from "@/lib/client/store";

export type Mode = "Fast" | "Balanced" | "Deep Analysis";
export type AttachedFile = { name: string; ext: string; size: string };
export type Message =
  | { id: string; role: "user"; text: string; files: AttachedFile[] }
  | {
      id: string;
      role: "ai";
      mode: Mode;
      status: "thinking" | "done" | "error" | "stopped";
      text?: string;
      error?: string;
      thought?: string;
      toolCalls?: { tool: string; args: any; result: any }[];
      actionsTaken?: string[];
    };
export type Conversation = { id: string; title: string; projectId?: string; messages: Message[] };

type Ctx = {
  conversations: Conversation[];
  loaded: boolean;
  mode: Mode;
  setMode: (m: Mode) => void;
  send: (convoId: string | null, text: string, files: AttachedFile[]) => string;
  stop: (convoId: string, msgId: string) => void;
  retry: (convoId: string, msgId: string) => void;
  addToProject: (convoId: string, projectId: string) => void;
  rename: (convoId: string, title: string) => void;
  remove: (convoId: string) => void;
  reload: () => Promise<void>;
};

const ChatCtx = createContext<Ctx | null>(null);
const uid = () => Math.random().toString(36).slice(2, 10);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { refresh } = useData();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<Mode>("Balanced");
  const requests = useRef<Record<string, AbortController>>({});
  const latest = useRef(conversations);
  latest.current = conversations;

  const reload = useCallback(async () => {
    try {
      const list = await api.get<{ id: string }[]>("/api/chat");
      const details = await Promise.all(list.slice(0, 50).map((c) => api.get<any>(`/api/chat/${c.id}`).catch(() => null)));
      const stored: Conversation[] = details.filter(Boolean).map((d) => ({
        id: d.id,
        title: d.title,
        projectId: d.project_id,
        messages: (d.messages ?? []).map((m: any) => ({
          id: m.id,
          role: m.role,
          mode: (m.mode as Mode) || "Balanced",
          status: m.status,
          text: m.text,
          files: m.files || [],
        })),
      }));
      // Chats that are mid-answer stay as they are on screen.
      setConversations((cs) => {
        const live = cs.filter((c) => c.messages.some((m) => m.role === "ai" && m.status !== "done"));
        return [...live, ...stored.filter((s) => !live.some((c) => c.id === s.id))];
      });
    } catch {
      // The sidebar stays empty and the next send will surface any real problem.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const patchMsg = useCallback((cid: string, mid: string, patch: Partial<Message>) => {
    setConversations((cs) =>
      cs.map((c) => (c.id !== cid ? c : { ...c, messages: c.messages.map((m) => (m.id === mid ? ({ ...m, ...patch } as Message) : m)) }))
    );
  }, []);

  const ask = useCallback(
    async (cid: string, mid: string, text: string, files: AttachedFile[], retry: boolean) => {
      const controller = new AbortController();
      requests.current[mid] = controller;
      try {
        const res = await api.post<{ aiMessage: any }>("/api/chat", { conversationId: cid, text, files, mode, retry }, { signal: controller.signal });
        const { text: answer, thought, toolCalls, actionsTaken } = res.aiMessage;
        patchMsg(cid, mid, { status: "done", text: answer, thought, toolCalls, actionsTaken, error: undefined });
        if (actionsTaken?.length) refresh();
      } catch (e: any) {
        if (controller.signal.aborted) return;
        patchMsg(cid, mid, { status: "error", error: e.message || "Something went wrong." });
      } finally {
        delete requests.current[mid];
      }
    },
    [mode, patchMsg, refresh]
  );

  const send = useCallback<Ctx["send"]>(
    (convoId, text, files) => {
      const cid = convoId ?? uid();
      const q = text.trim() || (files.length ? "Analyze the attached file." : "");
      const mid = uid();
      const ai: Message = { id: mid, role: "ai", mode, status: "thinking" };
      const user: Message = { id: uid(), role: "user", text: q, files };

      setConversations((cs) => {
        if (cs.some((c) => c.id === cid)) return cs.map((c) => (c.id === cid ? { ...c, messages: [...c.messages, user, ai] } : c));
        return [{ id: cid, title: q.replace(/[.?!]+$/, "").slice(0, 48) || "New chat", messages: [user, ai] }, ...cs];
      });

      ask(cid, mid, q, files, false);
      return cid;
    },
    [ask, mode]
  );

  const stop = useCallback(
    (cid: string, mid: string) => {
      requests.current[mid]?.abort();
      patchMsg(cid, mid, { status: "stopped" });
    },
    [patchMsg]
  );

  const retry = useCallback(
    (cid: string, mid: string) => {
      const messages = latest.current.find((c) => c.id === cid)?.messages ?? [];
      const prompt = messages.slice(0, messages.findIndex((m) => m.id === mid)).findLast((m) => m.role === "user");
      if (prompt?.role !== "user") return;
      patchMsg(cid, mid, { status: "thinking", mode, text: undefined, error: undefined, thought: undefined, toolCalls: undefined, actionsTaken: undefined });
      ask(cid, mid, prompt.text, prompt.files, true);
    },
    [ask, mode, patchMsg]
  );

  const addToProject = useCallback((cid: string, projectId: string) => {
    setConversations((cs) => cs.map((c) => (c.id === cid ? { ...c, projectId } : c)));
  }, []);

  const rename = useCallback((cid: string, title: string) => {
    setConversations((cs) => cs.map((c) => (c.id === cid ? { ...c, title } : c)));
    api.put(`/api/chat/${cid}`, { title }).catch(() => {});
  }, []);

  const remove = useCallback((cid: string) => {
    setConversations((cs) => cs.filter((c) => c.id !== cid));
    api.delete(`/api/chat/${cid}`).catch(() => {});
  }, []);

  return (
    <ChatCtx.Provider value={{ conversations, loaded, mode, setMode, send, stop, retry, addToProject, rename, remove, reload }}>
      {children}
    </ChatCtx.Provider>
  );
}

export function useChat() {
  const c = useContext(ChatCtx);
  if (!c) throw new Error("useChat must be used inside ChatProvider");
  return c;
}
