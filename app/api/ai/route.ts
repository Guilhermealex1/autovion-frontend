import { routeToAI, buildARIAPrompt } from "@/lib/ai/router";
import { createClient }              from "@/lib/supabase/server";
import type { ChatMessage }          from "@/lib/ai/router";

export const runtime = "edge";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages, context, chatId } = await req.json() as {
      messages: ChatMessage[];
      context:  { projectCount: number; styles: string[]; recentThemes: string[]; plan: string };
      chatId?:  string;
    };

    if (!messages?.length) {
      return new Response("messages required", { status: 400 });
    }

    const system = buildARIAPrompt(context ?? { projectCount: 0, styles: [], recentThemes: [], plan: "free" });

    const { stream, model } = await routeToAI({ system, messages, maxTokens: 2048 });

    // Return streaming response with model header
    const dataStream = stream.toDataStreamResponse({
      headers: { "X-Model-Used": model },
    });

    return dataStream;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
