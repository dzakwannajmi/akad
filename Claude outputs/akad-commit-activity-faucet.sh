#!/usr/bin/env bash
set -euo pipefail

git add \
  contracts/README.md \
  contracts/managed/akad \
  contracts/src/akad.compact \
  frontend/.env.example \
  frontend/app/activity \
  frontend/app/api \
  frontend/app/deploy/page.tsx \
  frontend/app/page.tsx \
  frontend/app/swap/page.tsx \
  frontend/lib/akad-api.ts \
  frontend/lib/activity-api.ts \
  frontend/lib/supabase-admin.ts \
  frontend/lib/contracts/akad \
  frontend/package.json \
  frontend/package-lock.json \
  frontend/public/contracts/akad \
  README.md

git commit -m "$(cat <<'EOF'
feat: add contract-wide activity feed and public AKD faucet

Adds a Supabase-backed activity feed (app/api/activity, app/activity,
lib/activity-api.ts) so the app can show real cross-wallet transaction
history instead of just the current session, since Midnight's indexer
only supports single-transaction lookups, not a list-all-actions-for-a-
contract query. Every row is independently verified against the indexer
(touches this contract, succeeded) before being written, so the feed
cannot be seeded with fake activity just by knowing the request shape.

Also adds a public AKD faucet to akad.compact (faucetAddress ledger,
faucetClaimed map, claimFaucet circuit) so a wallet that has never held
AKD before can bootstrap a one-time 50 AKD claim and actually try a real
swap, instead of failing on "insufficient AKD balance for swap" with no
way to get funded except a manual transfer from the deployer. Wired into
/deploy (Fund Faucet) and /swap (Claim faucet), and recorded in the
activity feed as its own tx type.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01MCZycpTyLo5kLJjWmH7cvm
EOF
)"

git status --short
