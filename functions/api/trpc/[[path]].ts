import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { initTRPC } from "@trpc/server";
import { z } from "zod";
import superjson from "superjson";

// Create a minimal tRPC setup without database dependencies
const t = initTRPC.context<{ user: any }>().create({
  transformer: superjson,
});

const router = t.router;
const publicProcedure = t.procedure;

// Import only what we need without database
async function invokeLLM(params: {
  messages: Array<{ role: string; content: string }>;
  response_format?: any;
}) {
  const apiUrl = process.env.BUILT_IN_FORGE_API_URL || "https://api.deepseek.com";
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
  
  if (!apiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }

  const url = `${apiUrl}/v1/chat/completions`;
  
  const payload = {
    model: "deepseek-chat",
    messages: params.messages,
    max_tokens: 8192,
    ...(params.response_format && { response_format: params.response_format }),
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch from LLM API: ${response.status} ${response.statusText} – ${errorText}`);
  }

  return await response.json();
}

// Create a minimal router with only non-database routes
const minimalRouter = router({
  system: router({
    health: publicProcedure
      .input(z.object({ timestamp: z.number().min(0) }).optional())
      .query(() => ({ ok: true })),
  }),

  auth: router({
    me: publicProcedure.query(() => null),
    logout: publicProcedure.mutation(() => ({ success: true })),
  }),

  ai: router({
    generateJoke: publicProcedure
      .input(z.object({
        topic: z.string().min(1),
        keywords: z.array(z.string()).optional(),
        usePersonalStyle: z.boolean().default(false),
      }))
      .mutation(async ({ input }) => {
        const keywordsText = input.keywords && input.keywords.length > 0 
          ? `\n关键词：${input.keywords.join("、")}` 
          : "";

        const prompt = `请为话题"${input.topic}"创作一段脱口秀段子。${keywordsText}

要求：
1. 段子要有明确的铺垫和包袱
2. 语言要口语化，适合舞台表演
3. 长度控制在200-400字
4. 要有至少2-3个笑点`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "你是一位才华横溢的脱口秀编剧，擅长创作既有深度又有趣味的段子。你的作品风格独特，善于从日常生活中发现喜剧元素。" },
            { role: "user", content: prompt },
          ],
        });

        const rawContent = response.choices[0]?.message?.content;
        const contentText = typeof rawContent === 'string' ? rawContent : '';
        
        return {
          content: contentText,
          topic: input.topic,
          usedPersonalStyle: false,
        };
      }),
  }),

  brainstorm: router({
    generate: publicProcedure
      .input(z.object({ topic: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const prompt = `你是一位资深的脱口秀编剧顾问。请针对话题"${input.topic}"进行头脑风暴，提供创作灵感。

请按以下JSON格式返回（不要包含任何其他文字）：
{
  "angles": ["切入角度1", "切入角度2", "切入角度3", "切入角度4", "切入角度5"],
  "associations": ["相关联想1", "相关联想2", "相关联想3", "相关联想4", "相关联想5"],
  "punchlines": ["笑点方向1", "笑点方向2", "笑点方向3", "笑点方向4", "笑点方向5"]
}

要求：
- 切入角度：提供5个独特的视角来探讨这个话题
- 相关联想：提供5个与话题相关但出人意料的联想
- 笑点方向：提供5个可能产生喜剧效果的方向`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "你是一位专业的脱口秀编剧顾问，擅长从各种话题中挖掘喜剧潜力。请只返回JSON格式的结果。" },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "brainstorm_result",
              schema: {
                type: "object",
                properties: {
                  angles: { type: "array", items: { type: "string" } },
                  associations: { type: "array", items: { type: "string" } },
                  punchlines: { type: "array", items: { type: "string" } },
                },
                required: ["angles", "associations", "punchlines"],
              },
            },
          },
        });

        const rawContent = response.choices[0]?.message?.content;
        const contentText = typeof rawContent === 'string' ? rawContent : '';
        
        try {
          const result = JSON.parse(contentText);
          return {
            id: 0,
            topic: input.topic,
            ...result,
          };
        } catch {
          throw new Error("Failed to parse brainstorm result");
        }
      }),
  }),

  style: router({
    get: publicProcedure.query(() => ({
      comedyStyle: "",
      languageHabits: "",
      commonTags: [],
      tonePreference: "",
      targetAudience: "",
    })),
  }),
});

export const onRequest: PagesFunction = async (context) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: context.request,
    router: minimalRouter,
    createContext: async () => {
      return {
        user: null,
      };
    },
  });
};
