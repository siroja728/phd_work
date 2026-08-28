#!/usr/bin/env bash
# Rebuild the C++/WASM core and place it into the app tree.
# Run after changing core.hpp or wasm_main.cpp:  npm run build:wasm
#
# Needs Emscripten (em++). We look for it in this order:
#   1. already on PATH
#   2. $EMSDK/emsdk_env.sh          (set EMSDK to your emsdk checkout)
#   3. ~/emsdk/emsdk_env.sh         (default install location)
# Install once with:
#   git clone https://github.com/emscripten-core/emsdk.git ~/emsdk
#   cd ~/emsdk && ./emsdk install latest && ./emsdk activate latest
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v em++ >/dev/null 2>&1; then
  EMSDK_DIR="${EMSDK:-$HOME/emsdk}"
  if [ -f "$EMSDK_DIR/emsdk_env.sh" ]; then
    # shellcheck disable=SC1091
    source "$EMSDK_DIR/emsdk_env.sh" >/dev/null 2>&1
  fi
fi

if ! command -v em++ >/dev/null 2>&1; then
  echo "error: em++ not found." >&2
  echo "Install Emscripten, then set EMSDK to its path (default: ~/emsdk):" >&2
  echo "  git clone https://github.com/emscripten-core/emsdk.git ~/emsdk" >&2
  echo "  cd ~/emsdk && ./emsdk install latest && ./emsdk activate latest" >&2
  exit 1
fi

echo "Using $(em++ --version | head -1)"

OUT_MJS="$ROOT/src/core-wasm/core_wasm.mjs"
OUT_WASM_TMP="$ROOT/src/core-wasm/core_wasm.wasm"
OUT_WASM="$ROOT/public/core_wasm.wasm"

mkdir -p "$ROOT/src/core-wasm" "$ROOT/public"

em++ -std=c++17 -O2 "$ROOT/poc-cpp/wasm_main.cpp" -o "$OUT_MJS" \
  -s MODULARIZE=1 -s EXPORT_ES6=1 \
  -s "EXPORTED_FUNCTIONS=['_process','_malloc','_free']" \
  -s "EXPORTED_RUNTIME_METHODS=['ccall','cwrap']" \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s ENVIRONMENT=web

# em++ emits the .wasm next to the .mjs; the app serves it from /public.
mv -f "$OUT_WASM_TMP" "$OUT_WASM"

echo "✓ built:"
echo "    $OUT_MJS"
echo "    $OUT_WASM  ($(wc -c < "$OUT_WASM" | tr -d ' ') bytes)"
echo "Verify parity with:  npm run test:wasm"
