#!/usr/bin/env bash
set -euo pipefail

SURGE_DOMAIN="${SURGE_DOMAIN:-}"

if [[ -z "$SURGE_DOMAIN" ]]; then
  echo "SURGE_DOMAIN is required, for example: jokesmith-platform.surge.sh" >&2
  exit 1
fi

pnpm build:vercel
cp dist/public/index.html dist/public/200.html
printf '%s\n' "$SURGE_DOMAIN" > dist/public/CNAME

pnpm dlx surge dist/public "$SURGE_DOMAIN"
