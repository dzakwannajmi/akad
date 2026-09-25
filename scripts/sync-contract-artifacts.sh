#!/usr/bin/env bash
# Copies freshly compiled Compact artifacts into every location that consumes them.
# Run after every `compact compile`, before deploying from the frontend.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

for NAME in "$@"; do
  SRC="build/$NAME"
  if [ ! -d "$SRC" ]; then
    echo "!! $SRC not found" >&2
    exit 1
  fi

  echo "== $NAME"

  # 1. Contract JS module loaded by loadCompiledContract()
  [ -d "$SRC/contract" ] || { echo "!! $SRC/contract missing" >&2; exit 1; }
  mkdir -p "frontend/lib/contracts/$NAME"
  rm -rf "frontend/lib/contracts/$NAME/contract"
  cp -r "$SRC/contract" "frontend/lib/contracts/$NAME/contract"
  echo "   -> frontend/lib/contracts/$NAME/contract"

  # 2. ZK assets served over HTTP by FetchZkConfigProvider
  mkdir -p "frontend/public/contracts/$NAME"
  for D in keys zkir; do
    [ -d "$SRC/$D" ] || { echo "!! $SRC/$D missing" >&2; exit 1; }
    rm -rf "frontend/public/contracts/$NAME/$D"
    cp -r "$SRC/$D" "frontend/public/contracts/$NAME/$D"
    echo "   -> frontend/public/contracts/$NAME/$D"
  done

  # 3. managed/ folder kept in git as the standard Compact output location
  mkdir -p "contracts/managed/$NAME"
  for D in compiler contract keys zkir; do
    if [ -d "$SRC/$D" ]; then
      rm -rf "contracts/managed/$NAME/$D"
      cp -r "$SRC/$D" "contracts/managed/$NAME/$D"
    fi
  done
  echo "   -> contracts/managed/$NAME"

  # 4. Contract JS module imported by the headless CLI (packages/cli). Its
  #    bare imports resolve against packages/cli/node_modules from here.
  mkdir -p "packages/cli/contracts/$NAME"
  rm -rf "packages/cli/contracts/$NAME/contract"
  cp -r "$SRC/contract" "packages/cli/contracts/$NAME/contract"
  echo "   -> packages/cli/contracts/$NAME/contract"
done

echo
echo "Resulting timestamps:"
for NAME in "$@"; do
  find "build/$NAME/contract" \
       "frontend/lib/contracts/$NAME/contract" \
       "frontend/public/contracts/$NAME" \
       "contracts/managed/$NAME/contract" \
       "packages/cli/contracts/$NAME/contract" \
       -maxdepth 0 -printf '  %TY-%Tm-%Td %TH:%TM  %p\n' 2>/dev/null
done
