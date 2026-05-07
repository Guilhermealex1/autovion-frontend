import { callAI } from "@/lib/ai/router";

export const runtime = "edge";
export const maxDuration = 90;

export async function POST(req: Request) {
  try {
    const { tema, estilo, formato } = await req.json() as {
      tema:    string;
      estilo:  string;
      formato: string;
    };

    if (!tema?.trim()) {
      return Response.json({ error: "tema obrigatório" }, { status: 400 });
    }

    const prompt = `Você é um roteirista expert em conteúdo viral para YouTube.
Crie um roteiro COMPLETO sobre: "${tema}"
Estilo: ${estilo.toUpperCase()}
Formato: ${formato === "shorts" ? "YouTube Shorts 60s" : "YouTube 90-150s"}
REGRAS: Gancho nos 3 primeiros segundos, cliffhanger entre cenas, linguagem conversacional.
Retorne APENAS JSON válido (sem markdown, sem texto extra):
{"titulo":"Título SEO","descricao":"1 linha","tags":["t1","t2","t3"],"duracao_total":120,"hook_score":8.5,"cenas":[{"numero":1,"titulo":"Nome","narracao":"Texto narrado.","descricao_visual":"Visual","prompt_imagem":"DALL-E prompt english","duracao":20,"emocao":"intriga"}]}`;

    const raw    = await callAI(prompt, 3000);
    const script = JSON.parse(raw.replace(/```json|```/g, "").trim());

    return Response.json({ script });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao gerar roteiro";
    return Response.json({ error: message }, { status: 500 });
  }
}
