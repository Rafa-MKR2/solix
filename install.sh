#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Copyright (c) 2025 Rafa-MKR2
# GitHub: https://github.com/Rafa-MKR2
set -euo pipefail

APP_NAME="solix"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Compilando $APP_NAME ==="
cd "$SCRIPT_DIR/src-tauri"
. "$HOME/.cargo/env"
cargo build --release

echo "=== Instalando $APP_NAME ==="
sudo cp "target/release/$APP_NAME" /usr/local/bin/
sudo cp "$SCRIPT_DIR/solix.desktop" /usr/share/applications/
sudo cp "$SCRIPT_DIR/src-tauri/icons/128x128.png" "/usr/share/icons/hicolor/128x128/apps/$APP_NAME.png"
sudo gtk-update-icon-cache /usr/share/icons/hicolor/ 2>/dev/null || true

echo "✓ $APP_NAME instalado. Execute com: $APP_NAME"
