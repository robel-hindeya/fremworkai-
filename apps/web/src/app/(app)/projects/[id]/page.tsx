"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ChevronLeft, FileText, MessageSquare } from "lucide-react";
import { useChat } from "@/components/chat-store";
import { Empty, PageHeader } from "@/components/ui";
import { useData } from "@/lib/client/store";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { conversations } = useChat();
  const { projects, loading } = useData();
  const project = projects.find((p) => p.id === id);

  if (loading) return <div className="page" />;

  if (!project) {
    return (
      <div className="page"><div className="card" style={{ maxWidth: 560, margin: "48px auto 0" }}>
        <Empty icon={<AlertTriangle size={18} />} title="We can’t find this project." action={<Link href="/projects" className="btn primary">See all projects</Link>}>It may have been deleted, or you don’t have access to it.</Empty>
      </div></div>
    );
  }
  const chats = conversations.filter((c) => project.chats.includes(c.id) || c.projectId === project.id);

  return (
    <div className="page">
      <Link href="/projects" className="btn sm ghost" style={{ alignSelf: "flex-start", marginLeft: -8 }}><ChevronLeft size={16} />All projects</Link>
      <PageHeader eyebrow="Project" title={project.name} sub={project.desc}
        actions={<Link href="/chat" className="btn primary">New chat</Link>} />
      <div className="grid cols-2">
        <section className="card">
          <div className="card-head"><h3>Conversations</h3><span className="overline">{chats.length}</span></div>
          {chats.length ? chats.map((c) => <Link key={c.id} href={`/chat/${c.id}`} className="list-row"><MessageSquare size={18} color="var(--faint)" /><span className="main"><b>{c.title}</b><small>{c.messages.length} messages</small></span></Link>)
            : <Empty title="No chats yet.">Start a chat here and it stays with this project.</Empty>}
        </section>
        <section className="card">
          <div className="card-head"><h3>Reports</h3><span className="overline">{project.reports.length}</span></div>
          {project.reports.length ? project.reports.map((r) => <Link key={r} href="/reports" className="list-row"><FileText size={18} color="var(--faint)" /><span className="main"><b>{r}</b><small>Financial report</small></span></Link>)
            : <Empty title="No reports yet.">Save one from a chat or from Financial reports.</Empty>}
        </section>
      </div>
    </div>
  );
}
