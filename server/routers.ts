import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { User } from "../drizzle/schema";
import { createHash } from "node:crypto";
import { clearSessionCookie, serializeSessionCookie } from "./_core/cookies";
import { ENV } from "./_core/env";
import {
  hashPassword,
  normalizeEmail,
  verifyPassword,
} from "./_core/passwordAuth";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import {
  adminProcedure,
  publicProcedure,
  protectedProcedure,
  router,
} from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { transcribeAudio } from "./_core/voiceTranscription";
import * as db from "./db";

// Category enum for validation
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

const passwordAuthInput = z.object({
  email: z.string().email().max(320),
  password: z.string().min(6).max(128),
});

const passwordRegisterInput = passwordAuthInput.extend({
  name: z.string().max(80).optional(),
});

const createPasswordOpenId = (email: string) =>
  `credential:${createHash("sha256").update(email).digest("hex").slice(0, 48)}`;

const createSession = async (
  ctx: { req: Parameters<typeof serializeSessionCookie>[0]; res: unknown },
  openId: string,
  name: string
) => {
  const sessionToken = await sdk.createSessionToken(openId, {
    name,
    expiresInMs: ONE_YEAR_MS,
  });

  const cookieResponse = ctx.res as unknown as {
    setHeader(name: string, value: string | string[]): void;
  };
  cookieResponse.setHeader(
    "Set-Cookie",
    serializeSessionCookie(ctx.req, COOKIE_NAME, sessionToken, ONE_YEAR_MS)
  );
};

const toPublicUser = (user: User) => ({
  id: user.id,
  openId: user.openId,
  name: user.name,
  email: user.email,
  loginMethod: user.loginMethod,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  lastSignedIn: user.lastSignedIn,
});

