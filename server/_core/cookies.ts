type HeaderValue = string | string[] | undefined;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

type CookieRequest = {
  protocol?: string;
  headers?: Record<string, HeaderValue>;
};

type SessionCookieOptions = {
  domain?: string;
  httpOnly: boolean;
  path: string;
  sameSite: "lax" | "strict" | "none";
  secure: boolean;
};

type CookieResponse = {
  clearCookie?: (
    name: string,
    options: SessionCookieOptions & { maxAge: number }
  ) => void;
  getHeader?: (name: string) => number | string | string[] | undefined;
  setHeader?: (name: string, value: string | string[]) => void;
};

type SerializeCookieOptions = {
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: boolean | "lax" | "strict" | "none";
  secure?: boolean;
};

function serializeCookie(
  name: string,
  value: string,
  options: SerializeCookieOptions
) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (typeof options.maxAge === "number") {
    parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  }
  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }
  if (options.path) {
    parts.push(`Path=${options.path}`);
  }
  if (options.httpOnly) {
    parts.push("HttpOnly");
  }
  if (options.secure) {
    parts.push("Secure");
  }
  if (options.sameSite) {
    const sameSite =
      options.sameSite === true
        ? "Strict"
        : options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1);
    parts.push(`SameSite=${sameSite}`);
  }
  return parts.join("; ");
}

function isSecureRequest(req: CookieRequest) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers?.["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: CookieRequest
): SessionCookieOptions {
  // const hostname = req.hostname;
  // const shouldSetDomain =
  //   hostname &&
  //   !LOCAL_HOSTS.has(hostname) &&
  //   !isIpAddress(hostname) &&
  //   hostname !== "127.0.0.1" &&
  //   hostname !== "::1";

  // const domain =
  //   shouldSetDomain && !hostname.startsWith(".")
  //     ? `.${hostname}`
  //     : shouldSetDomain
  //       ? hostname
  //       : undefined;

  const secure = isSecureRequest(req);

  return {
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure,
  };
}

function appendSetCookieHeader(
  res: Pick<CookieResponse, "setHeader" | "getHeader">,
  cookie: string
) {
  if (!res.setHeader) {
    throw new Error("Response does not support setting cookies");
  }

  const current = res.getHeader?.("Set-Cookie");
  if (!current) {
    res.setHeader("Set-Cookie", cookie);
    return;
  }

  res.setHeader(
    "Set-Cookie",
    Array.isArray(current) ? [...current, cookie] : [String(current), cookie]
  );
}

export function serializeSessionCookie(
  req: CookieRequest,
  name: string,
  value: string,
  maxAgeMs: number
) {
  const options = getSessionCookieOptions(req);
  return serializeCookie(name, value, {
    httpOnly: options.httpOnly,
    path: options.path,
    sameSite: options.sameSite,
    secure: options.secure,
    maxAge: Math.floor(maxAgeMs / 1000),
  });
}

export function clearSessionCookie(
  req: CookieRequest,
  res: CookieResponse,
  name: string
) {
  const options = getSessionCookieOptions(req);
  const expressOptions = { ...options, maxAge: -1 };

  if (typeof res.clearCookie === "function") {
    res.clearCookie(name, expressOptions);
    return;
  }

  appendSetCookieHeader(
    res,
    serializeCookie(name, "", {
      httpOnly: options.httpOnly,
      path: options.path,
      sameSite: options.sameSite,
      secure: options.secure,
      maxAge: 0,
      expires: new Date(0),
    })
  );
}
