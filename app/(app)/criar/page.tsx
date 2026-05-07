"use client";

import { useState }    from "react";
import { useRouter }   from "next/navigation";
import { useApp }      from "@/app/(app)/layout";
import { createClient } from "@/lib/supabase/client";

const ESTILOS = [
  { id:"viral",        emoji:"⚡", label:"Viral / Hype",      desc:"Gancho agressivo, ritmo acelerado" },
  { id:"dark",         emoji:"🌑", label:"Dark & Misterioso", desc:"Atmosférico, sombrio, intrigante" },
  { id:"motivacional", emoji:"🔥", label:"Motivacional",      desc:"Alta energia, frases de impacto" },
  { id:"curiosidades", emoji:"🧠", label:"Curiosidades",      desc:"Fatos surpreendentes e didáticos" },
  { id:"relaxante",    emoji:"🌊", label:"Relaxante",         desc:"Tom calmo e contemplativo" },
];

const VOZES = [
  { id:"echo",    label:"Echo",    desc:"Masculino, grave",     icon:"🎙️" },
  { id:"onyx",    label:"Onyx",    desc:"Profundo, dramático",  icon:"🔊" },
  { id:"nova",    label:"Nova",    desc:"Feminino, expressivo", icon:"✨" },
  { id:"shimmer", label:"Shimmer", desc:"Suave, narrativo",     icon:"🌟" },
];

const PIPELINE = [
  { icon:"📝", label:"Gerando Roteiro com IA" },
  { icon:"🎙️", label:"Sintetizando Narração" },
  { icon:"🖼️", label:"Gerando Imagens" },
  { icon:"✂️", label:"Editando com Transições" },
  { icon:"⚙️", label:"Renderizando Vídeo Final" },
  { icon:"📦", label:"Exportando MP4" },
];

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span className="inline-block rounded-full border-2 border-white/30 border-t-white animate-spin flex-shrink-0"
      style={{ width: size, height: size }}/>
  );
}

