import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

export const onRequest: PagesFunction = async (context) => {
  const routersModule = await import("../../../server/routers");
  const appRouter = routersModule.appRouter;
  
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: context.request,
    router: appRouter,
    createContext: async () => {
      try {
        const { parse } = await import("cookie");
        const { jwtVerify } = await import("jose");
        const { COOKIE_NAME } = await import("@shared/const");
        const { ENV } = await import("../../../server/_core/env");
        
        const cookieHeader = context.request.headers.get("cookie");
        const cookies = cookieHeader ? parse(cookieHeader) : {};
        const sessionCookie = cookies[COOKIE_NAME];
        
        if (!sessionCookie) {
          return {
            req: context.request as any,
            res: {} as any,
            user: null,
          };
        }
        
        try {
          const secretKey = new TextEncoder().encode(ENV.cookieSecret);
          const { payload } = await jwtVerify(sessionCookie, secretKey, {
            algorithms: ["HS256"],
          });
          
          return {
            req: context.request as any,
            res: {} as any,
            user: {
              id: 0,
              openId: payload.openId as string,
              name: payload.name as string || null,
              email: null,
              loginMethod: null,
              createdAt: new Date(),
              lastSignedIn: new Date(),
            },
          };
        } catch {
          return {
            req: context.request as any,
            res: {} as any,
            user: null,
          };
        }
      } catch (error) {
        return {
          req: context.request as any,
          res: {} as any,
          user: null,
        };
      }
    },
  });
};

