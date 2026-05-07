export interface Profile {
  id: string;
  name: string | null;
  plan: "free" | "pro" | "agency";
  credits: number;
  api_keys: Record<string, string>;
  updated_at: string;
}

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  pinned: boolean;
  model_used: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  model: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string | null;
  theme: string;
  style: string;
  voice: string;
  format: string;
  script: VideoScript | null;
  status: "pending" | "ready" | "error";
  created_at: string;
}

export interface VideoScript {
  titulo: string;
  descricao: string;
  tags: string[];
  duracao_total: number;
  hook_score: number;
  cenas: Cena[];
}

export interface Cena {
  numero: number;
  titulo: string;
  narracao: string;
  descricao_visual: string;
  prompt_imagem: string;
  duracao: number;
  emocao: string;
}

export interface AIModel {
  id: string;
  label: string;
  provider: "google" | "anthropic" | "openai";
  cost: "free" | "cheap" | "medium";
}

export const AI_MODELS: AIModel[] = [
  { id: "gemini-1.5-flash",        label: "Gemini 1.5 Flash",  provider: "google",    cost: "free"   },
  { id: "gemini-1.5-pro",          label: "Gemini 1.5 Pro",    provider: "google",    cost: "cheap"  },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku",    provider: "anthropic", cost: "cheap"  },
  { id: "claude-sonnet-4-6",       label: "Claude Sonnet",     provider: "anthropic", cost: "medium" },
  { id: "gpt-4o-mini",             label: "GPT-4o Mini",       provider: "openai",    cost: "cheap"  },
];
