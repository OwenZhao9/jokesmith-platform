export type SupabaseAdminSettings = {
  provider: string;
  baseUrl: string;
  model: string;
  apiKeyConfigured: boolean;
  apiKeyPreview: string | null;
  updatedAt: string | null;
};

export type SupabaseAdminOverview = {
  totals: {
    users: number;
    scripts: number;
    inspirations: number;
    shows: number;
  };
  recent: {
    usersToday: number;
    usersLast7Days: number;
  };
  api: {
    totalCalls: number;
    callsToday: number;
    totalTokens: number;
    tokensToday: number;
    totalErrors: number;
    averageLatencyMs: number;
  };
  dailyUsage: Array<{
    date: string;
    calls: number;
    tokens: number;
    errors: number;
  }>;
  topFeatures: Array<{
    feature: string;
    calls: number;
    tokens: number;
    errors: number;
  }>;
  recentUsers: Array<{
    id: number;
    name: string | null;
    email: string | null;
    role: string;
    lastSignedIn: string;
  }>;
};

export type SupabaseApiUsageLog = {
  id: number;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  feature: string;
  provider: string | null;
  model: string | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  status: "success" | "error";
  errorMessage: string | null;
  latencyMs: number;
  createdAt: string;
};

export type SupabaseGenerateJokeInput = {
  topic: string;
  keywords?: string[];
  usePersonalStyle?: boolean;
};

export type SupabaseGenerateJokeResult = {
  content: string;
  topic: string;
  usedPersonalStyle: boolean;
};

export type SupabaseBrainstormResult = {
  id: number;
  topic: string;
  angles: string[];
  associations: string[];
  punchlines: string[];
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, "") ?? "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const FUNCTION_NAME = import.meta.env.VITE_SUPABASE_ADMIN_FUNCTION ?? "jokesmith-admin";
const SESSION_KEY = "jokesmith_supabase_admin_session";
const ACCESS_SESSION_KEY = "jokesmith_supabase_access_session";

export const isSupabaseAdminEnabled = () => Boolean(SUPABASE_URL);

export const isSupabaseBackendEnabled = () => Boolean(SUPABASE_URL);

export const getSupabaseAdminRequirements = () => ({
  supabaseUrl: Boolean(SUPABASE_URL),
  supabaseAnonKey: Boolean(SUPABASE_ANON_KEY),
  functionName: FUNCTION_NAME,
});

export const getStoredSupabaseAdminSession = () =>
  window.localStorage.getItem(SESSION_KEY) ?? "";

export const setStoredSupabaseAdminSession = (token: string) => {
  window.localStorage.setItem(SESSION_KEY, token);
};

export const clearStoredSupabaseAdminSession = () => {
  window.localStorage.removeItem(SESSION_KEY);
};

export const getStoredSupabaseAccessSession = () =>
  window.localStorage.getItem(ACCESS_SESSION_KEY) ?? "";

export const setStoredSupabaseAccessSession = (token: string) => {
  window.localStorage.setItem(ACCESS_SESSION_KEY, token);
};

export const clearStoredSupabaseAccessSession = () => {
  window.localStorage.removeItem(ACCESS_SESSION_KEY);
};

export class SupabaseAdminError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

export async function callSupabaseAdmin<T>(
  path: string,
  options: {
    body?: unknown;
    token?: string;
    siteToken?: string;
    method?: "GET" | "POST";
  } = {}
): Promise<T> {
  if (!SUPABASE_URL) {
    throw new SupabaseAdminError("VITE_SUPABASE_URL is not configured", 0);
  }

  const method = options.method ?? (options.body ? "POST" : "GET");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (SUPABASE_ANON_KEY) {
    headers.apikey = SUPABASE_ANON_KEY;
    headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
  }

  if (options.token) {
    headers["x-admin-session"] = options.token;
  }

  if (options.siteToken) {
    headers["x-site-session"] = options.siteToken;
  }

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}${path}`,
    {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    }
  );
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new SupabaseAdminError(
      payload.error || `Supabase admin request failed: ${response.status}`,
      response.status
    );
  }

  return payload as T;
}

export const loginSupabaseAccess = async (password: string) => {
  const result = await callSupabaseAdmin<{ token: string }>("/access-login", {
    body: { password },
  });
  setStoredSupabaseAccessSession(result.token);
  return result.token;
};

export const generateJokeWithSupabase = (input: SupabaseGenerateJokeInput) =>
  callSupabaseAdmin<SupabaseGenerateJokeResult>("/generate-joke", {
    body: input,
    siteToken: getStoredSupabaseAccessSession(),
  });

export const generateBrainstormWithSupabase = (topic: string) =>
  callSupabaseAdmin<SupabaseBrainstormResult>("/brainstorm", {
    body: { topic },
    siteToken: getStoredSupabaseAccessSession(),
  });
