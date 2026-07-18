# 香港轻量服务器 IP 部署

目标：绕开 `*.vercel.app` 在中国大陆不可达/不稳定的问题，单台香港轻量服务器运行前台、后台接口和本机 Postgres。该方案不使用中国大陆服务器或大陆 CDN，因此不需要备案。

## 推荐规格

- 腾讯云国际站 Lighthouse 香港 `Linux Starter`
- `2 vCPU / 2 GB RAM / 40 GB SSD`
- 系统选 Ubuntu 22.04 或 24.04
- 防火墙开放 `22` 和 `80`

## 自动部署

前提：当前代码已经推送到 GitHub `main` 分支。否则服务器会拉到旧版本；这种情况下应使用 `rsync`/`scp` 上传当前目录，或先把改动推送到 GitHub。

在空的 Ubuntu 香港服务器上执行：

```bash
export DB_PASSWORD='CHANGE_ME_STRONG_DB_PASSWORD'
export ADMIN_PASSWORD='CHANGE_ME_STRONG_ADMIN_PASSWORD'
export JWT_SECRET='CHANGE_ME_RANDOM_32_CHARS_OR_LONGER'
export BUILT_IN_FORGE_API_URL='https://api.deepseek.com'
export BUILT_IN_FORGE_API_KEY='CHANGE_ME_DEEPSEEK_API_KEY'
curl -fsSL https://raw.githubusercontent.com/OwenZhao9/jokesmith-platform/main/scripts/hk-vps-bootstrap.sh | sudo -E bash
```

如果你有域名，先把域名 A 记录指向香港服务器 IP，再执行：

```bash
export DOMAIN='your-domain.com'
export DB_PASSWORD='CHANGE_ME_STRONG_DB_PASSWORD'
export ADMIN_PASSWORD='CHANGE_ME_STRONG_ADMIN_PASSWORD'
export JWT_SECRET='CHANGE_ME_RANDOM_32_CHARS_OR_LONGER'
export BUILT_IN_FORGE_API_URL='https://api.deepseek.com'
export BUILT_IN_FORGE_API_KEY='CHANGE_ME_DEEPSEEK_API_KEY'
curl -fsSL https://raw.githubusercontent.com/OwenZhao9/jokesmith-platform/main/scripts/hk-vps-bootstrap.sh | sudo -E bash
```

脚本会完成：

- 安装 Nginx、Postgres、Node.js、pnpm、PM2。
- 创建 Postgres 数据库和用户。
- 拉取项目代码到 `/opt/jokesmith-platform`。
- 写入 `.env`。
- 执行 `pnpm db:migrate` 和 `pnpm build`。
- 用 PM2 启动 Node 后端。
- 配置 Nginx 反代到 `127.0.0.1:3000`。

`DB_PASSWORD` 不要包含单引号；建议使用大小写字母、数字和 `-_!@#`。

访问：

```text
http://服务器公网IP/
```

有域名后访问：

```text
http://your-domain.com/
```

## 手动部署步骤

## 服务器初始化

```bash
sudo apt update
sudo apt install -y nginx postgresql postgresql-contrib git curl ufw

curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

sudo npm install -g pnpm@10.4.1 pm2

sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw --force enable
```

## Postgres

```bash
sudo -u postgres psql
```

```sql
CREATE USER jokesmith WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
CREATE DATABASE jokesmith OWNER jokesmith;
\q
```

## 上传代码

```bash
cd /opt
sudo git clone https://github.com/OwenZhao9/jokesmith-platform.git jokesmith-platform
sudo chown -R $USER:$USER /opt/jokesmith-platform
cd /opt/jokesmith-platform
pnpm install --frozen-lockfile
```

如果不是从 GitHub 拉代码，也可以用 `scp` 或 `rsync` 上传当前目录。

## 环境变量

```bash
cp .env.example .env
nano .env
```

最低需要：

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://jokesmith:CHANGE_ME_STRONG_PASSWORD@localhost:5432/jokesmith
JWT_SECRET=CHANGE_ME_RANDOM_32_CHARS
ADMIN_PASSWORD=CHANGE_ME_ADMIN_PASSWORD
```

AI 生成功能需要：

```bash
BUILT_IN_FORGE_API_URL=https://api.deepseek.com
BUILT_IN_FORGE_API_KEY=CHANGE_ME
```

OAuth 登录如果暂时没配，个人稿件、灵感库、演出排表等登录后功能会显示登录配置缺失。公开 AI 写稿入口仍可先验证。

## 构建和数据库

```bash
pnpm db:migrate
pnpm build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

`pm2 startup` 会输出一条 `sudo env ...` 命令，复制执行一次。

## Nginx

```bash
sudo cp deploy/nginx-ip.conf /etc/nginx/sites-available/jokesmith
sudo ln -sf /etc/nginx/sites-available/jokesmith /etc/nginx/sites-enabled/jokesmith
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

访问：

```text
http://服务器公网IP/
```

## 更新代码

```bash
cd /opt/jokesmith-platform
git pull
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm build
pm2 reload jokesmith
```

## 以后加域名

买域名后把 A 记录指向服务器 IP，再用 Let’s Encrypt 配 HTTPS。到那一步再把 OAuth 回调改成：

```text
https://你的域名/api/oauth/callback
```