export const appRouter = router({
  system: systemRouter,

  // ============ Admin Router ============
  admin: router({
    overview: adminProcedure.query(async () => {
      return db.getAdminOverview();
    }),

    apiUsage: adminProcedure
      .input(
        z
          .object({
            limit: z.number().int().min(1).max(100).default(50),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return db.getAdminApiUsage(input?.limit ?? 50);
      }),
  }),

  auth: router({
    me: publicProcedure.query(opts =>
      opts.ctx.user ? toPublicUser(opts.ctx.user) : null
    ),
    register: publicProcedure
      .input(passwordRegisterInput)
      .mutation(async ({ ctx, input }) => {
        const email = normalizeEmail(input.email);
        const existingUser = await db.getUserByEmail(email);
        if (existingUser) {
          throw new Error("该邮箱已注册，请直接登录");
        }

        const name = input.name?.trim() || email.split("@")[0];
        const openId = createPasswordOpenId(email);
        await db.upsertUser({
          openId,
          email,
          name,
          passwordHash: await hashPassword(input.password),
          loginMethod: "password",
          role: "user",
          lastSignedIn: new Date(),
        });

        await createSession(ctx, openId, name);
        return { success: true } as const;
      }),
    passwordLogin: publicProcedure
      .input(passwordAuthInput)
      .mutation(async ({ ctx, input }) => {
        const email = normalizeEmail(input.email);
        const user = await db.getUserByEmail(email);
        if (!user?.passwordHash) {
          throw new Error("邮箱或密码错误");
        }

        const passwordMatches = await verifyPassword(
          input.password,
          user.passwordHash
        );
        if (!passwordMatches) {
          throw new Error("邮箱或密码错误");
        }

        const signedInAt = new Date();
        await db.upsertUser({
          openId: user.openId,
          lastSignedIn: signedInAt,
        });

        await createSession(ctx, user.openId, user.name || user.email || "User");
        return { success: true } as const;
      }),
    adminLogin: publicProcedure
      .input(z.object({ password: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        if (!ENV.adminPassword) {
          throw new Error("ADMIN_PASSWORD is not configured");
        }
        if (input.password !== ENV.adminPassword) {
          throw new Error("Invalid admin password");
        }

        const openId = ENV.ownerOpenId || "self-hosted-admin";
        await db.upsertUser({
          openId,
          name: "Admin",
          loginMethod: "admin_password",
          role: "admin",
          lastSignedIn: new Date(),
        });

        await createSession(ctx, openId, "Admin");

        return { success: true } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      clearSessionCookie(ctx.req, ctx.res, COOKIE_NAME);
      return { success: true } as const;
    }),
  }),

  // ============ User Style Router ============
  style: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const style = await db.getUserStyle(ctx.user.id);
      // Return empty object if no style found to avoid undefined error
      return (
        style || {
          id: 0,
          userId: ctx.user.id,
          comedyStyle: null,
          languageHabits: null,
          commonTags: null,
          tonePreference: null,
          targetAudience: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      );
    }),

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
      .mutation(async ({ ctx, input }) => {
        await db.upsertUserStyle(ctx.user.id, input);
        return { success: true };
      }),
  }),

  // ============ Scripts Router ============
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
      .query(async ({ ctx, input }) => {
        return db.getUserScripts(ctx.user.id, input?.category, input?.search);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getScriptById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1),
          content: z.string().min(1),
          category: categoryEnum.optional(),
          tags: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createScript({
          userId: ctx.user.id,
          title: input.title,
          content: input.content,
          category: input.category || "other",
          tags: input.tags,
        });
        return { id };
      }),

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
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateScript(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteScript(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ============ Shows Router ============
  shows: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserShows(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const show = await db.getShowById(input.id, ctx.user.id);
        if (!show) return null;
        const showScripts = await db.getShowScripts(input.id, ctx.user.id);
        return { ...show, scripts: showScripts };
      }),

    create: protectedProcedure
      .input(
        z.object({
          title: z.string().min(1),
          venue: z.string().optional(),
          showDate: z.number(), // Unix timestamp
          duration: z.number().optional(),
          notes: z.string().optional(),
          scriptIds: z.array(z.number()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { scriptIds, showDate, ...showData } = input;
        const id = await db.createShow({
          userId: ctx.user.id,
          ...showData,
          showDate: new Date(showDate),
        });
        if (scriptIds && scriptIds.length > 0) {
          await db.updateShowScripts(id, ctx.user.id, scriptIds);
        }
        return { id };
      }),

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
      .mutation(async ({ ctx, input }) => {
        const { id, scriptIds, showDate, ...data } = input;
        const updateData: Record<string, unknown> = { ...data };
        if (showDate) {
          updateData.showDate = new Date(showDate);
        }
        await db.updateShow(id, ctx.user.id, updateData);
        if (scriptIds !== undefined) {
          await db.updateShowScripts(id, ctx.user.id, scriptIds);
        }
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteShow(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ============ Inspirations Router ============
  inspirations: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getUserInspirations(ctx.user.id, input?.search);
      }),

    create: protectedProcedure
      .input(
        z.object({
          content: z.string().min(1),
          source: z.string().optional(),
          tags: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createInspiration({
          userId: ctx.user.id,
          ...input,
        });
        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          content: z.string().min(1).optional(),
          source: z.string().optional(),
          tags: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateInspiration(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteInspiration(input.id, ctx.user.id);
        return { success: true };
      }),

    convertToScript: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1),
          category: categoryEnum.optional(),
          tags: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const inspirations = await db.getUserInspirations(ctx.user.id);
        const inspiration = inspirations.find(i => i.id === input.id);
        if (!inspiration) throw new Error("Inspiration not found");

        const scriptId = await db.convertInspirationToScript(
          input.id,
          ctx.user.id,
          {
            userId: ctx.user.id,
            title: input.title,
            content: inspiration.content,
            category: input.category || "other",
            tags: input.tags || inspiration.tags || [],
          }
        );
        return { scriptId };
      }),
  }),

  // ============ Brainstorm Router ============
  brainstorm: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserBrainstorms(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getBrainstormById(input.id, ctx.user.id);
      }),

    generate: protectedProcedure
      .input(z.object({ topic: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
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
            {
              role: "system",
              content:
                "你是一位专业的脱口秀编剧顾问，擅长从各种话题中挖掘喜剧潜力。请只返回JSON格式的结果。",
            },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "brainstorm_result",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  angles: {
                    type: "array",
                    items: { type: "string" },
                    description: "切入角度",
                  },
                  associations: {
                    type: "array",
                    items: { type: "string" },
                    description: "相关联想",
                  },
                  punchlines: {
                    type: "array",
                    items: { type: "string" },
                    description: "笑点方向",
                  },
                },
                required: ["angles", "associations", "punchlines"],
                additionalProperties: false,
              },
            },
          },
          usage: {
            feature: "brainstorm.generate",
            userId: ctx.user.id,
          },
        });

        const rawContent = response.choices[0]?.message?.content;
        const content =
          typeof rawContent === "string"
            ? rawContent
            : JSON.stringify(rawContent) || "{}";
        const result = JSON.parse(content);

        const id = await db.createBrainstorm({
          userId: ctx.user.id,
          topic: input.topic,
          angles: result.angles || [],
          associations: result.associations || [],
          punchlines: result.punchlines || [],
          rawResponse: content,
        });

        return { id, ...result };
      }),
  }),

  // ============ AI Generation Router ============
  ai: router({
    generateJoke: protectedProcedure
      .input(
        z.object({
          topic: z.string().min(1),
          keywords: z.array(z.string()).optional(),
          usePersonalStyle: z.boolean().default(false),
        })
      )
      .mutation(async ({ ctx, input }) => {
        let stylePrompt = "";

        if (input.usePersonalStyle) {
          const style = await db.getUserStyle(ctx.user.id);
          if (style) {
            const styleParts = [];
            if (style.comedyStyle)
              styleParts.push(`喜剧风格：${style.comedyStyle}`);
            if (style.languageHabits)
              styleParts.push(`语言习惯：${style.languageHabits}`);
            if (style.commonTags && style.commonTags.length > 0)
              styleParts.push(`常用梗：${style.commonTags.join("、")}`);
            if (style.tonePreference)
              styleParts.push(`语气偏好：${style.tonePreference}`);
            if (style.targetAudience)
              styleParts.push(`目标受众：${style.targetAudience}`);

            if (styleParts.length > 0) {
              stylePrompt = `\n\n请根据以下个人风格来创作：\n${styleParts.join("\n")}`;
            }
          }
        }

        const keywordsText =
          input.keywords && input.keywords.length > 0
            ? `\n关键词：${input.keywords.join("、")}`
            : "";

        const prompt = `请为话题"${input.topic}"创作一段脱口秀段子。${keywordsText}${stylePrompt}

要求：
1. 段子要有明确的铺垫和包袱
2. 语言要口语化，适合舞台表演
3. 长度控制在200-400字
4. 要有至少2-3个笑点`;

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "你是一位才华横溢的脱口秀编剧，擅长创作既有深度又有趣味的段子。你的作品风格独特，善于从日常生活中发现喜剧元素。",
            },
            { role: "user", content: prompt },
          ],
          usage: {
            feature: "ai.generateJoke",
            userId: ctx.user.id,
          },
        });

        const rawContent = response.choices[0]?.message?.content;
        const contentText = typeof rawContent === "string" ? rawContent : "";

        return {
          content: contentText,
          topic: input.topic,
          usedPersonalStyle: input.usePersonalStyle,
        };
      }),
  }),

  // ============ Transcription Router ============
  transcription: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserTranscriptions(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getTranscriptionById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          audioUrl: z.string().url(),
          audioKey: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createTranscription({
          userId: ctx.user.id,
          audioUrl: input.audioUrl,
          audioKey: input.audioKey,
          status: "pending",
        });
        return { id };
      }),

    process: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const startedAt = Date.now();
        const transcription = await db.getTranscriptionById(
          input.id,
          ctx.user.id
        );
        if (!transcription) throw new Error("Transcription not found");

        await db.updateTranscription(input.id, ctx.user.id, {
          status: "processing",
        });

        try {
          const result = await transcribeAudio({
            audioUrl: transcription.audioUrl,
            language: "zh",
            prompt: "这是一段脱口秀演出或排练的录音",
          });

          // Check if it's an error
          if ("error" in result) {
            await db.updateTranscription(input.id, ctx.user.id, {
              status: "failed",
            });
            throw new Error(result.error);
          }

          await db.updateTranscription(input.id, ctx.user.id, {
            transcribedText: result.text,
            status: "completed",
          });

          await db.recordApiUsage({
            userId: ctx.user.id,
            feature: "transcription.process",
            provider: "speech-to-text",
            status: "success",
            latencyMs: Date.now() - startedAt,
          });

          return { text: result.text, status: "completed" };
        } catch (error) {
          await db.updateTranscription(input.id, ctx.user.id, {
            status: "failed",
          });
          await db.recordApiUsage({
            userId: ctx.user.id,
            feature: "transcription.process",
            provider: "speech-to-text",
            status: "error",
            errorMessage:
              error instanceof Error ? error.message : String(error),
            latencyMs: Date.now() - startedAt,
          });
          throw error;
        }
      }),

    convertToScript: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1),
          category: categoryEnum.optional(),
          tags: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const transcription = await db.getTranscriptionById(
          input.id,
          ctx.user.id
        );
        if (!transcription || !transcription.transcribedText) {
          throw new Error("Transcription not found or not completed");
        }

        const scriptId = await db.createScript({
          userId: ctx.user.id,
          title: input.title,
          content: transcription.transcribedText,
          category: input.category || "other",
          tags: input.tags,
        });

        await db.updateTranscription(input.id, ctx.user.id, {
          convertedScriptId: scriptId,
        });

        return { scriptId };
      }),
  }),
});

export type AppRouter = typeof appRouter;
