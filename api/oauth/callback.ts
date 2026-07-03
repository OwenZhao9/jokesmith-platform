import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";
import * as db from "../../server/db";
import { serializeSessionCookie } from "../../server/_core/cookies";
import {
  applyCorsHeaders,
  getPublicWebOrigin,
  handleCorsPreflight,
} from "../../server/_core/cors";
import { sdk } from "../../server/_core/sdk";

type VercelRequest = {
  url?: string;
  headers: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  statusCode: number;
  setHeader(name: string, value: string | string[]): void;
  end(body?: string): void;
};

function requestUrl(req: VercelRequest) {
  const host = Array.isArray(req.headers.host)
    ? req.headers.host[0]
    : req.headers.host;
  return new URL(req.url ?? "", `https://${host ?? "localhost"}`);
}

function json(res: VercelResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsHeaders(req, res);
  if (handleCorsPreflight(req, res)) return;

  const url = requestUrl(req);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    json(res, 400, { error: "code and state are required" });
    return;
  }

  try {
    const tokenResponse = await sdk.exchangeCodeForToken(code, state);
    const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

    if (!userInfo.openId) {
      json(res, 400, { error: "openId missing from user info" });
      return;
    }

    await db.upsertUser({
      openId: userInfo.openId,
      name: userInfo.name || null,
      email: userInfo.email ?? null,
      loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
      lastSignedIn: new Date(),
    });

    const sessionToken = await sdk.createSessionToken(userInfo.openId, {
      name: userInfo.name || "",
      expiresInMs: ONE_YEAR_MS,
    });

    res.setHeader(
      "Set-Cookie",
      serializeSessionCookie(req, COOKIE_NAME, sessionToken, ONE_YEAR_MS)
    );
    res.statusCode = 302;
    res.setHeader("Location", getPublicWebOrigin() || "/");
    res.end();
  } catch (error) {
    console.error("[OAuth] Vercel callback failed", error);
    json(res, 500, { error: "OAuth callback failed" });
  }
}
