#!/usr/bin/env bash
set -euo pipefail

env_file="${1:-.env.vercel}"
target="${2:-preview}"
git_branch="${3:-}"

if [[ "$target" != "preview" && "$target" != "production" && "$target" != "development" ]]; then
  echo "Target must be one of: preview, production, development" >&2
  exit 1
fi

if [[ ! -f "$env_file" ]]; then
  echo "Environment file not found: $env_file" >&2
  exit 1
fi

if ! command -v vercel >/dev/null 2>&1; then
  echo "vercel CLI is required" >&2
  exit 1
fi

while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line#"${line%%[![:space:]]*}"}"
  line="${line%"${line##*[![:space:]]}"}"

  [[ -z "$line" || "$line" == \#* ]] && continue
  [[ "$line" != *=* ]] && continue

  name="${line%%=*}"
  value="${line#*=}"
  name="${name#"${name%%[![:space:]]*}"}"
  name="${name%"${name##*[![:space:]]}"}"

  echo "Setting $name for $target"
  if [[ -n "$git_branch" ]]; then
    vercel env add "$name" "$target" "$git_branch" --value "$value" --yes --force >/dev/null
  else
    vercel env add "$name" "$target" --value "$value" --yes --force >/dev/null
  fi
done < "$env_file"

echo "Done. Run 'vercel env ls' to confirm variable names, then redeploy."
