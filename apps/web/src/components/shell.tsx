"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3, ChevronDown, Clock, Database, FileText, Folder, HelpCircle, LayoutGrid, LogOut, Menu,
  MessageSquare, PanelLeft, Plus, Search, SlidersHorizontal, Target, Wallet, ArrowLeftRight, WifiOff, X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useChat } from "@/components/chat-store";
import { ConfirmDialog } from "@/components/forms";
import { Banner, Logo, Mark } from "@/components/ui";
import { api } from "@/lib/client/api";
import { useData } from "@/lib/client/store";
import { cx } from "@/lib/format";

type Item = { href: string; label: string; icon: typeof Plus; kbd?: string };
const WORKSPACE: Item[] = [
  { href: "/search", label: "Search", icon: Search, kbd: "Ctrl K" },
  { href: "/projects", label: "Projects", icon: Folder },
  { href: "/reports", label: "Financial Reports", icon: FileText },
  { href: "/scheduled", label: "Scheduled Tasks", icon: Clock },
];
const TOOLS: Item[] = [
  { href: "/overview", label: "Overview", icon: LayoutGrid },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/budgets", label: "Budgets", icon: Wallet },
  { href: "/goals", label: "Financial Goals", icon: Target },
  { href: "/data-sources", label: "Data sources", icon: Database },
];

function readLS<T>(k: string, d: T): T {
  try { const v = localStorage.getItem(k); return v == null ? d : (JSON.parse(v) as T); } catch { return d; }
}
function writeLS(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked: keep in memory */ }
}

const isActive = (path: string, href: string) => path === href || path.startsWith(href + "/");

function SignOut({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { user, refresh } = useData();
  return (
    <ConfirmDialog title="Sign out of Fremwork?" sub={user?.email} confirmLabel="Sign out" onClose={onClose}
      body="You can sign back in at any time."
      onConfirm={async () => { await api.post("/api/auth/me").catch(() => {}); await refresh(); router.push("/sign-in"); }} />
  );
}

export function Sidebar() {
  const path = usePathname();
  const { conversations } = useChat();
  const { user } = useData();
  const initial = (user?.name || "?").charAt(0).toUpperCase();
  const [slim, setSlim] = useState(false);
  const [shut, setShut] = useState<Record<string, boolean>>({});
  const [menu, setMenu] = useState(false);
  const [signOut, setSignOut] = useState(false);
  const footRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setSlim(readLS("fw_slim", false)); setShut(readLS("fw_shut", {})); }, []);
  useEffect(() => {
    const close = (e: MouseEvent) => footRef.current && !footRef.current.contains(e.target as Node) && setMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const toggleSlim = () => { setSlim(!slim); writeLS("fw_slim", !slim); };
  const flip = (g: string) => { const n = { ...shut, [g]: !shut[g] }; setShut(n); writeLS("fw_shut", n); };

  const link = (it: Item) => (
    <Link key={it.href} href={it.href} className="nav-item" aria-current={isActive(path, it.href) ? "page" : undefined} title={slim ? it.label : undefined} aria-label={slim ? it.label : undefined}>
      <it.icon size={18} strokeWidth={1.7} aria-hidden />
      {!slim && <><span className="label">{it.label}</span>{it.kbd && <span className="kbd">{it.kbd}</span>}</>}
    </Link>
  );
  const group = (name: string, items: ReactNode) => {
    const open = slim || !shut[name];
    return (
      <nav className="nav-group" aria-label={name}>
        {!slim && (
          <button type="button" className="group-toggle overline" aria-expanded={!shut[name]} onClick={() => flip(name)}>
            {name}<ChevronDown size={13} strokeWidth={2} aria-hidden />
          </button>
        )}
        {open && items}
      </nav>
    );
  };

  return (
    <aside className={cx("sidebar", slim && "slim")} aria-label="Main navigation">
      <div className="side-top">
        <Link href="/chat" aria-label="Fremwork, new chat" style={{ lineHeight: 0 }}>{slim ? <Mark /> : <Logo />}</Link>
        <button type="button" className="icon-btn" onClick={toggleSlim} aria-label={slim ? "Expand sidebar" : "Collapse sidebar"} title={slim ? "Expand sidebar" : "Collapse sidebar"}><PanelLeft size={18} /></button>
      </div>
      <div className="side-scroll">
        <nav className="nav-group" aria-label="Workspace">
          <Link href="/chat" className="nav-item primary" aria-label={slim ? "New chat" : undefined} title={slim ? "New chat" : undefined}><Plus size={18} aria-hidden />{!slim && <span className="label">New chat</span>}</Link>
          {WORKSPACE.map(link)}
        </nav>
        {group("Financial tools", TOOLS.map(link))}
        {!slim && group("Recents", conversations.length ? conversations.slice(0, 8).map((c) => (
          <Link key={c.id} href={`/chat/${c.id}`} className="nav-item recent" aria-current={path === `/chat/${c.id}` ? "page" : undefined} title={c.title}><span className="label">{c.title}</span></Link>
        )) : <span className="muted" style={{ padding: "6px 10px", fontSize: 13 }}>Your chats will show up here.</span>)}
      </div>
      <div className="side-foot" ref={footRef}>
        {menu && (
          <nav className="account-menu" aria-label="Account">
            {!slim && user && <div style={{ padding: "6px 10px 8px", borderBottom: "1px solid var(--mist)", marginBottom: 4 }}><div style={{ fontWeight: 500 }}>{user.name}</div><div className="muted" style={{ fontSize: 12.5 }}>{user.email}</div></div>}
            {[{ href: "/settings", label: "Settings", icon: SlidersHorizontal }, { href: "/help", label: "Help & Support", icon: HelpCircle }].map((it) => (
              <Link key={it.label} href={it.href} className="nav-item" onClick={() => setMenu(false)} aria-label={slim ? it.label : undefined}><it.icon size={18} aria-hidden />{!slim && <span className="label">{it.label}</span>}</Link>
            ))}
            {user
              ? <button type="button" className="nav-item" onClick={() => { setMenu(false); setSignOut(true); }} aria-label={slim ? "Sign out" : undefined}><LogOut size={18} aria-hidden />{!slim && <span className="label">Sign out</span>}</button>
              : <Link href="/sign-in" className="nav-item" onClick={() => setMenu(false)} aria-label={slim ? "Sign in" : undefined}><LogOut size={18} aria-hidden />{!slim && <span className="label">Sign in</span>}</Link>}
          </nav>
        )}
        <button type="button" className="profile-btn" aria-expanded={menu} aria-label="Account menu" onClick={() => setMenu(!menu)}>
          <span className="avatar">{initial}</span>
          {!slim && <>
            <span style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}><b style={{ display: "block", fontWeight: 500 }}>{user?.name ?? "Your account"}</b><span className="muted" style={{ fontSize: 12 }}>{user ? user.company : "Not signed in"}</span></span>
            <ChevronDown size={16} color="var(--muted)" style={{ transform: menu ? "rotate(180deg)" : undefined }} />
          </>}
        </button>
      </div>
      {signOut && <SignOut onClose={() => setSignOut(false)} />}
    </aside>
  );
}

