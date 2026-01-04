import { appRouter } from "../../../server/routers";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { User } from "../../../drizzle/schema";
import { sdk } from "../../../server/_core/sdk";

export const onRequest: PagesFunction = async (context) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: context.request,
    router: appRouter,
    createContext: async () => {
      let user: User | null = null;
      try {
        user = await sdk.authenticateRequest(context.request as any);
      } catch (error) {
        user = null;
      }
      return {
        req: context.request as any,
        res: {} as any,
        user,
      };
    },
  });
};

