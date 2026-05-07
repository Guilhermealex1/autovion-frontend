"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useApp }       from "@/app/(app)/layout";
import type { Profile } from "@/types";

const PLANOS = [
  { id:"free",   nome:"Free",   preco:0,   cor:"#64748b", features:["3 vídeos/mês","Roteiro com IA","720p export"] },
  { id:"pro",    nome:"Pro",    preco:47,  cor:"#8b5cf6", features:["30 vídeos/mês","1080p export","ARIA IA","Todas as vozes"], destaque:true },
  { id:"agency", nome:"Agency", preco:197, cor:"#f59e0b", features:["Ilimitado","4K export","API access","Suporte dedicado"] },
];

export default function ConfigPage() {
  const { profile, refresh } = useApp();
  const [keys, setKeys]    = useState<Record<string,string>>({});
  const [nome, setNome]    = useState("");
  const [salvo, setSalvo]  = useState(false);
  const sb = createClient();

  useEffect(() => {
    if (!profile) return;
    setKeys(profile.api_keys ?? {});
    setNome(profile.name ?? "");
  }, [profile]);

  async function salvar() {
    if (!profile) return;
    await sb.from("profiles").update({ api_keys: keys, name: nome }).eq("id", profile.id);
    setSalvo(true); refresh();
    setTimeout(() => setSalvo(false), 2000);
  }

  async function simularUpgrade(plano: string) {
    if (!profile || plano === "free") return;
    await sb.from("profiles").update({ plan: plano, credits: 99999 }).eq("id", profile.id);
    refresh();
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="font-black text-2xl mb-1">Configurações</h1>
      <p className="text-muted text-sm mb-6">Configure suas chaves de API e preferências</p>

      {/* Profile */}
      {profile && (
        <div className="rounded-2xl p-4 border border-border mb-4 flex items-center gap-3" style={{ background: "#0c0f1c" }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
            {(profile.name ?? "U")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <input value={nome} onChange={e => setNome(e.target.value)}
              className="font-bold text-sm bg-transparent outline-none text-white w-full"/>
            <div className="text-xs text-muted">Clique no nome para editar</div>
          </div>
          <span className="text-[10px] font-bold px-2 py-1 rounded-full border"
            style={{ color: profile.plan === "pro" ? "#8b5cf6" : profile.plan === "agency" ? "#f59e0b" : "#64748b", borderColor: "currentColor" }}>
            {profile.plan.toUpperCase()}
          </span>
        </div>
      )}

      {/* API Keys */}
      <div className="font-bold text-sm mb-3">🔑 API Keys</div>
      {[
        { key:"gemini",     label:"Gemini (Google)",    placeholder:"AIza...",   url:"https://aistudio.google.com/app/apikey", icon:"✨", note:"Principal — gratuita e recomendada" },
        { key:"anthropic",  label:"Anthropic (Claude)", placeholder:"sk-ant-...",url:"https://console.anthropic.com",           icon:"🤖", note:"Fallback Claude" },
        { key:"openai",     label:"OpenAI",             placeholder:"sk-...",    url:"https://platform.openai.com",            icon:"🧠", note:"Fallback GPT-4o Mini" },
        { key:"elevenlabs", label:"ElevenLabs (TTS)",   placeholder:"...",       url:"https://elevenlabs.io",                  icon:"🎙️", note:"Síntese de voz realista" },
      ].map(f => (
        <div key={f.key} className="rounded-2xl p-4 border border-border mb-3" style={{ background: "#0c0f1c" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">{f.icon}</span>
              <div>
                <div className="text-sm font-semibold">{f.label}</div>
                <div className="text-[11px] text-muted">{f.note}</div>
              </div>
            </div>
            <a href={f.url} target="_blank" className="text-xs text-accent-light hover:underline">Obter →</a>
          </div>
          <input type="password" value={keys[f.key] ?? ""} onChange={e => setKeys(k => ({ ...k, [f.key]: e.target.value }))}
            placeholder={f.placeholder}
            className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-xs text-white placeholder-muted outline-none focus:border-accent transition-colors font-mono"/>
          <div className="mt-2 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: (keys[f.key]?.length ?? 0) > 8 ? "#10b981" : "#f43f5e" }}/>
            <span className="text-[10px] text-muted">{(keys[f.key]?.length ?? 0) > 8 ? "Configurada" : "Não configurada"}</span>
          </div>
        </div>
      ))}

      <button onClick={salvar}
        className="px-6 py-2.5 rounded-xl text-sm font-bold text-white mb-8"
        style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 4px 14px rgba(124,58,237,.4)" }}>
        {salvo ? "✓ Salvo!" : "💾 Salvar configurações"}
      </button>

      {/* Plans */}
      <div className="font-bold text-sm mb-3">💎 Planos</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PLANOS.map(p => (
          <div key={p.id}
            className="rounded-2xl p-5 border relative transition-transform hover:-translate-y-0.5"
            style={{
              background: p.destaque ? "linear-gradient(145deg,#111428,#161b33)" : "#0c0f1c",
              borderColor: profile?.plan === p.id ? p.cor : "#1a1f38",
              borderWidth:  profile?.plan === p.id ? 2 : 1,
              animation: p.destaque ? "glow 3s infinite" : "none",
            }}>
            {p.destaque && <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black text-white px-3 py-0.5 rounded-full whitespace-nowrap"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>Mais Popular</div>}
            <div className="font-black text-sm mb-1" style={{ color: p.cor }}>{p.nome}</div>
            <div className="font-black text-2xl mb-3" style={{ color: p.cor }}>
              {p.preco === 0 ? "Grátis" : `R$${p.preco}`}
              {p.preco > 0 && <span className="text-xs font-normal text-muted">/mês</span>}
            </div>
            {p.features.map((f, i) => (
              <div key={i} className="text-xs text-slate-400 mb-1.5 flex gap-1.5">
                <span style={{ color: p.cor }}>✓</span>{f}
              </div>
            ))}
            {profile?.plan !== p.id && p.id !== "free" && (
              <button onClick={() => simularUpgrade(p.id)}
                className="w-full mt-3 py-1.5 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-90"
                style={{ background: `linear-gradient(135deg,${p.cor},${p.cor}cc)` }}>
                Assinar
              </button>
            )}
            {profile?.plan === p.id && (
              <div className="mt-3 text-xs font-bold text-center" style={{ color: p.cor }}>✓ Plano atual</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
