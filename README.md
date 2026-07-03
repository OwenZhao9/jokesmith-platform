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

## 前端部署

### 方案 A：Surge 静态前端

适合不想备案、先让页面从公开静态域名访问的场景。当前线上方案使用这个方式。

前提：

- Supabase 项目已经创建。
- `jokesmith-admin` Edge Function 已部署。
- 已拿到 Supabase Project URL 和 public anon key。

部署命令：

```bash
SURGE_DOMAIN=jokesmith-platform.surge.sh \
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co \
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY \
VITE_SUPABASE_ADMIN_FUNCTION=jokesmith-admin \
bash scripts/deploy-surge.sh
```

部署后访问：

```text
https://jokesmith-platform.surge.sh
```

注意：Surge 只托管静态文件。AI 写稿、头脑风暴、后台统计等动态能力需要 Supabase Edge Function 或其他后端提供。

### 方案 B：Vercel 前端

适合海外访问、快速 Preview/Production 部署。直接连接 GitHub 仓库后，Vercel 会执行：

```bash
pnpm build:vercel
```

必要环境变量：

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
VITE_SUPABASE_ADMIN_FUNCTION=jokesmith-admin
```

如果同时使用 Vercel serverless 后端，还需要配置 `DATABASE_URL`、`JWT_SECRET`、`ADMIN_PASSWORD` 等服务端变量。

### 方案 C：香港 VPS 前端

适合中国大陆用户访问且不想备案的场景。前端由 Node 构建后作为静态资源随 Express 服务输出，Nginx 反代到 Node：

```bash
pnpm install --frozen-lockfile
pnpm build
pm2 start ecosystem.config.cjs
```

Nginx 配置见：

```text
deploy/nginx-ip.conf
```

完整步骤见 [docs/deploy-hk-ip.md](docs/deploy-hk-ip.md)。

## 后端部署

### 方案 A：Supabase Edge Function

这是当前推荐的轻量后端方案，负责：

- 管理后台登录。
- API Provider、Base URL、模型名和 API Key 配置。
- DeepSeek/OpenAI-compatible 调用。
- API 使用统计。
- 公开 AI 接口访问密码保护。
- 每小时调用限流。

部署步骤：

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

### 方案 B：Vercel Serverless 后端

Vercel 后端入口在：

```text
api/trpc/[...path].ts
api/oauth/callback.ts
```

最低需要配置：

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:6543/postgres?sslmode=require
JWT_SECRET=your_random_32_chars_or_longer
ADMIN_PASSWORD=your_admin_password
```

AI 生成功能需要：

```bash
BUILT_IN_FORGE_API_URL=https://api.deepseek.com
BUILT_IN_FORGE_API_KEY=your_deepseek_api_key_here
```

部署和验收步骤见 [docs/vercel-runbook.md](docs/vercel-runbook.md)。

### 方案 C：香港 VPS Node 后端

VPS 方案使用 Express + PM2 常驻 Node 服务：

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm build
pm2 start ecosystem.config.cjs
pm2 save
```

Nginx 反代：

```bash
sudo cp deploy/nginx-ip.conf /etc/nginx/sites-available/jokesmith
sudo ln -sf /etc/nginx/sites-available/jokesmith /etc/nginx/sites-enabled/jokesmith
sudo nginx -t
sudo systemctl reload nginx
```

自动化脚本：

```bash
export DB_PASSWORD='CHANGE_ME_STRONG_DB_PASSWORD'
export ADMIN_PASSWORD='CHANGE_ME_STRONG_ADMIN_PASSWORD'
export JWT_SECRET='CHANGE_ME_RANDOM_32_CHARS_OR_LONGER'
curl -fsSL https://raw.githubusercontent.com/OwenZhao9/jokesmith-platform/main/scripts/hk-vps-bootstrap.sh | sudo -E bash
```

完整步骤见 [docs/deploy-hk-ip.md](docs/deploy-hk-ip.md)。

## 数据库部署

### 方案 A：Supabase Postgres

适合 Surge 静态前端 + Supabase Edge Function，或 Vercel serverless 后端。

步骤：

1. 在 Supabase Dashboard 创建项目。
2. 复制 Transaction pooler 连接串作为 `DATABASE_URL`。
3. 初始化数据库表：

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db query --linked -f supabase/schema.sql
```

`supabase/schema.sql` 会创建：

- 用户、稿件、灵感、演出、个人风格、头脑风暴、转写表。
- `api_settings`：保存 API Provider、Base URL、模型名和 API Key。
- `api_usage_logs`：保存 API 调用统计。
- `api_rate_limits`：保存限流窗口和调用次数。

所有表默认开启 RLS。浏览器端不能直接读写这些表，只有 Edge Function 使用 service role 访问。

### 方案 B：Vercel / 外部 Postgres

适合 Vercel serverless 后端。配置：

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:6543/postgres?sslmode=require
```

迁移：

```bash
set -a
source .env.vercel
set +a
pnpm db:migrate
```

`pnpm db:migrate` 使用 Drizzle 迁移文件创建表结构。

### 方案 C：香港 VPS 本机 Postgres

适合单台服务器同时运行前端、后端和数据库。

创建数据库：

```bash
sudo -u postgres psql
```

```sql
CREATE USER jokesmith WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
CREATE DATABASE jokesmith OWNER jokesmith;
\q
```

`.env` 配置：

```bash
DATABASE_URL=postgresql://jokesmith:CHANGE_ME_STRONG_PASSWORD@localhost:5432/jokesmith
```

迁移：

```bash
pnpm db:migrate
```

Vercel、Surge + Supabase、香港 VPS 的完整部署说明：

- [docs/vercel-runbook.md](docs/vercel-runbook.md)
- [docs/supabase-admin-backend.md](docs/supabase-admin-backend.md)
- [docs/deploy-surge-supabase.md](docs/deploy-surge-supabase.md)
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
