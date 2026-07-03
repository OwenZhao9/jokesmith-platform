import type { NextFunction, Request, Response } from "express";

type HeaderRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
};

type HeaderResponse = {
  statusCode?: number;
  setHeader(name: string, value: string | string[]): unknown;
  end(...args: unknown[]): unknown;
};

const splitOrigins = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map(origin => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

const allowedOrigins = () =>
  new Set([
    ...splitOrigins(process.env.ALLOWED_WEB_ORIGINS),
    ...splitOrigins(process.env.PUBLIC_WEB_ORIGIN),
  ]);

const requestOrigin = (req: HeaderRequest) => {
  const origin = req.headers?.origin;
  return Array.isArray(origin) ? origin[0] : origin;
};

export function getPublicWebOrigin() {
  return splitOrigins(process.env.PUBLIC_WEB_ORIGIN)[0] ?? "";
}

export function applyCorsHeaders(req: HeaderRequest, res: HeaderResponse) {
  const origin = requestOrigin(req);
  if (!origin) return false;

  const normalizedOrigin = origin.replace(/\/+$/, "");
  if (!allowedOrigins().has(normalizedOrigin)) return false;

  res.setHeader("Access-Control-Allow-Origin", normalizedOrigin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "content-type,authorization,trpc-accept"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Vary", "Origin");

  return true;
}

export function handleCorsPreflight(req: HeaderRequest, res: HeaderResponse) {
  if (req.method !== "OPTIONS") return false;

  applyCorsHeaders(req, res);
  res.statusCode = 204;
  res.end();
  return true;
}

export function corsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  applyCorsHeaders(req, res);

  if (handleCorsPreflight(req, res)) return;

  next();
}
