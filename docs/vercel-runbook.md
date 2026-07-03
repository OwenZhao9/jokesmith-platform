# Vercel 跑通手册

目标：前端、Vercel serverless 后台、管理员登录、Supabase/Postgres 数据库、API 使用统计全部可验证。AI Key 可以后续再接入。

## 1. 准备环境变量

复制模板并填入真实值：

```bash
cp .env.vercel.example .env.vercel
```

必需项：

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:6543/postgres?sslmode=require
JWT_SECRET=至少 32 字节随机字符串
ADMIN_PASSWORD=管理员密码，未配置 OAuth 时也可登录后台
```

`DATABASE_URL` 推荐使用 Supabase 的 Transaction pooler 连接串，适合 Vercel serverless。也兼容 Vercel/Supabase 注入的 `POSTGRES_URL_NON_POOLING` 或 `POSTGRES_URL`，但显式设置 `DATABASE_URL` 最清晰。

可选项：

```bash
VITE_APP_ID=OAuth 应用 ID
VITE_OAUTH_PORTAL_URL=OAuth 登录门户地址
OAUTH_SERVER_URL=OAuth 后台服务地址
OWNER_OPEN_ID=你的 openId，用于首次登录自动变管理员
BUILT_IN_FORGE_API_URL=https://forge.manus.im
BUILT_IN_FORGE_API_KEY=Forge API key
```

## 2. 推送到 Vercel

```bash
bash scripts/vercel-env-push.sh .env.vercel production
vercel env ls
```

Preview 环境变量依赖 Git 仓库连接。如果项目已成功连接 GitHub，可以额外执行：

```bash
bash scripts/vercel-env-push.sh .env.vercel preview main
```

如果 `vercel git connect https://github.com/OwenZhao9/jokesmith-platform.git` 失败，需要先在 Vercel 控制台确认该账号有仓库权限，或把 GitHub 仓库授权给 Vercel。

## 3. 迁移数据库

本地用同一份生产数据库连接串执行：

```bash
set -a
source .env.vercel
set +a
pnpm db:migrate
```

迁移会创建所有 Postgres 表和 enum，包括 `api_usage_logs`，否则管理后台无法统计 API 使用。

## 4. 重新部署

```bash
vercel build --yes
vercel deploy --prebuilt -y
```

需要生产别名时再执行：

```bash
vercel deploy --prod -y
```

## 5. 验收

打开 `/status`，要求：

```text
总体状态：已跑通
DATABASE_URL：正常
数据库连接：正常
API 统计迁移：正常
JWT_SECRET / ADMIN_PASSWORD 或 OAuth：正常
```

然后完成一次登录，打开 `/admin`，确认后台能读取用户和统计。Forge Key 后续配置后，再用 AI 写稿或头脑风暴触发 API 调用，确认：

```text
API 调用数增加
Token 消耗增加
最近 API 使用记录出现对应 feature
```

也可以用脚本检查运行状态：

```bash
BASE_URL=https://jokesmith-platform.vercel.app pnpm verify:runtime
BASE_URL=https://jokesmith-platform.vercel.app STRICT=1 pnpm verify:runtime
```

`STRICT=1` 会在任一必需项缺失时返回非零退出码，适合部署后自动验收。
