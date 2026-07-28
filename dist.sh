#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Copyright (c) 2025 Rafa-MKR2
# GitHub: https://github.com/Rafa-MKR2
#
# Builds Solix and packages it for distribution.
# Run this, then upload the files in dist/ to a GitHub Release.

set -euo pipefail

APP_NAME="solix"
VERSION="v1.1.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"

echo "=== Building Solix $VERSION for distribution ==="

# Build
cd "$SCRIPT_DIR/src-tauri"
. "$HOME/.cargo/env"
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
