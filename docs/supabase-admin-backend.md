# Supabase 后台部署

目标：不用 Vercel 后端，让 Surge 静态前端直接连接 Supabase Edge Function，实现管理员登录、API 配置和 API 使用统计。

## 1. 创建 Supabase 项目

打开 Supabase 后台创建项目。区域优先选东京或新加坡。

## 2. 初始化数据库

在 Supabase Dashboard 的 SQL Editor 里运行：

```text
supabase/schema.sql
```

该 SQL 会创建项目表、`api_usage_logs` 和 `api_settings`，并开启 RLS。前端不能直接读写这些表，只有 Edge Function 使用 service role 访问。

## 3. 部署 Edge Function

安装并登录 Supabase CLI 后：

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set ADMIN_PASSWORD='CHANGE_ME_ADMIN_PASSWORD'
supabase secrets set ADMIN_SESSION_SECRET='CHANGE_ME_RANDOM_32_CHARS_OR_LONGER'
supabase secrets set ALLOWED_WEB_ORIGINS='https://jokesmith-platform.surge.sh'
supabase secrets set PUBLIC_ACCESS_PASSWORD='CHANGE_ME_PUBLIC_ACCESS_PASSWORD'
supabase secrets set PUBLIC_AI_RATE_LIMIT_PER_HOUR='20'
supabase functions deploy jokesmith-admin --no-verify-jwt
```

Edge Function 代码在：

```text
supabase/functions/jokesmith-admin/index.ts
```

## 4. 重新发布 Surge 前端

用 Supabase 项目 URL 和 public anon key 重新构建并发布。`anon key` 是浏览器端公开 key，不要填 service role key。

```bash
SURGE_DOMAIN=jokesmith-platform.surge.sh \
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co \
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY \
VITE_SUPABASE_ADMIN_FUNCTION=jokesmith-admin \
bash scripts/deploy-surge.sh
```

然后打开：

```text
https://jokesmith-platform.surge.sh/admin
```

## 5. 后台能做什么

- 管理员密码登录。
- 保存 API Provider、Base URL、模型名和 API Key。
- 查看总调用数、Token 消耗、失败次数、近期调用记录。
- 写入测试调用记录，确认统计链路跑通。
- 为 Surge 前端提供 AI 写稿和头脑风暴接口，并把真实 DeepSeek 调用写入统计。
- 用 `PUBLIC_ACCESS_PASSWORD` 保护公开 AI 接口，前端登录后会保存 7 天访问会话。
- 用 `PUBLIC_AI_RATE_LIMIT_PER_HOUR` 做服务端限流，默认每个 IP/浏览器指纹每小时 20 次。

公开业务接口：

- `POST /generate-joke`：调用已配置的 DeepSeek/OpenAI-compatible API，统计为 `ai.generateJoke`。
- `POST /brainstorm`：调用已配置的 API 返回结构化头脑风暴，统计为 `brainstorm.generate`。

## 限制

当前版本已把 AI 写稿和头脑风暴迁到 Supabase Edge Function。稿件保存、灵感库、演出排表、录音转文字等仍依赖原 Node/tRPC 后端；如果要让 Surge 静态站完全独立，需要继续迁移这些接口。
