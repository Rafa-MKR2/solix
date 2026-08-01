#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Copyright (c) 2025 Rafa-MKR2
# GitHub: https://github.com/Rafa-MKR2
#
# Builds Solix and packages it for distribution.
# Run this, then upload the files in dist/ to a GitHub Release.

set -euo pipefail

APP_NAME="solix"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Extrai a versão do Cargo.toml automaticamente
VERSION="v$(grep '^version = ' "$SCRIPT_DIR/src-tauri/Cargo.toml" | head -1 | sed 's/version = "\(.*\)"/\1/')"
DIST_DIR="$SCRIPT_DIR/dist"

echo "=== Building Solix $VERSION for distribution ==="

# Compile TypeScript — fail loudly on errors so stale JS is never shipped
cd "$SCRIPT_DIR"
npm ci --omit=optional 2>/dev/null || true
if [ -x node_modules/.bin/tsc ]; then
  if ! npx tsc; then
    echo "❌ Falha na compilação TypeScript. Corrija os erros acima antes de gerar a release." >&2
    exit 1
  fi
else
  echo "⚠️ TypeScript não instalado (npm ci falhou) — usando JS existente em src/" >&2
fi

# Build Rust — load cargo env (rustup) or rely on cargo already on PATH
cd "$SCRIPT_DIR/src-tauri"
if [ -f "$HOME/.cargo/env" ]; then
  . "$HOME/.cargo/env"
elif ! command -v cargo >/dev/null 2>&1; then
  echo "❌ cargo não encontrado. Instale via rustup (https://rustup.rs) ou pelo gerenciador de pacotes." >&2
  exit 1
fi
cargo build --release
cd "$SCRIPT_DIR"

# Create dist directory
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Copy binary (rename with arch)
BIN="$DIST_DIR/$APP_NAME-x86_64-linux"
cp "src-tauri/target/release/$APP_NAME" "$BIN"
strip "$BIN" 2>/dev/null || true

# Package frontend assets
ASSETS_DIR="$DIST_DIR/assets"
mkdir -p "$ASSETS_DIR"
cp src/index.html src/style.css src/app.js src/icon.png "$ASSETS_DIR/"
cd "$DIST_DIR"
tar czf solix-assets.tar.gz -C "$ASSETS_DIR" .
rm -rf "$ASSETS_DIR"
cd "$SCRIPT_DIR"

# Generate SHA256SUMS for the binary
BIN_NAME="$APP_NAME-x86_64-linux"
(cd "$DIST_DIR" && sha256sum "$BIN_NAME" > SHA256SUMS && echo "$BIN_NAME checksum:" && cat SHA256SUMS)

# Copy install scripts
cp "$SCRIPT_DIR/quick-install.sh" "$DIST_DIR/"
cp "$SCRIPT_DIR/install.sh" "$DIST_DIR/"

echo ""
echo "=== Distribution files ready ==="
echo ""
ls -lh "$DIST_DIR/"
echo ""
echo "Upload these to GitHub Release:"
echo "  https://github.com/Rafa-MKR2/solix/releases/new"
echo ""
echo "  Tag: $VERSION"
echo "  Files:"
for f in "$DIST_DIR"/*; do
  echo "    - $(basename "$f")"
done
