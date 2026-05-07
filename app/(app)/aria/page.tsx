"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useChat }       from "ai/react";
import { createClient }  from "@/lib/supabase/client";
import { useApp }        from "@/app/(app)/layout";
import { uid, truncate } from "@/lib/utils";
import type { Chat, Message, Project } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DBChat extends Chat { messages?: Message[] }

// ─── Sidebar chat item ────────────────────────────────────────────────────────

function ChatItem({ chat, active, onSelect, onPin, onDelete }: {
  chat:     DBChat;
  active:   boolean;
  onSelect: () => void;
  onPin:    () => void;
  onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="px-2.5 py-2 rounded-xl cursor-pointer transition-all mb-0.5 group"
      style={{
        background: active ? "rgba(139,92,246,.15)" : hover ? "rgba(255,255,255,.03)" : "transparent",
        border: `1px solid ${active ? "rgba(139,92,246,.3)" : "transparent"}`,
      }}>
      <div className="flex items-start gap-1.5">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate" style={{ color: active ? "#a78bfa" : "#cbd5e1" }}>
            {chat.pinned ? "📌 " : ""}{chat.title || "Nova Conversa"}
          </div>
          <div className="text-[11px] text-muted truncate mt-0.5">
            {new Date(chat.updated_at).toLocaleDateString("pt-BR")}
            {chat.model_used && <span className="ml-1 opacity-60">· {chat.model_used}</span>}
          </div>
        </div>
        {hover && (
          <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <button onClick={onPin} className="p-0.5 rounded text-[11px] hover:text-yellow-400 transition-colors"
              style={{ color: chat.pinned ? "#f59e0b" : "#475569" }}>📌</button>
            <button onClick={onDelete} className="p-0.5 rounded text-[11px] text-muted hover:text-red-400 transition-colors">✕</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Message renderer with simple markdown ────────────────────────────────────

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, s => `<ul>${s}</ul>`)
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[hul])(.+)$/gm, (m, p) => p ? `<p>${p}</p>` : "");
}

// ─── Main ARIA page ───────────────────────────────────────────────────────────

