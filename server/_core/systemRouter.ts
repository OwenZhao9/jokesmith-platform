import { z } from "zod";
import * as db from "../db";
import { ENV } from "./env";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";

const hasValue = (value: string | undefined) =>
  typeof value === "string" && value.trim().length > 0;

function getRuntimeRequirements() {
  const database = hasValue(ENV.databaseUrl);
  const jwtSecret = hasValue(ENV.cookieSecret);
  const appId = hasValue(ENV.appId);
  const oauthPortalUrl = hasValue(process.env.VITE_OAUTH_PORTAL_URL);
  const oauthServerUrl = hasValue(ENV.oAuthServerUrl);
  const adminPassword = hasValue(ENV.adminPassword);
  const forgeApiUrl = hasValue(ENV.forgeApiUrl);
  const forgeApiKey = hasValue(ENV.forgeApiKey);
  const oauthReady = jwtSecret && appId && oauthPortalUrl && oauthServerUrl;
  const adminPasswordLoginReady = jwtSecret && adminPassword;
  const aiReady = forgeApiUrl && forgeApiKey;

  return {
    database,
    jwtSecret,
    appId,
    oauthPortalUrl,
    oauthServerUrl,
    adminPassword,
    forgeApiUrl,
    forgeApiKey,
    oauthReady,
    adminPasswordLoginReady,
    loginReady: oauthReady || adminPasswordLoginReady,
    aiReady,
    aiRequired: false,
  };
}

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  runtimeStatus: publicProcedure.query(async () => {
    const database = await db.getDatabaseHealth();
    const requirements = getRuntimeRequirements();

    return {
      ok:
        database.connected &&
        database.apiUsageLogsMigrated &&
        requirements.loginReady,
      environment: {
        nodeEnv: process.env.NODE_ENV ?? null,
        vercelEnv: process.env.VERCEL_ENV ?? null,
        vercelUrl: process.env.VERCEL_URL ?? null,
      },
      requirements,
      database,
    };
  }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
