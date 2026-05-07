import { google }    from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { openai }    from "@ai-sdk/openai";
import { streamText, type LanguageModel } from "ai";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RouteOptions {
  system:    string;
  messages:  ChatMessage[];
  maxTokens?: number;
  preferred?: string; // preferred model id
}

interface ProviderConfig {
  label:   string;
  model:   () => LanguageModel;
  envKey:  string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    label:  "Gemini Flash",
    envKey: "GEMINI_API_KEY",
    model:  () => google("gemini-1.5-flash"),
  },
  {
    label:  "Gemini Pro",
    envKey: "GEMINI_API_KEY",
    model:  () => google("gemini-1.5-pro"),
  },
  {
    label:  "Claude Haiku",
    envKey: "ANTHROPIC_API_KEY",
    model:  () => anthropic("claude-haiku-4-5-20251001"),
  },
  {
    label:  "Claude Sonnet",
    envKey: "ANTHROPIC_API_KEY",
    model:  () => anthropic("claude-sonnet-4-6"),
  },
  {
    label:  "GPT-4o Mini",
    envKey: "OPENAI_API_KEY",
    model:  () => openai("gpt-4o-mini"),
  },
];

function getAvailableProviders(preferred?: string) {
  const available = PROVIDERS.filter(p => !!process.env[p.envKey]);
  if (!preferred) return available;
  return [
    ...available.filter(p => p.label.toLowerCase().includes(preferred.toLowerCase())),
    ...available.filter(p => !p.label.toLowerCase().includes(preferred.toLowerCase())),
  ];
}

export async function routeToAI(opts: RouteOptions) {
  const providers = getAvailableProviders(opts.preferred);

  if (providers.length === 0) {
    throw new Error(
      "Nenhuma API de IA configurada. Adicione GEMINI_API_KEY, ANTHROPIC_API_KEY ou OPENAI_API_KEY nas variáveis de ambiente."
    );
  }

  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      const result = await streamText({
        model:     provider.model(),
        system:    opts.system,
        messages:  opts.messages,
        maxTokens: opts.maxTokens ?? 2048,
      });
      return { stream: result, model: provider.label };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[AI Router] ${provider.label} failed:`, lastError.message);
    }
  }

  throw lastError ?? new Error("Todos os modelos de IA falharam.");
}

// Build the ARIA system prompt with user context
export function buildARIAPrompt(ctx: {
  projectCount: number;
  styles:       string[];
  recentThemes: string[];
  plan:         string;
}) {
  const contextBlock =
    ctx.projectCount > 0
      ? `\n\nCONTEXTO DO USUÁRIO:
- Vídeos criados: ${ctx.projectCount}
- Estilos favoritos: ${ctx.styles.join(", ")}
- Temas recentes: ${ctx.recentThemes.join(" | ")}
- Plano: ${ctx.plan}`
      : "";

  return `Você é ARIA, a assistente de IA avançada e adaptativa do Autovion — plataforma de criação de vídeos com inteligência artificial.

Sua personalidade:
- Criativa, estratégica, direta ao ponto e altamente especializada
- Expert em marketing de conteúdo, SEO para vídeo, copywriting e tendências digitais
- Linguagem natural, amigável e profissional
- Exemplos práticos e acionáveis em todas as respostas
- Respostas concisas (máximo 200 palavras) exceto quando pedido detalhe explicitamente
- Quando relevante, use markdown para estruturar respostas (listas, negrito, etc.)${contextBlock}`;
}

// Non-streaming call for pipeline (script generation)
export async function callAI(prompt: string, maxTokens = 3000): Promise<string> {
  const providers = getAvailableProviders();
  if (providers.length === 0) throw new Error("Nenhuma API de IA configurada.");

  for (const provider of providers) {
    try {
      const { textStream } = await streamText({
        model:     provider.model(),
        messages:  [{ role: "user", content: prompt }],
        maxTokens,
      });
      let text = "";
      for await (const chunk of textStream) text += chunk;
      return text;
    } catch (err) {
      console.error(`[AI] ${provider.label} failed:`, err);
    }
  }
  throw new Error("Todos os modelos de IA falharam.");
}
