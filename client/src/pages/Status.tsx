import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";

type StatusItemProps = {
  label: string;
  ok: boolean;
  description: string;
};

function StatusBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <Badge className="gap-1">
      <CheckCircle2 className="h-3 w-3" />
      正常
    </Badge>
  ) : (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" />
      缺失
    </Badge>
  );
}

function StatusItem({ label, ok, description }: StatusItemProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-4">
      <div>
        <p className="font-medium">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <StatusBadge ok={ok} />
    </div>
  );
}

export default function Status() {
  const statusQuery = trpc.system.runtimeStatus.useQuery(undefined, {
    retry: false,
  });

  const status = statusQuery.data;

  if (statusQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (statusQuery.isError || !status) {
    return (
      <Card className="club-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            状态接口不可用
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {statusQuery.error?.message || "无法读取后端运行状态。"}
          </p>
          <Button onClick={() => statusQuery.refetch()} variant="outline">
            <RefreshCw className="h-4 w-4" />
            重新检查
          </Button>
        </CardContent>
      </Card>
    );
  }

  const requirements = status.requirements;
  const missing = [
    !requirements.database && "DATABASE_URL",
    !requirements.jwtSecret && "JWT_SECRET",
    !requirements.loginReady && "ADMIN_PASSWORD 或完整 OAuth 配置",
    requirements.aiRequired &&
      !requirements.forgeApiUrl &&
      "BUILT_IN_FORGE_API_URL",
    requirements.aiRequired &&
      !requirements.forgeApiKey &&
      "BUILT_IN_FORGE_API_KEY",
    status.database.configured &&
      !status.database.apiUsageLogsMigrated &&
      "Postgres drizzle migration",
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8 text-primary mic-icon" />
          <div>
            <h1 className="text-2xl font-display neon-pink">运行状态</h1>
            <p className="text-sm text-muted-foreground">
              用于确认线上前端、后台 API、数据库和登录是否跑通；AI
              Key 暂时可选
            </p>
          </div>
        </div>
        <Button onClick={() => statusQuery.refetch()} variant="outline">
          <RefreshCw className="h-4 w-4" />
          重新检查
        </Button>
      </div>

      <Card className="club-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3 text-lg">
            <span>总体状态</span>
            {status.ok ? (
              <Badge className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                已跑通
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                未完整跑通
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
            <div>NODE_ENV: {status.environment.nodeEnv || "unknown"}</div>
            <div>VERCEL_ENV: {status.environment.vercelEnv || "local"}</div>
            <div>VERCEL_URL: {status.environment.vercelUrl || "local"}</div>
          </div>
          {missing.length > 0 && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
              <p className="font-medium text-destructive">仍需补齐</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {missing.join("、")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="club-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5 text-primary" />
              数据库
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatusItem
              label="DATABASE_URL"
              ok={status.database.configured}
              description="Vercel 环境中必须配置 Supabase/Postgres 连接串。"
            />
            <StatusItem
              label="数据库连接"
              ok={status.database.connected}
              description="后端能成功连接数据库并执行 ping。"
            />
            <StatusItem
              label="API 统计迁移"
              ok={status.database.apiUsageLogsMigrated}
              description="需要存在 api_usage_logs 表用于记录 API 调用。"
            />
            {status.database.error && (
              <p className="break-words rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                {status.database.error}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="club-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" />
              登录
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatusItem
              label="JWT_SECRET"
              ok={requirements.jwtSecret}
              description="用于签发和校验登录会话 Cookie。"
            />
            <StatusItem
              label="VITE_APP_ID"
              ok={requirements.appId}
              description="OAuth 登录所需的应用 ID。"
            />
            <StatusItem
              label="VITE_OAUTH_PORTAL_URL"
              ok={requirements.oauthPortalUrl}
              description="前端跳转登录入口。"
            />
            <StatusItem
              label="OAUTH_SERVER_URL"
              ok={requirements.oauthServerUrl}
              description="后台用授权码换取用户信息。"
            />
            <StatusItem
              label="ADMIN_PASSWORD"
              ok={requirements.adminPassword}
              description="未配置 OAuth 时，可用管理员密码自托管登录。"
            />
            <StatusItem
              label="登录就绪"
              ok={requirements.loginReady}
              description="OAuth 登录或管理员密码登录任一可用即可。"
            />
          </CardContent>
        </Card>

        <Card className="club-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              AI/API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatusItem
              label="BUILT_IN_FORGE_API_URL"
              ok={requirements.forgeApiUrl}
              description="AI、转写、存储等后端服务入口；当前阶段可暂不配置。"
            />
            <StatusItem
              label="BUILT_IN_FORGE_API_KEY"
              ok={requirements.forgeApiKey}
              description="调用 Forge/AI 服务所需密钥；当前阶段可暂不配置。"
            />
            <StatusItem
              label="AI 调用就绪"
              ok={requirements.aiReady}
              description="写稿、头脑风暴和转写需要该项为正常，但不阻断基础部署。"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
