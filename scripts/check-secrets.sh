#!/usr/bin/env bash
# check-secrets.sh — scan STAGED changes for secret-shaped strings before commit.
#
# Usage (run manually before committing/pushing):
#     bash scripts/check-secrets.sh
#
# Exits non-zero if anything suspicious is staged, so it can gate a commit.
set -euo pipefail

fail=0

# 1) Refuse to commit environment / local-secret files (only .env.example is allowed).
staged_files=$(git diff --cached --name-only)
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    .env.example) ;;  # the committed template is allowed
    .env|.env.*|*/.env|*/.env.*)
      echo "BLOCKED: '$f' is staged. Environment files must never be committed."
      fail=1
      ;;
    .dev.vars|*/.dev.vars|.dev.vars.*|*/.dev.vars.*)
      echo "BLOCKED: '$f' is staged. Local Cloudflare vars must never be committed."
      fail=1
      ;;
  esac
done <<EOF
$staged_files
EOF

# 2) Scan the staged diff for secret-shaped tokens:
#    Cloudflare (cfut_), GitHub (ghp_/gho_), Slack (xoxb-), OpenAI-style (sk-...).
if git diff --cached | grep -nE 'cfut_|ghp_|gho_|xoxb-|sk-[A-Za-z0-9]{8}' >/dev/null 2>&1; then
  echo "BLOCKED: a secret-shaped token (cfut_/ghp_/gho_/xoxb-/sk-...) is in the staged diff."
  fail=1
fi

# 2b) Scan for a standalone base64-encoded salt/hash (the admin password secrets):
#     32-byte hash -> 43 base64 chars + '='; 16-byte salt -> 22 chars + '=='.
#     Bounded on both sides so it won't match substrings of longer base64
#     (e.g. lockfile SRI 'sha512-...==' integrity hashes).
if git diff --cached | grep -nE '(^|[^A-Za-z0-9+/-])([A-Za-z0-9+/]{43}=|[A-Za-z0-9+/]{22}==)([^A-Za-z0-9+/=]|$)' >/dev/null 2>&1; then
  echo "BLOCKED: a base64-encoded salt/hash-shaped value is in the staged diff."
  fail=1
fi

# 3) Personal credentials that must never be committed.
if git diff --cached | grep -niE 'lutteberg@gmail\.com' >/dev/null 2>&1; then
  echo "BLOCKED: personal email address found in staged diff."
  fail=1
fi
if git diff --cached | grep -nE '(GMAIL_PASSWORD|GITHUB_PASSWORD|GITHUB_TOKEN|ADMIN_PASSWORD_HASH|ADMIN_PASSWORD_SALT|SESSION_SECRET)[[:space:]]*=[[:space:]]*[^[:space:]]' >/dev/null 2>&1; then
  echo "BLOCKED: a personal password/token assignment is in the staged diff."
  fail=1
fi

if [ "$fail" -ne 0 ]; then
  echo ""
  echo "Commit aborted. Unstage the offending file(s) and remove the secret(s) above."
  exit 1
fi

echo "check-secrets: OK — no secrets detected in staged changes."
exit 0
