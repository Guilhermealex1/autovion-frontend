"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { usePathname, useRouter }   from "next/navigation";
import { createClient }             from "@/lib/supabase/client";
import type { Profile }             from "@/types";

const NAV = [
  { id: "dashboard", href: "/dashboard", icon: "▣",  label: "Dashboard"     },
  { id: "criar",     href: "/criar",     icon: "⚡",  label: "Criar Vídeo"   },
  { id: "aria",      href: "/aria",      icon: "🤖",  label: "ARIA — IA"     },
  { id: "config",    href: "/config",    icon: "⚙️", label: "Configurações"  },
];

interface AppCtx { profile: Profile | null; refresh: () => void; }
export const AppContext = createContext<AppCtx>({ profile: null, refresh: () => {} });
export const useApp = () => useContext(AppContext);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [open, setOpen]       = useState(true);
  const [mobile, setMobile]   = useState(false);
  const pathname = usePathname();
  const router   = useRouter();
  const sb       = createClient();

  useEffect(() => {
    const check = () => {
      const isMobile = window.innerWidth < 768;
      setMobile(isMobile);
      if (isMobile) setOpen(false);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return router.push("/login");
    const { data } = await sb.from("profiles").select("*").eq("id", user.id).single();
    setProfile(data as Profile | null);
  };

  useEffect(() => { loadProfile(); }, []);

  async function logout() {
    await sb.auth.signOut();
    router.push("/login");
  }

  const Logo = () => (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm animate-float"
        style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 4px 14px rgba(124,58,237,.5)", flexShrink: 0 }}>▶</div>
      <div>
        <div className="font-black text-[15px] tracking-tight">
          Auto<span className="gradient-text">vion</span>
        </div>
        <div className="text-[8px] text-muted tracking-widest font-semibold">AI VIDEO ENGINE</div>
      </div>
    </div>
  );

  return (
    <AppContext.Provider value={{ profile, refresh: loadProfile }}>
      <div className="flex min-h-screen bg-bg">

        {/* Mobile overlay */}
        {mobile && open && (
          <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setOpen(false)}/>
        )}

        {/* Sidebar */}
        <aside className={`
          ${mobile ? "fixed" : "sticky"} top-0 left-0 h-screen z-50
          flex flex-col border-r border-border transition-all duration-250 overflow-hidden
          ${open ? (mobile ? "w-56" : "w-52") : "w-0 md:w-14"}
        `} style={{ background: "#080a12" }}>

          <div className="flex items-center justify-between p-3 border-b border-border min-w-max">
            {open && <Logo/>}
            {!open && !mobile && <div className="mx-auto text-base">▶</div>}
            <button onClick={() => setOpen(v => !v)}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-xs text-muted hover:text-white transition-colors"
              style={{ background: "#111428", border: "1px solid #1a1f38", flexShrink: 0, marginLeft: open ? 8 : 0 }}>
              {open ? "◀" : "▶"}
            </button>
          </div>

          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
            {NAV.map(item => {
              const active = pathname.startsWith(item.href);
              return (
                <button key={item.id} onClick={() => { router.push(item.href); if (mobile) setOpen(false); }}
                  className={`w-full flex items-center rounded-xl px-2.5 py-2 text-sm font-medium transition-all text-left
                    ${open ? "gap-2.5 justify-start" : "justify-center"}
                    ${active ? "text-accent-light" : "text-muted hover:text-white"}`}
                  style={{
                    background: active ? "rgba(139,92,246,.15)" : "transparent",
                    border: `1px solid ${active ? "rgba(139,92,246,.3)" : "transparent"}`,
                  }}>
                  <span className="text-[15px] flex-shrink-0">{item.icon}</span>
                  {open && <span>{item.label}</span>}
                  {item.id === "aria" && open && (
                    <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(34,211,238,.2)", color: "#22d3ee" }}>AI</span>
                  )}
                </button>
              );
            })}
          </nav>

          {open && profile && (
            <div className="p-2.5 border-t border-border space-y-2">
              <div className="rounded-xl p-2.5" style={{ background: "rgba(139,92,246,.08)", border: "1px solid rgba(139,92,246,.2)" }}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] font-bold text-accent-light">{profile.plan.toUpperCase()}</span>
                  {profile.plan === "free" && (
                    <button onClick={() => router.push("/config")}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white"
                      style={{ background: "#7c3aed" }}>⬆ Pro</button>
                  )}
                </div>
                {profile.plan === "free" && (
                  <>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "#1a1f38" }}>
                      <div className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#7c3aed,#22d3ee)", width: `${((3 - (profile.credits ?? 0)) / 3) * 100}%` }}/>
                    </div>
                    <div className="text-[10px] text-muted mt-1">{profile.credits ?? 0}/3 créditos</div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
                  {(profile.name ?? "U")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{profile.name ?? "Usuário"}</div>
                </div>
                <button onClick={logout} className="text-muted hover:text-white text-xs transition-colors" title="Sair">↩</button>
              </div>
            </div>
          )}
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="sticky top-0 z-30 px-5 py-3 flex items-center justify-between border-b border-border glass">
            {mobile && (
              <button onClick={() => setOpen(true)} className="mr-3 text-muted hover:text-white transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
            )}
            <div className="text-sm font-semibold text-muted">
              {NAV.find(n => pathname.startsWith(n.href))?.label ?? "Autovion"}
            </div>
            <div className="flex gap-2">
              <button onClick={() => router.push("/criar")}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-slate-300 hover:border-accent/50 transition-colors"
                style={{ background: "#111428" }}>+ Novo Vídeo</button>
              {profile?.plan === "free" && (
                <button onClick={() => router.push("/config")}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg text-white"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 4px 12px rgba(124,58,237,.4)" }}>
                  ⚡ Pro
                </button>
              )}
            </div>
          </header>

          <main className="flex-1 overflow-auto p-5">{children}</main>
        </div>
      </div>
    </AppContext.Provider>
  );
}
