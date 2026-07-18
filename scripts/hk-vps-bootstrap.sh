#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/jokesmith-platform}"
REPO_URL="${REPO_URL:-https://github.com/OwenZhao9/jokesmith-platform.git}"
APP_PORT="${APP_PORT:-3000}"
DOMAIN="${DOMAIN:-_}"
DB_NAME="${DB_NAME:-jokesmith}"
DB_USER="${DB_USER:-jokesmith}"
BUILT_IN_FORGE_API_URL="${BUILT_IN_FORGE_API_URL:-https://api.deepseek.com}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script with sudo or as root." >&2
  exit 1
fi

required_vars=(DB_PASSWORD ADMIN_PASSWORD JWT_SECRET)
for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "$var_name is required." >&2
    exit 1
  fi
done

for value in "$DB_NAME" "$DB_USER" "$DB_PASSWORD"; do
  if [[ "$value" == *"'"* ]]; then
    echo "DB_NAME, DB_USER and DB_PASSWORD cannot contain single quotes." >&2
    exit 1
  fi
done

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y nginx postgresql postgresql-contrib git curl ufw ca-certificates

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

npm install -g pnpm@10.4.1 pm2

sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
  ELSE
    ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\\gexec
SQL

mkdir -p "$(dirname "$PROJECT_DIR")"
if [[ -d "$PROJECT_DIR/.git" ]]; then
  git -C "$PROJECT_DIR" pull --ff-only
else
  rm -rf "$PROJECT_DIR"
  git clone "$REPO_URL" "$PROJECT_DIR"
fi

chown -R "${SUDO_USER:-root}:${SUDO_USER:-root}" "$PROJECT_DIR"

cat > "$PROJECT_DIR/.env" <<ENV
NODE_ENV=production
PORT=${APP_PORT}
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}
JWT_SECRET=${JWT_SECRET}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
BUILT_IN_FORGE_API_URL=${BUILT_IN_FORGE_API_URL}
ENV

if [[ -n "${BUILT_IN_FORGE_API_KEY:-}" ]]; then
  cat >> "$PROJECT_DIR/.env" <<ENV
BUILT_IN_FORGE_API_KEY=${BUILT_IN_FORGE_API_KEY}
ENV
fi

chmod 600 "$PROJECT_DIR/.env"
chown "${SUDO_USER:-root}:${SUDO_USER:-root}" "$PROJECT_DIR/.env"

cd "$PROJECT_DIR"
sudo -u "${SUDO_USER:-root}" pnpm install --frozen-lockfile
sudo -u "${SUDO_USER:-root}" pnpm db:migrate
sudo -u "${SUDO_USER:-root}" pnpm build

pm2 delete jokesmith >/dev/null 2>&1 || true
pm2 start "$PROJECT_DIR/ecosystem.config.cjs"
pm2 save

cat > /etc/nginx/sites-available/jokesmith <<NGINX
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name ${DOMAIN};
    client_max_body_size 50m;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX

ln -sf /etc/nginx/sites-available/jokesmith /etc/nginx/sites-enabled/jokesmith
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

ufw allow OpenSSH
ufw allow 80/tcp
ufw --force enable

echo "JokeSmith is running on port ${APP_PORT} behind Nginx."
echo "Open http://SERVER_IP/ or configure DOMAIN=${DOMAIN} DNS to this server."
