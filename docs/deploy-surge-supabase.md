# Surge + Supabase 试验方案

## 结论

Surge 只能托管静态前端。当前项目仍然需要 `/api/trpc` 和 `/api/oauth/callback` 这类 Node API，因此这次试验先采用：

```text
中国大陆用户
  -> Surge 静态前端
  -> 外部 API 域名（临时可用 Vercel API，正式建议香港 VPS 或 Supabase Edge Functions）
  -> Supabase/Postgres
```

这可以验证 Surge 静态资源入口是否更容易从大陆打开，但它不是完整的后端迁移。

## 当前代码已支持

- `VITE_API_BASE_URL`：让静态前端调用外部 API，例如 `https://jokesmith-platform.vercel.app`。
- `ALLOWED_WEB_ORIGINS`：API 允许哪些静态前端域名跨域调用。
- `PUBLIC_WEB_ORIGIN`：OAuth 或 API 登录成功后跳回哪个前端域名。
- Surge SPA 路由：部署脚本会把 `index.html` 复制成 `200.html`。

## 首次部署 Surge

如果只是先看静态页面能不能打开：

```bash
SURGE_DOMAIN=jokesmith-platform.surge.sh \
VITE_API_BASE_URL=https://jokesmith-platform.vercel.app \
bash scripts/deploy-surge.sh
```

Surge CLI 第一次运行会要求输入邮箱和密码。这个账号信息需要你自己输入。

## 让动态接口可用

静态前端域名确定后，API 端需要配置：

```bash
ALLOWED_WEB_ORIGINS=https://jokesmith-platform.surge.sh
PUBLIC_WEB_ORIGIN=https://jokesmith-platform.surge.sh
```

如果 API 继续放在 Vercel，还需要重新部署 Vercel，让 CORS 和登录跳转配置生效。

## 限制

- 如果大陆网络无法访问 Vercel API，页面能打开但动态功能仍会失败。
- 跨域 Cookie 依赖浏览器第三方 Cookie 策略，管理员密码登录可能在部分浏览器失效。
- 真正的 Surge + Supabase 架构需要把 tRPC/Node 后端改成 Supabase Auth、RLS、Postgres 查询和 Edge Functions。
- Supabase 免费项目可能暂停，不适合作为正式生产长期无人维护数据库。

## 正式建议

如果 Surge 静态入口验证有效，下一步二选一：

- 保留 Surge 前端，把 API 迁到香港 VPS，数据库用 Supabase/Postgres。
- 重构为 Supabase 原生后端：Auth + RLS + Edge Functions + Storage，移除现有 Node/tRPC 运行时依赖。
