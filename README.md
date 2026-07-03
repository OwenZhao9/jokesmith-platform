# JokeSmith

JokeSmith 是一个脱口秀写稿辅助平台，提供 AI 写稿、话题头脑风暴、稿件管理、灵感库、演出排表、个人风格和后台 API 使用统计。

当前线上方案使用 Surge 托管静态前端，Supabase Edge Function 承载后台管理、DeepSeek API 调用、访问密码校验和限流。

## 功能

- AI 写稿：输入话题和关键词，生成适合舞台表演的脱口秀段子。
- 头脑风暴：围绕话题生成切入角度、相关联想和笑点方向。
- 稿件管理：管理脱口秀稿件、分类和标签。
- 灵感库：记录灵感并转换为稿件。
- 后台统计：查看 API 调用数、Token 消耗、失败次数和近期调用记录。
- API 保护：公开 AI 接口需要访问密码，并按 IP/浏览器指纹限流。

## 技术栈

- React 19 + TypeScript + Vite
- Tailwind CSS + Radix UI
- tRPC + Express
- Supabase Postgres + Supabase Edge Functions
- Drizzle ORM
- DeepSeek OpenAI-compatible API
- Surge / Vercel / Node 部署支持

## 本地启动

```bash
pnpm install
cp .env.example .env
pnpm dev
```

默认本地地址：

```text
http://localhost:3000
```

常用命令：

```bash
pnpm check
pnpm test
pnpm build
pnpm build:vercel
```

## 环境变量

复制 `.env.example` 为 `.env` 后按需填写：

```bash
BUILT_IN_FORGE_API_URL=https://api.deepseek.com
BUILT_IN_FORGE_API_KEY=your_deepseek_api_key_here

DATABASE_URL=postgresql://USER:PASSWORD@HOST:6543/postgres?sslmode=require

VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_ADMIN_FUNCTION=jokesmith-admin

ADMIN_PASSWORD=your_admin_password
ADMIN_SESSION_SECRET=your_random_32_chars_or_longer
PUBLIC_ACCESS_PASSWORD=your_public_site_access_password
PUBLIC_AI_RATE_LIMIT_PER_HOUR=20
```

不要提交 `.env`、service role key、DeepSeek API Key 或真实访问密码。

## Supabase 后台

初始化数据库：

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db query --linked -f supabase/schema.sql
```

设置 Edge Function secrets：

```bash
supabase secrets set ADMIN_PASSWORD='CHANGE_ME_ADMIN_PASSWORD'
supabase secrets set ADMIN_SESSION_SECRET='CHANGE_ME_RANDOM_32_CHARS_OR_LONGER'
supabase secrets set ALLOWED_WEB_ORIGINS='https://jokesmith-platform.surge.sh'
supabase secrets set PUBLIC_ACCESS_PASSWORD='CHANGE_ME_PUBLIC_ACCESS_PASSWORD'
supabase secrets set PUBLIC_AI_RATE_LIMIT_PER_HOUR='20'
```

部署 Edge Function：

```bash
supabase functions deploy jokesmith-admin --project-ref YOUR_PROJECT_REF --no-verify-jwt
```

更多说明见 [docs/supabase-admin-backend.md](docs/supabase-admin-backend.md)。

## 部署

Surge 静态前端：

```bash
SURGE_DOMAIN=jokesmith-platform.surge.sh \
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co \
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY \
VITE_SUPABASE_ADMIN_FUNCTION=jokesmith-admin \
bash scripts/deploy-surge.sh
```

Vercel 和香港 VPS 部署说明：

- [docs/vercel-runbook.md](docs/vercel-runbook.md)
- [docs/deploy-hk-ip.md](docs/deploy-hk-ip.md)
- [docs/mainland-access-no-icp.md](docs/mainland-access-no-icp.md)

## 当前限制

- AI 写稿和头脑风暴已经迁到 Supabase Edge Function。
- 稿件保存、灵感库、演出排表、录音转文字等仍依赖原 Node/tRPC 后端。
- 如果要完全静态化 Surge 前端，需要继续迁移剩余业务接口到 Supabase。

## 安全说明

- DeepSeek API Key 只应保存在服务端环境变量或 Supabase `api_settings` 表中。
- Supabase service role key 只能用于 Edge Function 或可信服务端。
- 公开 AI 接口需要 `PUBLIC_ACCESS_PASSWORD` 换取 7 天访问会话。
- `PUBLIC_AI_RATE_LIMIT_PER_HOUR` 控制每个 IP/浏览器指纹每小时可调用次数。
