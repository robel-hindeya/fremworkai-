import { NextRequest, NextResponse } from "next/server";
import { runFinancialAgent } from "@/lib/server/agent/engine";
import { ChatRepo } from "@/lib/server/repositories/chat";
import { TasksRepo } from "@/lib/server/repositories/tasks";

export const runtime = "nodejs";

/** Run a task now: send its prompt to the AI and save the result as a new chat. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const task = TasksRepo.getAll().find((t) => t.id === id);
    if (!task) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    const stamp = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

    try {
      const res = await runFinancialAgent([{ role: "user", text: task.prompt }]);
      const convo = ChatRepo.createConversation(`${task.name} · ${stamp}`);
      ChatRepo.addMessage(convo.id, { role: "user", text: task.prompt, files: [], status: "done" });
      ChatRepo.addMessage(convo.id, { role: "ai", mode: "Balanced", status: "done", text: res.text, files: [] });
      const updated = TasksRepo.update(id, { last: `${stamp} · Completed`, lastFailed: false });
      return NextResponse.json({ success: true, data: { ok: true, task: updated, message: `${task.name} finished. The result is in your chats.` } });
    } catch (err: any) {
      const updated = TasksRepo.update(id, { last: `${stamp} · Failed`, lastFailed: true });
      return NextResponse.json({ success: true, data: { ok: false, task: updated, message: err.message } });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = TasksRepo.update(id, body);
    if (!updated) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = TasksRepo.delete(id);
    if (!ok) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Task deleted" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
