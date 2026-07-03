# 中国大陆用户访问方案（不备案）

## 结论

不备案时，不要使用中国大陆服务器、对象存储源站或大陆 CDN 节点。当前可落地路线是：

1. 前端和 API 继续部署在 Vercel，函数区域放香港 `hkg1`。
2. 数据库使用 Supabase/Postgres，区域优先选东京 `hnd1` 或新加坡 `sin1`。
3. 使用自定义域名，不直接让用户访问 `*.vercel.app`。
4. 如果访问仍不稳定，改为香港 VPS 全量部署，域名 A 记录指向香港服务器 IP。

## 推荐路线 A：Vercel + 自定义域名

适合先上线验证，维护成本最低。

### 需要做

1. 购买一个域名，例如 `jokesmith.example`。
2. DNS 托管选择 Cloudflare DNS、DNSPod 国际版或域名商 DNS。
3. 在 Vercel 项目里绑定域名。
4. DNS 增加 Vercel 要求的 `A` 或 `CNAME` 记录。
5. Supabase 数据库区域优先选择东京或新加坡；Supabase/Vercel Marketplace 目前没有香港数据库区域可选。

### 当前项目已完成

`vercel.json` 已设置：

```json
"regions": ["hkg1"]
```

这会让 Vercel Serverless Functions 在香港执行，更接近中国大陆用户。数据库如果用 Supabase，仍优先选东京或新加坡。

### 限制

Vercel 的静态资源由全球网络分发，但它不是中国大陆 CDN。大陆用户访问质量取决于运营商跨境链路，不保证每个地区都稳定。

## 推荐路线 B：香港 VPS 全量部署

适合你想更稳定地覆盖大陆用户，又不想备案。

### 架构

```text
中国大陆用户
  -> 自定义域名
  -> DNS A 记录
  -> 香港 VPS Nginx
  -> Node.js/PM2 后端 + 静态前端
  -> Supabase/Postgres 或本机 Postgres
```

### 服务器建议

优先选香港节点，并确认线路面向大陆优化：

- CN2 GIA / CMI / 精品 BGP / 三网优化优先。
- 最低规格 `2 vCPU / 2 GB RAM` 可先跑。
- 开放 `80`、`443`、`22`。

### 仓库内已有文档

参考：

```text
docs/deploy-hk-ip.md
deploy/nginx-ip.conf
ecosystem.config.cjs
```

后续有域名后，把 Nginx 从 IP 访问改成域名 + HTTPS。

## 不推荐路线

- 不备案使用阿里云/腾讯云中国大陆服务器：不可行。
- 不备案使用中国大陆 CDN 节点：不可行。
- Cloudflare China Network：需要 ICP 备案/许可证和内容审核，不符合“不备案”前提。
- 继续让大陆用户直接访问 `*.vercel.app`：可测试，但不适合作为正式入口。

## 验收方式

1. 用中国大陆网络打开首页和 `/status`。
2. 登录后台，打开 `/admin`。
3. 用站长工具或多个城市节点测试 HTTPS、DNS、首屏时间。
4. 如果多个省份超时或丢包明显，切换到香港 VPS 路线。

## 当前建议

短期先走路线 A：绑定自定义域名 + Vercel 香港函数 + Supabase 东京/新加坡。

如果你已经有域名，把域名发我，我可以继续帮你绑定到 Vercel，并给出 DNS 记录。没有域名的话，先买域名；不需要备案，只要不接入大陆服务器或大陆 CDN。
