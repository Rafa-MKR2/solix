#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Copyright (c) 2025 Rafa-MKR2
# GitHub: https://github.com/Rafa-MKR2
set -euo pipefail

APP_NAME="solix"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# When run with sudo, use the original user's Rust installation
# We set HOME + RUSTUP_HOME so cargo/rustup find the right toolchains
if [ -n "${SUDO_USER:-}" ]; then
  ORIGINAL_HOME="$(getent passwd "$SUDO_USER" | cut -d: -f6)"
  if [ -f "$ORIGINAL_HOME/.cargo/env" ]; then
    export HOME="$ORIGINAL_HOME"
    . "$ORIGINAL_HOME/.cargo/env"
  fi
else
  [ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"
fi

echo "=== Compilando $APP_NAME ==="
cd "$SCRIPT_DIR/src-tauri"
cargo build --release

echo "=== Instalando $APP_NAME ==="
sudo cp "target/release/$APP_NAME" /usr/local/bin/
sudo cp "$SCRIPT_DIR/solix.desktop" /usr/share/applications/
sudo cp "$SCRIPT_DIR/src-tauri/icons/128x128.png" "/usr/share/icons/hicolor/128x128/apps/$APP_NAME.png"
sudo gtk-update-icon-cache /usr/share/icons/hicolor/ 2>/dev/null || true

echo "✓ $APP_NAME instalado. Execute com: $APP_NAME"
