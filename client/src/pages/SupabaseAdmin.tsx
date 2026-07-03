import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  callSupabaseAdmin,
  clearStoredSupabaseAdminSession,
  getStoredSupabaseAdminSession,
  getSupabaseAdminRequirements,
  setStoredSupabaseAdminSession,
  SupabaseAdminError,
  type SupabaseAdminOverview,
  type SupabaseAdminSettings,
  type SupabaseApiUsageLog,
} from "@/lib/supabaseAdmin";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  FileText,
  Gauge,
  KeyRound,
  Loader2,
  LogOut,
  RefreshCw,
  Save,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

const numberFormatter = new Intl.NumberFormat("zh-CN");

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatDate(value: Date | string) {
  return format(new Date(value), "MM月dd日 HH:mm", { locale: zhCN });
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof Activity;
}) {
  return (
    <Card className="club-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-display neon-pink">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function MissingSupabaseConfig() {
  const requirements = getSupabaseAdminRequirements();

  return (
    <Card className="club-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Supabase 后台未配置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          当前页面会在配置 `VITE_SUPABASE_URL` 后切换到 Supabase 后台模式。
        </p>
        <div className="space-y-2 rounded-lg border border-border/60 p-4">
          <p>VITE_SUPABASE_URL: {requirements.supabaseUrl ? "已配置" : "缺失"}</p>
          <p>
            VITE_SUPABASE_ANON_KEY:{" "}
            {requirements.supabaseAnonKey ? "已配置" : "可选但建议配置"}
          </p>
          <p>Edge Function: {requirements.functionName}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function LoginCard({
  onLogin,
  loading,
  error,
}: {
  onLogin: (password: string) => void;
  loading: boolean;
  error: string | null;
}) {
  const [password, setPassword] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onLogin(password);
  };

  return (
    <Card className="club-card mx-auto max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Supabase 管理员登录
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <Input
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            placeholder="管理员密码"
            autoComplete="current-password"
          />
          <Button className="w-full" disabled={loading || !password}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                登录中...
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                登录后台
              </>
            )}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}

export default function SupabaseAdmin() {
  const requirements = getSupabaseAdminRequirements();
  const [token, setToken] = useState(() =>
    typeof window === "undefined" ? "" : getStoredSupabaseAdminSession()
  );
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<SupabaseAdminOverview | null>(null);
  const [apiUsage, setApiUsage] = useState<SupabaseApiUsageLog[]>([]);
  const [settings, setSettings] = useState<SupabaseAdminSettings | null>(null);
  const [form, setForm] = useState({
    provider: "openai-compatible",
    baseUrl: "",
    model: "",
    apiKey: "",
  });

  const loadAdminData = async (sessionToken = token) => {
    if (!sessionToken) return;
    setLoading(true);

    try {
      const [nextOverview, nextUsage, nextSettings] = await Promise.all([
        callSupabaseAdmin<SupabaseAdminOverview>("/overview", {
          token: sessionToken,
        }),
        callSupabaseAdmin<SupabaseApiUsageLog[]>("/usage?limit=50", {
          token: sessionToken,
        }),
        callSupabaseAdmin<SupabaseAdminSettings>("/settings", {
          token: sessionToken,
        }),
      ]);

      setOverview(nextOverview);
      setApiUsage(nextUsage);
      setSettings(nextSettings);
      setForm({
        provider: nextSettings.provider || "openai-compatible",
        baseUrl: nextSettings.baseUrl || "",
        model: nextSettings.model || "",
        apiKey: "",
      });
    } catch (error) {
      if (error instanceof SupabaseAdminError && error.status === 401) {
        clearStoredSupabaseAdminSession();
        setToken("");
        setLoginError("登录已过期，请重新登录。");
        return;
      }

      toast.error(error instanceof Error ? error.message : "后台数据读取失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (requirements.supabaseUrl && token) {
      void loadAdminData(token);
    }
  }, [requirements.supabaseUrl, token]);

  if (!requirements.supabaseUrl) {
    return <MissingSupabaseConfig />;
  }

  const handleLogin = async (password: string) => {
    setLoginLoading(true);
    setLoginError(null);

    try {
      const result = await callSupabaseAdmin<{ token: string }>("/login", {
        body: { password },
      });
      setStoredSupabaseAdminSession(result.token);
      setToken(result.token);
      toast.success("后台登录成功");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "登录失败");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    clearStoredSupabaseAdminSession();
    setToken("");
    setOverview(null);
    setApiUsage([]);
    setSettings(null);
  };

  const handleSaveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const nextSettings = await callSupabaseAdmin<SupabaseAdminSettings>(
        "/settings",
        {
          token,
          body: form,
        }
      );
      setSettings(nextSettings);
      setForm(current => ({ ...current, apiKey: "" }));
      toast.success("API 配置已保存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "API 配置保存失败");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTestLog = async () => {
    setLoading(true);

    try {
      await callSupabaseAdmin<{ success: true }>("/test-log", {
        token,
        body: { feature: "manual-admin-test" },
      });
      toast.success("测试 API 使用记录已写入");
      await loadAdminData(token);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "测试记录写入失败");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <LoginCard
        onLogin={handleLogin}
        loading={loginLoading}
        error={loginError}
      />
    );
  }

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const maxDailyCalls = Math.max(
    1,
    ...(overview?.dailyUsage.map(day => day.calls) ?? [])
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary mic-icon" />
          <div>
            <h1 className="text-2xl font-display neon-pink">Supabase 后台</h1>
            <p className="text-sm text-muted-foreground">
              Surge 静态前端 + Supabase 数据、API 配置和调用统计
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => loadAdminData(token)}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" />
            刷新
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            退出
          </Button>
        </div>
      </div>

      <form onSubmit={handleSaveSettings}>
        <Card className="club-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5 text-primary" />
              API 配置
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-4">
            <Input
              value={form.provider}
              onChange={event =>
                setForm(current => ({
                  ...current,
                  provider: event.target.value,
                }))
              }
              placeholder="provider，例如 openai-compatible"
            />
            <Input
              value={form.baseUrl}
              onChange={event =>
                setForm(current => ({ ...current, baseUrl: event.target.value }))
              }
              placeholder="API Base URL"
            />
            <Input
              value={form.model}
              onChange={event =>
                setForm(current => ({ ...current, model: event.target.value }))
              }
              placeholder="模型名称"
            />
            <Input
              type="password"
              value={form.apiKey}
              onChange={event =>
                setForm(current => ({ ...current, apiKey: event.target.value }))
              }
              placeholder={
                settings?.apiKeyConfigured
                  ? `已配置 ${settings.apiKeyPreview ?? ""}，留空则不改`
                  : "API Key"
              }
            />
            <div className="flex flex-wrap items-center gap-3 lg:col-span-4">
              <Button disabled={loading}>
                <Save className="h-4 w-4" />
                保存 API 配置
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCreateTestLog}
                disabled={loading}
              >
                <Zap className="h-4 w-4" />
                写入测试调用记录
              </Button>
              {settings?.apiKeyConfigured && (
                <Badge variant="secondary">
                  API Key 已保存 {settings.apiKeyPreview}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </form>

      {overview && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="总用户"
              value={formatNumber(overview.totals.users)}
              description={`今日新增 ${formatNumber(overview.recent.usersToday)}，近 7 日新增 ${formatNumber(overview.recent.usersLast7Days)}`}
              icon={Users}
            />
            <StatCard
              title="内容总量"
              value={formatNumber(
                overview.totals.scripts +
                  overview.totals.inspirations +
                  overview.totals.shows
              )}
              description={`稿件 ${overview.totals.scripts} / 灵感 ${overview.totals.inspirations} / 演出 ${overview.totals.shows}`}
              icon={FileText}
            />
            <StatCard
              title="API 调用"
              value={formatNumber(overview.api.totalCalls)}
              description={`今日 ${formatNumber(overview.api.callsToday)} 次，失败 ${formatNumber(overview.api.totalErrors)} 次`}
              icon={Zap}
            />
            <StatCard
              title="Token 消耗"
              value={formatNumber(overview.api.totalTokens)}
              description={`今日 ${formatNumber(overview.api.tokensToday)}，平均延迟 ${formatNumber(overview.api.averageLatencyMs)}ms`}
              icon={Gauge}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="club-card">
              <CardHeader>
                <CardTitle className="text-lg">近 7 日 API 调用</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.dailyUsage.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    暂无 API 调用记录
                  </p>
                ) : (
                  overview.dailyUsage.map(day => (
                    <div key={day.date} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{day.date}</span>
                        <span className="text-muted-foreground">
                          {formatNumber(day.calls)} 次 /{" "}
                          {formatNumber(day.tokens)} tokens
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${Math.max(4, (day.calls / maxDailyCalls) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="club-card">
              <CardHeader>
                <CardTitle className="text-lg">功能调用排行</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {overview.topFeatures.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    暂无功能调用记录
                  </p>
                ) : (
                  overview.topFeatures.map(feature => (
                    <div
                      key={feature.feature}
                      className="flex items-center justify-between rounded-lg border border-border/60 p-3"
                    >
                      <div>
                        <p className="font-medium">{feature.feature}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(feature.tokens)} tokens
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">
                          {formatNumber(feature.calls)} 次
                        </Badge>
                        {feature.errors > 0 && (
                          <p className="mt-1 text-xs text-destructive">
                            失败 {formatNumber(feature.errors)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card className="club-card">
        <CardHeader>
          <CardTitle className="text-lg">最近 API 使用记录</CardTitle>
        </CardHeader>
        <CardContent>
          {apiUsage.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无 API 使用记录</p>
          ) : (
            <div className="space-y-3">
              {apiUsage.map(log => (
                <div
                  key={log.id}
                  className="rounded-lg border border-border/60 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{log.feature}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {log.userName || log.userEmail || "匿名/系统"} ·{" "}
                        {log.provider || "unknown"} · {log.model || "n/a"}
                      </p>
                    </div>
                    <Badge
                      variant={
                        log.status === "success" ? "secondary" : "destructive"
                      }
                      className="shrink-0"
                    >
                      {log.status === "success" ? "成功" : "失败"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {formatNumber(log.totalTokens)} tokens
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatNumber(log.latencyMs)}ms
                    </span>
                    <span>{formatDate(log.createdAt)}</span>
                  </div>
                  {log.errorMessage && (
                    <p className="mt-2 flex gap-1 text-xs text-destructive">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <span className="line-clamp-2">{log.errorMessage}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
