import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";
import { appRouter } from "../../server/routers";
import { createContext } from "../../server/_core/context";
import {
  applyCorsHeaders,
  handleCorsPreflight,
} from "../../server/_core/cors";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

type VercelRequest = Parameters<typeof nodeHTTPRequestHandler>[0]["req"] & {
  query?: Record<string, string | string[] | undefined>;
};

type VercelResponse = Parameters<typeof nodeHTTPRequestHandler>[0]["res"];

function getTrpcPath(req: VercelRequest) {
  const path = req.query?.path;
  if (Array.isArray(path)) return path.join("/");
  return path ?? "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsHeaders(req, res);
  if (handleCorsPreflight(req, res)) return;

  await nodeHTTPRequestHandler({
    router: appRouter,
    path: getTrpcPath(req),
    req,
    res,
    createContext: () =>
      createContext({
        req: req as any,
        res: res as any,
        info: {} as CreateExpressContextOptions["info"],
      }),
  });
}
