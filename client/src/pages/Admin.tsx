import AuthRequiredCard from "@/components/AuthRequiredCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseAdminEnabled } from "@/lib/supabaseAdmin";
import { trpc } from "@/lib/trpc";
import SupabaseAdmin from "@/pages/SupabaseAdmin";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  FileText,
  Gauge,
  Loader2,
  Users,
  Zap,
} from "lucide-react";

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

function TrpcAdmin() {
  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewError,
    error: overviewErrorData,
  } = trpc.admin.overview.useQuery(undefined, { retry: false });

  const {
    data: apiUsage,
    isLoading: usageLoading,
    isError: usageError,
    error: usageErrorData,
  } = trpc.admin.apiUsage.useQuery({ limit: 50 }, { retry: false });

  if (overviewLoading || usageLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (overviewError || usageError || !overview) {
    return (
      <AuthRequiredCard
        title="需要管理员权限"
        description={
          overviewErrorData?.message ||
          usageErrorData?.message ||
          "只有管理员可以查看平台统计。"
        }
      />
    );
  }

  const maxDailyCalls = Math.max(
    1,
    ...overview.dailyUsage.map(day => day.calls)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-primary mic-icon" />
        <div>
          <h1 className="text-2xl font-display neon-pink">管理后台</h1>
          <p className="text-sm text-muted-foreground">
            平台数据总览、AI/API 调用量和近期用户
          </p>
        </div>
      </div>

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
              <p className="text-sm text-muted-foreground">暂无 API 调用记录</p>
            ) : (
              overview.dailyUsage.map(day => (
                <div key={day.date} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{day.date}</span>
                    <span className="text-muted-foreground">
                      {formatNumber(day.calls)} 次 / {formatNumber(day.tokens)}{" "}
                      tokens
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
              <p className="text-sm text-muted-foreground">暂无功能调用记录</p>
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

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Card className="club-card">
          <CardHeader>
            <CardTitle className="text-lg">近期登录用户</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.recentUsers.map(user => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {user.name || user.email || `用户 #${user.id}`}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email || "未绑定邮箱"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <Badge
                    variant={user.role === "admin" ? "default" : "outline"}
                  >
                    {user.role}
                  </Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(user.lastSignedIn)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="club-card">
          <CardHeader>
            <CardTitle className="text-lg">最近 API 使用记录</CardTitle>
          </CardHeader>
          <CardContent>
            {!apiUsage || apiUsage.length === 0 ? (
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
    </div>
  );
}

export default function Admin() {
  if (isSupabaseAdminEnabled()) {
    return <SupabaseAdmin />;
  }

  return <TrpcAdmin />;
}
