"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter }    from "next/navigation";

type Mode = "login" | "register" | "forgot";

export default function LoginPage() {
  const [mode, setMode]       = useState<Mode>("login");
  const [email, setEmail]     = useState("");
  const [password, setPass]   = useState("");
  const [name, setName]       = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState<{ text: string; ok?: boolean } | null>(null);
  const router = useRouter();
  const sb     = createClient();

  async function submit() {
    setMsg(null);
    if (!email) return setMsg({ text: "Digite seu e-mail." });
    if (mode !== "forgot" && !password) return setMsg({ text: "Digite sua senha." });
    if (mode === "register" && !name) return setMsg({ text: "Digite seu nome." });

    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      } else if (mode === "register") {
        const { error } = await sb.auth.signUp({
          email, password,
          options: { data: { name }, emailRedirectTo: `${location.origin}/api/auth/callback` },
        });
        if (error) throw error;
        setMsg({ text: "✅ Conta criada! Verifique seu e-mail para confirmar.", ok: true });
      } else {
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/api/auth/callback`,
        });
        if (error) throw error;
        setMsg({ text: "✅ Link enviado! Verifique sua caixa de entrada.", ok: true });
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      setMsg({ text: err?.message ?? "Erro desconhecido." });
    }
    setLoading(false);
  }

  async function loginGoogle() {
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/api/auth/callback` },
    });
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-5 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(124,58,237,.07) 0%, transparent 70%)" }}/>
      <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(34,211,238,.05) 0%, transparent 70%)" }}/>

      <div className="w-full max-w-sm animate-fadeUp">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg animate-float"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 4px 20px rgba(124,58,237,.5)" }}>▶</div>
            <div>
              <div className="font-black text-lg tracking-tight">
                Auto<span className="gradient-text">vion</span>
              </div>
              <div className="text-[9px] text-muted tracking-widest font-semibold">AI VIDEO ENGINE</div>
            </div>
          </div>
          <p className="text-muted text-sm">Crie vídeos virais com inteligência artificial</p>
        </div>

        <div className="rounded-2xl p-7 border border-border"
          style={{ background: "#0c0f1c", boxShadow: "0 0 40px rgba(139,92,246,.08)" }}>

          {mode !== "forgot" && (
            <div className="flex bg-card rounded-xl p-1 mb-6">
              {(["login", "register"] as const).map((m) => (
                <button key={m} onClick={() => { setMode(m); setMsg(null); }}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{ background: mode === m ? "#161b33" : "transparent", color: mode === m ? "#f8fafc" : "#64748b" }}>
                  {m === "login" ? "Entrar" : "Criar conta"}
                </button>
              ))}
            </div>
          )}

          {mode === "forgot" && (
            <div className="mb-5">
              <button onClick={() => setMode("login")} className="text-muted text-sm hover:text-white transition-colors">← Voltar</button>
              <div className="font-bold text-lg mt-1.5">Recuperar senha</div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {mode === "register" && (
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Seu nome completo"
                className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-sm text-white placeholder-muted outline-none focus:border-accent transition-colors"/>
            )}
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="voce@email.com" onKeyDown={e => e.key === "Enter" && submit()}
              className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-sm text-white placeholder-muted outline-none focus:border-accent transition-colors"/>
            {mode !== "forgot" && (
              <div>
                {mode === "login" && (
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs text-muted">Senha</span>
                    <button onClick={() => setMode("forgot")} className="text-xs text-accent-light hover:underline">Esqueceu?</button>
                  </div>
                )}
                <input type="password" value={password} onChange={e => setPass(e.target.value)}
                  placeholder="••••••••" onKeyDown={e => e.key === "Enter" && submit()}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-sm text-white placeholder-muted outline-none focus:border-accent transition-colors"/>
              </div>
            )}

            {msg && (
              <div className={`text-sm rounded-xl px-3.5 py-2.5 border ${msg.ok ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
                {msg.text}
              </div>
            )}

            <button onClick={submit} disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50 mt-1"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 4px 20px rgba(124,58,237,.4)" }}>
              {loading ? (
                <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/>A carregar...</>
              ) : mode === "login" ? "Entrar na plataforma" : mode === "register" ? "Criar minha conta" : "Enviar link"}
            </button>

            <div className="flex items-center gap-2 my-1">
              <div className="flex-1 h-px bg-border"/>
              <span className="text-xs text-muted">ou</span>
              <div className="flex-1 h-px bg-border"/>
            </div>

            <button onClick={loginGoogle}
              className="w-full py-2.5 rounded-xl text-sm font-semibold border border-border bg-card text-white flex items-center justify-center gap-2.5 hover:border-accent/50 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar com Google
            </button>
          </div>

          <div className="mt-5 pt-4 border-t border-border text-center text-xs text-muted">
            Mais de <span className="text-accent-light font-bold">12.400 criadores</span> já usam o Autovion
          </div>
        </div>
      </div>
    </div>
  );
}