const TABS: Item[] = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/overview", label: "Overview", icon: LayoutGrid },
  { href: "/transactions", label: "Activity", icon: ArrowLeftRight },
  { href: "/reports", label: "Reports", icon: FileText },
];
const MORE: Item[] = [
  { href: "/search", label: "Search", icon: Search },
  { href: "/projects", label: "Projects", icon: Folder },
  { href: "/scheduled", label: "Scheduled", icon: Clock },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/budgets", label: "Budgets", icon: Wallet },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/data-sources", label: "Data", icon: Database },
  { href: "/settings", label: "Settings", icon: SlidersHorizontal },
  { href: "/help", label: "Help", icon: HelpCircle },
];

export function TabBar() {
  const path = usePathname();
  const [more, setMore] = useState(false);
  const [signOut, setSignOut] = useState(false);
  useEffect(() => setMore(false), [path]);
  const inMore = MORE.some((m) => isActive(path, m.href));
  return (
    <nav className="tabbar" aria-label="Main">
      {more && (
        <div className="more-sheet" role="menu" aria-label="More">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 6px 10px" }}>
            <span className="overline">More</span>
            <button type="button" className="icon-btn" aria-label="Close" onClick={() => setMore(false)}><X size={16} /></button>
          </div>
          <div className="more-grid">
            {MORE.map((m) => (
              <Link key={m.href} href={m.href} role="menuitem" className="more-item" aria-current={isActive(path, m.href) ? "page" : undefined}>
                <span className="ic"><m.icon size={18} aria-hidden /></span>{m.label}
              </Link>
            ))}
          </div>
          <button type="button" className="btn ghost block" style={{ marginTop: 8, color: "var(--neg)" }} onClick={() => setSignOut(true)}><LogOut size={16} />Sign out</button>
        </div>
      )}
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className="tab" aria-current={isActive(path, t.href) ? "page" : undefined}>
          <span className="pill"><t.icon size={20} strokeWidth={isActive(path, t.href) ? 2 : 1.7} aria-hidden /></span>{t.label}
        </Link>
      ))}
      <button type="button" className={cx("tab", (inMore || more) && "on")} aria-haspopup="menu" aria-expanded={more} onClick={() => setMore(!more)}>
        <span className="pill"><Menu size={20} aria-hidden /></span>More
      </button>
      {signOut && <SignOut onClose={() => setSignOut(false)} />}
    </nav>
  );
}

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const on = () => setOffline(false), off = () => setOffline(true);
    setOffline(!navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  if (!offline) return null;
  return (
    <div style={{ padding: "12px clamp(16px, 3.4vw, 40px) 0" }}>
      <Banner tone="warn" title="You’re offline."><WifiOff size={14} style={{ verticalAlign: -2, marginRight: 4 }} aria-hidden />Fremwork will reconnect on its own. New questions and changes won’t send until then.</Banner>
    </div>
  );
}

export function KeyboardShortcuts() {
  const router = useRouter();
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); router.push("/search"); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [router]);
  return null;
}