export default function CriarPage() {
  const { profile }    = useApp();
  const router         = useRouter();
  const sb             = createClient();

  const [tema, setTema]     = useState("");
  const [estilo, setEstilo] = useState("viral");
  const [voz, setVoz]       = useState("echo");
  const [formato, setFmt]   = useState("youtube");
  const [loading, setLoad]  = useState(false);
  const [step, setStep]     = useState(-1);
  const [erro, setErro]     = useState("");

  const podeCriar = profile?.plan !== "free" || (profile?.credits ?? 0) > 0;

  async function gerar() {
    if (!tema.trim()) return setErro("Digite um tema.");
    if (!podeCriar)   return setErro("Créditos esgotados. Faça upgrade nas Configurações.");
    setErro(""); setLoad(true); setStep(0);

    try {
      // Step 0: generate script via API route (server-side AI)
      const res = await fetch("/api/pipeline", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ tema, estilo, formato }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error ?? `Erro ${res.status}`);
      }
      const { script } = await res.json();

      // Steps 1-5: simulate remaining pipeline stages
      for (let i = 1; i < PIPELINE.length; i++) {
        setStep(i);
        await new Promise(r => setTimeout(r, 700 + Math.random() * 500));
      }
      setStep(PIPELINE.length);

      // Save to Supabase
      if (profile) {
        await sb.from("projects").insert({
          user_id: profile.id,
          title:   script.titulo,
          theme:   tema,
          style:   estilo,
          voice:   voz,
          format:  formato,
          script,
          status:  "ready",
        });

        if (profile.plan === "free") {
          await sb.from("profiles")
            .update({ credits: Math.max(0, (profile.credits ?? 1) - 1) })
            .eq("id", profile.id);
        }
      }

      await new Promise(r => setTimeout(r, 600));
      router.push("/dashboard");
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Falha ao gerar";
      setErro("Erro: " + msg);
      setLoad(false);
      setStep(-1);
    }
  }

  // ── Pipeline modal ──────────────────────────────────────────────────────────
  if (step >= 0 && loading) {
    const done = step >= PIPELINE.length;
    const pct  = Math.min(Math.round((step / PIPELINE.length) * 100), 100);

    return (
      <div className="fixed inset-0 flex items-center justify-center p-5 z-50"
        style={{ background: "rgba(4,5,10,.93)", backdropFilter: "blur(16px)" }}>
        <div className="w-full max-w-md rounded-2xl p-8 border border-accent/30 animate-fadeUp"
          style={{ background: "#0c0f1c", boxShadow: "0 0 60px rgba(139,92,246,.15)" }}>

          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
              style={{
                background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                boxShadow: "0 0 40px rgba(124,58,237,.5)",
                animation: done ? "none" : "spin 4s linear infinite",
              }}>
              {done ? "✅" : "⚙️"}
            </div>
            <h2 className="font-black text-xl">{done ? "Vídeo Pronto!" : "Gerando seu vídeo..."}</h2>
            <p className="text-muted text-sm mt-1">
              {done ? "Pipeline concluído!" : `Etapa ${Math.min(step + 1, PIPELINE.length)} de ${PIPELINE.length}`}
            </p>
          </div>

          <div className="mb-5">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted">Progresso</span>
              <span className="text-accent-light font-bold">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1a1f38" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ background: "linear-gradient(90deg,#7c3aed,#22d3ee)", width: `${pct}%` }}/>
            </div>
          </div>

          <div className="space-y-2">
            {PIPELINE.map((s, i) => {
              const feito = i < step;
              const atual = i === step;
              return (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all"
                  style={{
                    background: atual ? "rgba(139,92,246,.12)" : feito ? "rgba(16,185,129,.06)" : "transparent",
                    border: `1px solid ${atual ? "rgba(139,92,246,.4)" : feito ? "rgba(16,185,129,.2)" : "#1a1f38"}`,
                  }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs flex-shrink-0"
                    style={{ background: feito ? "rgba(16,185,129,.2)" : atual ? "rgba(139,92,246,.2)" : "#111428" }}>
                    {feito ? "✓" : atual ? <Spinner size={12}/> : s.icon}
                  </div>
                  <span className="text-xs font-medium"
                    style={{ color: feito ? "#10b981" : atual ? "#a78bfa" : "#475569" }}>
                    {s.label}
                  </span>
                  {atual && (
                    <span className="ml-auto text-[10px] text-accent-light" style={{ animation: "pulse 1.5s infinite" }}>
                      processando...
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="font-black text-2xl tracking-tight">
          Criar Vídeo <span className="gradient-text">com IA</span>
        </h1>
        <p className="text-muted text-sm mt-1">Do tema ao vídeo em 1 clique. Pipeline automatizado.</p>
      </div>

      {!podeCriar && (
        <div className="mb-4 p-4 rounded-xl border"
          style={{ background: "rgba(244,63,94,.08)", borderColor: "rgba(244,63,94,.3)" }}>
          <div className="font-semibold text-red-400 text-sm">⚠️ Créditos esgotados</div>
          <div className="text-muted text-xs mt-1">Faça upgrade nas Configurações para continuar.</div>
        </div>
      )}

      {/* Tema */}
      <div className="rounded-2xl p-4 border border-border mb-3" style={{ background: "#0c0f1c" }}>
        <label className="text-[10px] font-bold text-muted tracking-widest block mb-2">TEMA DO VÍDEO *</label>
        <input
          value={tema}
          onChange={e => { setTema(e.target.value); setErro(""); }}
          placeholder="Ex: A verdade sombria sobre dormir menos de 6 horas..."
          onKeyDown={e => e.key === "Enter" && gerar()}
          className="w-full px-3.5 py-3 rounded-xl bg-card border border-border text-sm text-white placeholder-muted outline-none focus:border-accent transition-colors"
        />
        {erro && <div className="text-red-400 text-xs mt-2">{erro}</div>}
      </div>

      {/* Estilo */}
      <div className="rounded-2xl p-4 border border-border mb-3" style={{ background: "#0c0f1c" }}>
        <label className="text-[10px] font-bold text-muted tracking-widest block mb-3">ESTILO NARRATIVO</label>
        <div className="grid grid-cols-2 gap-2">
          {ESTILOS.map(s => (
            <div key={s.id} onClick={() => setEstilo(s.id)}
              className="p-3 rounded-xl cursor-pointer flex items-center gap-2.5 transition-all"
              style={{
                background: estilo === s.id ? "rgba(139,92,246,.12)" : "#111428",
                border: `1px solid ${estilo === s.id ? "rgba(139,92,246,.5)" : "#1a1f38"}`,
              }}>
              <span className="text-lg">{s.emoji}</span>
              <div>
                <div className="text-xs font-bold" style={{ color: estilo === s.id ? "#a78bfa" : "#f8fafc" }}>{s.label}</div>
                <div className="text-[10px] text-muted">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Voz + Formato */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-2xl p-4 border border-border" style={{ background: "#0c0f1c" }}>
          <label className="text-[10px] font-bold text-muted tracking-widest block mb-2">VOZ</label>
          {VOZES.map(v => (
            <div key={v.id} onClick={() => setVoz(v.id)}
              className="p-2 rounded-lg cursor-pointer mb-1.5 flex items-center gap-2 transition-all"
              style={{
                background: voz === v.id ? "rgba(79,70,229,.15)" : "#111428",
                border: `1px solid ${voz === v.id ? "rgba(99,102,241,.5)" : "#1a1f38"}`,
              }}>
              <span className="text-sm">{v.icon}</span>
              <div>
                <div className="text-xs font-semibold" style={{ color: voz === v.id ? "#818cf8" : "#f8fafc" }}>{v.label}</div>
                <div className="text-[10px] text-muted">{v.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-4 border border-border" style={{ background: "#0c0f1c" }}>
          <label className="text-[10px] font-bold text-muted tracking-widest block mb-2">FORMATO</label>
          {[
            { id:"youtube", label:"YouTube",    ratio:"16:9", icon:"▶️" },
            { id:"shorts",  label:"Shorts/TikTok", ratio:"9:16", icon:"📱" },
          ].map(f => (
            <div key={f.id} onClick={() => setFmt(f.id)}
              className="p-3 rounded-xl cursor-pointer mb-2 flex items-center gap-2.5 transition-all"
              style={{
                background: formato === f.id ? "rgba(6,182,212,.1)" : "#111428",
                border: `1px solid ${formato === f.id ? "rgba(6,182,212,.4)" : "#1a1f38"}`,
              }}>
              <span className="text-lg">{f.icon}</span>
              <div>
                <div className="text-sm font-semibold" style={{ color: formato === f.id ? "#22d3ee" : "#f8fafc" }}>{f.label}</div>
                <div className="text-[10px] text-muted">{f.ratio}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={gerar}
        disabled={loading || !tema.trim() || !podeCriar}
        className="w-full py-4 rounded-xl text-base font-black text-white flex items-center justify-center gap-2.5 disabled:opacity-40 transition-opacity"
        style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 8px 30px rgba(124,58,237,.4)" }}>
        {loading ? <><Spinner size={20}/>Gerando pipeline...</> : "⚡ Gerar Vídeo Automático"}
      </button>
    </div>
  );
}
