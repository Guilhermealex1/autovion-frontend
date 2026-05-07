"use client";

import { useState, useEffect } from "react";
import { useRouter }   from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useApp }       from "@/app/(app)/layout";
import { fmt }          from "@/lib/utils";
import type { Project } from "@/types";

const ESTILOS: Record<string, string> = {
  viral: "⚡", dark: "🌑", motivacional: "🔥", curiosidades: "🧠", relaxante: "🌊"
};

export default function DashboardPage() {
  const { profile }           = useApp();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const sb     = createClient();
  const router = useRouter();

  useEffect(() => {
    if (!profile) return;
    sb.from("projects").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { setProjects((data as Project[]) ?? []); setLoading(false); });
  }, [profile]);

  async function deletar(id: string) {
    await sb.from("projects").delete().eq("id", id);
    setProjects(prev => prev.filter(p => p.id !== id));
  }

  const total     = projects.length;
  const prontos   = projects.filter(p => p.status === "ready").length;
  const durTotal  = projects.reduce((a, p) => a + (p.script?.duracao_total ?? 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin"/>
    </div>
  );

  return (
    <div>
      {/* Welcome */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-black text-xl tracking-tight">
            Olá, <span className="gradient-text">{profile?.name?.split(" ")[0] ?? "criador"}</span> 👋
          </h1>
          <p className="text-muted text-sm mt-1">Seu estúdio de conteúdo com IA</p>
        </div>
        {profile?.plan === "free" && (
          <button onClick={() => router.push("/config")}
            className="text-sm font-bold px-4 py-2 rounded-xl text-white"
            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 4px 14px rgba(124,58,237,.4)" }}>
            ⚡ Upgrade Pro
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { l: "Vídeos",        v: total,         icon: "🎬", c: "#8b5cf6" },
          { l: "Prontos",       v: prontos,        icon: "✅", c: "#10b981" },
          { l: "Duração Total", v: fmt(durTotal),  icon: "⏱️", c: "#22d3ee" },
        ].map(s => (
          <div key={s.l} className="rounded-2xl p-4 relative overflow-hidden border border-border" style={{ background: "#0c0f1c" }}>
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg,${s.c}88,transparent)` }}/>
            <div className="text-xl mb-2">{s.icon}</div>
            <div className="font-black text-2xl" style={{ color: s.c }}>{s.v}</div>
            <div className="text-[11px] text-muted mt-0.5">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Projects */}
      {projects.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border">
          <div className="text-5xl mb-3">🎬</div>
          <div className="font-bold text-lg mb-2">Nenhum vídeo ainda</div>
          <div className="text-muted text-sm mb-5">Crie seu primeiro vídeo com IA em segundos</div>
          <button onClick={() => router.push("/criar")}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
            ⚡ Criar agora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p, i) => (
            <div key={p.id} className="rounded-2xl border border-border overflow-hidden transition-all hover:-translate-y-0.5 hover:border-[#2d3560] animate-fadeUp"
              style={{ background: "#0c0f1c", animationDelay: `${i * 0.05}s` }}>
              <div className="h-32 relative flex items-center justify-center text-5xl cursor-pointer"
                style={{ background: "linear-gradient(135deg,#111428,#161b33)" }}>
                {ESTILOS[p.style] ?? "🎬"}
                <div className="absolute bottom-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: "rgba(0,0,0,.75)", color: "#94a3b8" }}>
                  {fmt(p.script?.duracao_total ?? 0)}
                </div>
                <div className="absolute top-2 right-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,.2)", color: "#10b981", border: "1px solid rgba(16,185,129,.3)" }}>
                    Pronto
                  </span>
                </div>
              </div>
              <div className="p-3.5">
                <div className="font-bold text-sm leading-snug line-clamp-2 mb-1.5">{p.script?.titulo ?? p.theme}</div>
                <div className="text-[11px] text-muted mb-3">
                  {new Date(p.created_at).toLocaleDateString("pt-BR")} · {p.style} · {p.format}
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>▶ Abrir</button>
                  <button onClick={() => deletar(p.id)} className="px-3 py-1.5 rounded-lg text-xs border border-border text-muted hover:text-red-400 hover:border-red-400/50 transition-colors">🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