export default function ARIAPage() {
  const { profile }         = useApp();
  const sb                  = createClient();

  const [chats, setChats]     = useState<DBChat[]>([]);
  const [chatId, setChatId]   = useState<string | null>(null);
  const [initMsgs, setInitMsgs] = useState<{ id: string; role: "user"|"assistant"; content: string }[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sidebar, setSidebar]   = useState(true);
  const [search, setSearch]     = useState("");
  const [chatKey, setChatKey]   = useState(0); // force remount useChat on chat change
  const [modelUsed, setModelUsed] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef     = useRef<HTMLTextAreaElement>(null);

  // Load chats and projects on mount
  useEffect(() => {
    if (!profile) return;
    loadChats();
    loadProjects();
  }, [profile]);

  async function loadChats() {
    const { data } = await sb.from("chats").select("*").order("pinned", { ascending: false }).order("updated_at", { ascending: false }).limit(60);
    setChats((data as DBChat[]) ?? []);
  }

  async function loadProjects() {
    const { data } = await sb.from("projects").select("*").order("created_at", { ascending: false }).limit(10);
    setProjects((data as Project[]) ?? []);
  }

  async function selectChat(id: string) {
    const { data } = await sb.from("messages").select("*").eq("chat_id", id).order("created_at").limit(100);
    const msgs = (data as Message[]) ?? [];
    setInitMsgs(msgs.map(m => ({ id: m.id, role: m.role, content: m.content })));
    setChatId(id);
    setChatKey(k => k + 1);
  }

  async function newChat() {
    if (!profile) return;
    const { data } = await sb.from("chats").insert({ title: "Nova Conversa", user_id: profile.id }).select().single();
    if (!data) return;
    setChats(prev => [data as DBChat, ...prev]);
    setInitMsgs([]);
    setChatId(data.id);
    setChatKey(k => k + 1);
  }

  async function pinChat(id: string) {
    const chat = chats.find(c => c.id === id);
    if (!chat) return;
    await sb.from("chats").update({ pinned: !chat.pinned }).eq("id", id);
    setChats(prev => prev.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c));
  }

  async function deleteChat(id: string) {
    await sb.from("chats").delete().eq("id", id);
    setChats(prev => prev.filter(c => c.id !== id));
    if (chatId === id) { setChatId(null); setInitMsgs([]); setChatKey(k => k + 1); }
  }

  // Context for the AI
  const context = {
    projectCount:  projects.length,
    styles:        [...new Set(projects.map(p => p.style))],
    recentThemes:  projects.slice(0, 3).map(p => p.theme),
    plan:          profile?.plan ?? "free",
  };

  const filtered  = chats.filter(c => !search || c.title.toLowerCase().includes(search.toLowerCase()));
  const pinned    = filtered.filter(c => c.pinned);
  const recent    = filtered.filter(c => !c.pinned);

  return (
    <div className="flex rounded-2xl overflow-hidden border border-border" style={{ height: "calc(100vh - 100px)", background: "#080a12" }}>

      {/* ── Sidebar ── */}
      <div className={`flex-shrink-0 border-r border-border flex flex-col transition-all duration-250 overflow-hidden ${sidebar ? "w-56" : "w-0"}`}
        style={{ background: "#06080f" }}>

        <div className="p-2.5 border-b border-border space-y-2">
          <button onClick={newChat}
            className="w-full py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5"
            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
            ✏️ Nova Conversa
          </button>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar..."
            className="w-full px-2.5 py-1.5 rounded-lg bg-card border border-border text-xs text-white placeholder-muted outline-none focus:border-accent transition-colors"/>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5">
          {pinned.length > 0 && (
            <div>
              <div className="text-[9px] font-bold text-muted px-2 py-1.5 tracking-widest">FIXADAS</div>
              {pinned.map(c => <ChatItem key={c.id} chat={c} active={c.id === chatId} onSelect={() => selectChat(c.id)} onPin={() => pinChat(c.id)} onDelete={() => deleteChat(c.id)}/>)}
            </div>
          )}
          {recent.length > 0 && (
            <div>
              <div className="text-[9px] font-bold text-muted px-2 py-1.5 tracking-widest">RECENTES</div>
              {recent.map(c => <ChatItem key={c.id} chat={c} active={c.id === chatId} onSelect={() => selectChat(c.id)} onPin={() => pinChat(c.id)} onDelete={() => deleteChat(c.id)}/>)}
            </div>
          )}
          {filtered.length === 0 && (
            <div className="text-center text-muted text-xs py-8">{search ? "Nenhum resultado" : "Sem conversas ainda"}</div>
          )}
        </div>

        <div className="p-2 border-t border-border text-center">
          <span className="text-[10px] text-muted">{chats.length} conversa{chats.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* ── Chat Area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border flex-shrink-0" style={{ background: "#06080f" }}>
          <button onClick={() => setSidebar(v => !v)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-muted hover:text-white transition-colors flex-shrink-0"
            style={{ background: "#111428", border: "1px solid #1a1f38" }}>{sidebar ? "◀" : "▶"}</button>

          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 animate-glow"
            style={{ background: "linear-gradient(135deg,#7c3aed,#22d3ee)" }}>🤖</div>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold flex items-center gap-2">
              ARIA
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(34,211,238,.2)", color: "#22d3ee" }}>IA Adaptativa</span>
            </div>
            <div className="text-[11px] text-muted">
              {modelUsed ? `usando ${modelUsed}` : projects.length > 0 ? `${projects.length} vídeo${projects.length !== 1 ? "s" : ""} analisados` : "pronta para ajudar"}
            </div>
          </div>

          {chatId && (
            <button onClick={() => pinChat(chatId)}
              className="text-xs px-2.5 py-1 rounded-lg border border-border text-muted hover:text-white transition-colors">
              {chats.find(c => c.id === chatId)?.pinned ? "📌 Fixada" : "📌 Fixar"}
            </button>
          )}
          <button onClick={newChat} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border text-slate-400 hover:text-white hover:border-accent/50 transition-colors">+ Nova</button>
        </div>

        {/* Chat body */}
        <ChatBody
          key={chatKey}
          chatId={chatId}
          initialMessages={initMsgs}
          context={context}
          bottomRef={bottomRef}
          taRef={taRef}
          onChatCreated={(id, title) => {
            setChatId(id);
            setChats(prev => {
              if (prev.find(c => c.id === id)) return prev.map(c => c.id === id ? { ...c, title, updated_at: new Date().toISOString() } : c);
              return [{ id, title, user_id: profile?.id ?? "", pinned: false, model_used: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, ...prev];
            });
          }}
          onModelUsed={setModelUsed}
          profile={profile}
        />
      </div>
    </div>
  );
}

// ─── Chat Body (separate component so useChat remounts cleanly) ───────────────

function ChatBody({ chatId, initialMessages, context, bottomRef, taRef, onChatCreated, onModelUsed, profile }: {
  chatId:          string | null;
  initialMessages: { id: string; role: "user"|"assistant"; content: string }[];
  context:         { projectCount: number; styles: string[]; recentThemes: string[]; plan: string };
  bottomRef:       React.RefObject<HTMLDivElement | null>;
  taRef:           React.RefObject<HTMLTextAreaElement | null>;
  onChatCreated:   (id: string, title: string) => void;
  onModelUsed:     (model: string) => void;
  profile:         { id: string } | null;
}) {
  const sb = createClient();
  const currentChatId = useRef<string | null>(chatId);
  currentChatId.current = chatId;

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } = useChat({
    api:             "/api/ai",
    initialMessages,
    body:            { context },
    onResponse:      (res) => {
      const model = res.headers.get("X-Model-Used");
      if (model) onModelUsed(model);
    },
    onFinish: async (message) => {
      // Persist the assistant message to Supabase
      const cid = currentChatId.current;
      if (!cid || !profile) return;
      await sb.from("messages").insert({ chat_id: cid, role: "assistant", content: message.content });
      await sb.from("chats").update({ updated_at: new Date().toISOString() }).eq("id", cid);
    },
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isLoading]);

  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 140) + "px";
    }
  }, [input]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userContent = input.trim();
    let cid = currentChatId.current;

    // Create chat if needed
    if (!cid && profile) {
      const title = truncate(userContent, 45);
      const { data } = await sb.from("chats").insert({ title, user_id: profile.id }).select().single();
      if (data) {
        cid = data.id;
        currentChatId.current = cid;
        onChatCreated(cid, title);
      }
    }

    // Save user message
    if (cid) {
      await sb.from("messages").insert({ chat_id: cid, role: "user", content: userContent });
    }

    handleSubmit(e);
  }

  const suggestions = [
    ["⚡", "Crie um gancho viral para meu próximo vídeo"],
    ["📊", "Analise meu histórico e sugira temas em alta"],
    ["🎯", "Quais formatos de vídeo estão performando melhor?"],
    ["🧠", "Estrutura de script completa para YouTube Shorts"],
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !chatId && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="text-5xl mb-4 animate-float">🤖</div>
            <h2 className="font-black text-xl mb-2">Olá! Sou a ARIA.</h2>
            <p className="text-muted text-sm leading-relaxed mb-8 max-w-sm">
              Sua assistente de IA especializada em criação de conteúdo viral.<br/>
              Aprendo com seus projetos e fico mais inteligente a cada conversa.
            </p>
            <div className="grid grid-cols-2 gap-2.5 w-full max-w-md">
              {suggestions.map(([icon, txt]) => (
                <button key={txt} onClick={() => setInput(txt)}
                  className="text-left p-3.5 rounded-xl border border-border hover:border-accent/50 transition-all group"
                  style={{ background: "#0e1020" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#111428"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#0e1020"; }}>
                  <div className="text-xl mb-2">{icon}</div>
                  <div className="text-xs text-slate-400 leading-relaxed">{txt}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={m.id ?? i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"} items-end`}>
            {m.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#7c3aed,#22d3ee)" }}>🤖</div>
            )}
            <div className="flex flex-col gap-1" style={{ maxWidth: "76%" }}>
              <div
                className={`px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "prose-chat text-white" : "prose-chat text-slate-300"}`}
                style={{
                  borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
                  background:   m.role === "user" ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "#111428",
                  border:       m.role === "assistant" ? "1px solid #1a1f38" : "none",
                  wordBreak: "break-word",
                }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
              />
              {m.role === "assistant" && (
                <button onClick={() => navigator.clipboard?.writeText(m.content)}
                  className="text-[10px] text-muted hover:text-white transition-colors self-start px-1">
                  📋 Copiar
                </button>
              )}
            </div>
            {m.role === "user" && (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#6d28d9,#4338ca)" }}>U</div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5 items-end">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#7c3aed,#22d3ee)" }}>🤖</div>
            <div className="px-4 py-3 rounded-[4px_18px_18px_18px] text-sm text-slate-400 flex items-center gap-2"
              style={{ background: "#111428", border: "1px solid #1a1f38" }}>
              <span className="w-4 h-4 rounded-full border-2 border-accent/30 border-t-accent animate-spin flex-shrink-0"/>
              <span style={{ animation: "pulse 1.5s infinite" }}>Analisando...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <form onSubmit={submit} className="flex-shrink-0 px-4 pb-4 pt-3 border-t border-border" style={{ background: "#06080f" }}>
        <div className="flex gap-2.5 items-end rounded-2xl px-4 py-3 border transition-colors"
          style={{ background: "#111428", borderColor: "#232848" }}
          onFocusCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = "#8b5cf6"; }}
          onBlurCapture={e => { (e.currentTarget as HTMLElement).style.borderColor = "#232848"; }}>
          <textarea
            ref={taRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e as unknown as React.FormEvent); } }}
            placeholder="Pergunte à ARIA... (Enter para enviar, Shift+Enter para nova linha)"
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder-muted outline-none resize-none leading-relaxed"
            style={{ maxHeight: 140, overflowY: "auto" }}
          />
          <button type="submit" disabled={isLoading || !input.trim()}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 transition-all disabled:opacity-40"
            style={{ background: isLoading || !input.trim() ? "#1a1f38" : "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
            {isLoading ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"/> : "↑"}
          </button>
        </div>
        <div className="text-center mt-2 text-[10px] text-muted opacity-50">
          ARIA · {context.projectCount > 0 ? `${context.projectCount} projetos no contexto · ` : ""}Shift+Enter para nova linha
        </div>
      </form>
    </div>
  );
}
