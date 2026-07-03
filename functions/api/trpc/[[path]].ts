import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import superjson from "superjson";
import { UNAUTHED_ERR_MSG } from "../../../shared/const";

type CloudflareContext = {
  user: null;
};

const t = initTRPC.context<CloudflareContext>().create({
  transformer: superjson,
});

const router = t.router;
const publicProcedure = t.procedure;
const protectedProcedure = t.procedure.use(
  t.middleware(({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    return next({ ctx });
  })
);

const categoryEnum = z.enum([
  "politics",
  "life",
  "roast",
  "relationship",
  "work",
  "family",
  "tech",
  "other",
]);
const showStatusEnum = z.enum(["planned", "completed", "cancelled"]);

async function invokeLLM(params: {
  messages: Array<{ role: string; content: string }>;
  response_format?: unknown;
}) {
  const apiUrl =
    process.env.BUILT_IN_FORGE_API_URL || "https://api.deepseek.com";
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

  if (!apiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }

  const response = await fetch(
    `${apiUrl.replace(/\/$/, "")}/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: params.messages,
        max_tokens: 8192,
        ...(params.response_format
          ? { response_format: params.response_format }
          : {}),
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch from LLM API: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  return response.json();
}

const cloudflareRouter = router({
  system: router({
    health: publicProcedure
      .input(z.object({ timestamp: z.number().min(0) }).optional())
      .query(() => ({ ok: true })),
  }),

  auth: router({
    me: publicProcedure.query(() => null),
    logout: publicProcedure.mutation(() => ({ success: true })),
  }),

  style: router({
    get: protectedProcedure.query(() => ({
      id: 0,
      userId: 0,
      comedyStyle: null,
      languageHabits: null,
      commonTags: null,
      tonePreference: null,
      targetAudience: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    update: protectedProcedure
      .input(
        z.object({
          comedyStyle: z.string().optional(),
          languageHabits: z.string().optional(),
          commonTags: z.array(z.string()).optional(),
          tonePreference: z.string().optional(),
          targetAudience: z.string().optional(),
        })
      )
      .mutation(() => ({ success: true })),
  }),

  scripts: router({
    list: protectedProcedure
      .input(
        z
          .object({
            category: z.string().optional(),
            search: z.string().optional(),
          })
          .optional()
      )
      .query(() => []),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(() => null),
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1),
          content: z.string().min(1),
          category: categoryEnum.optional(),
          tags: z.array(z.string()).optional(),
        })
      )
      .mutation(() => ({ id: 0 })),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).optional(),
          content: z.string().min(1).optional(),
          category: categoryEnum.optional(),
          tags: z.array(z.string()).optional(),
        })
      )
      .mutation(() => ({ success: true })),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(() => ({ success: true })),
  }),

  shows: router({
    list: protectedProcedure.query(() => []),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(() => null),
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1),
          venue: z.string().optional(),
          showDate: z.number(),
          duration: z.number().optional(),
          notes: z.string().optional(),
          scriptIds: z.array(z.number()).optional(),
        })
      )
      .mutation(() => ({ id: 0 })),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).optional(),
          venue: z.string().optional(),
          showDate: z.number().optional(),
          duration: z.number().optional(),
          notes: z.string().optional(),
          status: showStatusEnum.optional(),
          scriptIds: z.array(z.number()).optional(),
        })
      )
      .mutation(() => ({ success: true })),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(() => ({ success: true })),
  }),

  inspirations: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(() => []),
    create: protectedProcedure
      .input(
        z.object({
          content: z.string().min(1),
          source: z.string().optional(),
          tags: z.array(z.string()).optional(),
        })
      )
      .mutation(() => ({ id: 0 })),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          content: z.string().min(1).optional(),
          source: z.string().optional(),
          tags: z.array(z.string()).optional(),
        })
      )
      .mutation(() => ({ success: true })),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(() => ({ success: true })),
    convertToScript: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1),
          category: categoryEnum.optional(),
          tags: z.array(z.string()).optional(),
        })
      )
      .mutation(() => ({ scriptId: 0 })),
  }),

  brainstorm: router({
    list: protectedProcedure.query(() => []),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(() => null),
    generate: publicProcedure
      .input(z.object({ topic: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "你是一位专业的脱口秀编剧顾问，擅长从各种话题中挖掘喜剧潜力。请只返回JSON格式的结果。",
            },
            {
              role: "user",
              content: `请针对话题"${input.topic}"进行头脑风暴，按JSON返回angles、associations、punchlines三个字符串数组。`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "brainstorm_result",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  angles: { type: "array", items: { type: "string" } },
                  associations: { type: "array", items: { type: "string" } },
                  punchlines: { type: "array", items: { type: "string" } },
                },
                required: ["angles", "associations", "punchlines"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices[0]?.message?.content;
        const result = JSON.parse(
          typeof rawContent === "string" ? rawContent : "{}"
        );
        return { id: 0, topic: input.topic, ...result };
      }),
  }),

  ai: router({
    generateJoke: publicProcedure
      .input(
        z.object({
          topic: z.string().min(1),
          keywords: z.array(z.string()).optional(),
          usePersonalStyle: z.boolean().default(false),
        })
      )
      .mutation(async ({ input }) => {
        const keywordsText =
          input.keywords && input.keywords.length > 0
            ? `\n关键词：${input.keywords.join("、")}`
            : "";

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "你是一位才华横溢的脱口秀编剧，擅长创作既有深度又有趣味的段子。",
            },
            {
              role: "user",
              content: `请为话题"${input.topic}"创作一段脱口秀段子。${keywordsText}`,
            },
          ],
        });

        const rawContent = response.choices[0]?.message?.content;
        return {
          content: typeof rawContent === "string" ? rawContent : "",
          topic: input.topic,
          usedPersonalStyle: false,
        };
      }),
  }),

  transcription: router({
    list: protectedProcedure.query(() => []),
    create: protectedProcedure
      .input(z.object({ audioUrl: z.string().url(), audioKey: z.string() }))
      .mutation(() => ({ id: 0 })),
    process: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(() => ({ text: "", status: "failed" })),
    convertToScript: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1),
          category: categoryEnum.optional(),
          tags: z.array(z.string()).optional(),
        })
      )
      .mutation(() => ({ scriptId: 0 })),
  }),
});

export const onRequest: PagesFunction = async context => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: context.request,
    router: cloudflareRouter,
    createContext: async () => ({ user: null }),
  });
};
