#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Copyright (c) 2025 Rafa-MKR2
# GitHub: https://github.com/Rafa-MKR2
set -euo pipefail

APP_NAME="solix"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Build as the original user (not root) so cargo/npm caches stay user-owned.
# Only the install steps below need root. When run via sudo, SUDO_USER holds
# the real user; otherwise we build as the current user.
if [ -n "${SUDO_USER:-}" ] && [ "$SUDO_USER" != "root" ]; then
  BUILD_USER="$SUDO_USER"
else
  BUILD_USER="$(id -un)"
fi

# Run a command as the build user (no-op when already that user).
# SCRIPT_DIR is passed via env (robust against spaces/quotes in the path).
run_as_build_user() {
  if [ "$(id -un)" = "$BUILD_USER" ]; then
    SCRIPT_DIR="$SCRIPT_DIR" bash -c "$1"
  else
    sudo -u "$BUILD_USER" -H env SCRIPT_DIR="$SCRIPT_DIR" bash -c "$1"
  fi
}

echo "=== Compilando TypeScript (usuário: $BUILD_USER) ==="
run_as_build_user 'cd "$SCRIPT_DIR" && npm ci --omit=optional 2>/dev/null || true'
if run_as_build_user 'cd "$SCRIPT_DIR" && [ -x node_modules/.bin/tsc ]'; then
  if ! run_as_build_user 'cd "$SCRIPT_DIR" && npx tsc'; then
    echo "❌ Falha na compilação TypeScript. Corrija os erros acima." >&2
    exit 1
  fi
else
  echo "⚠️ TypeScript não instalado (npm ci falhou) — usando JS existente em src/" >&2
fi

echo "=== Compilando $APP_NAME (usuário: $BUILD_USER) ==="
run_as_build_user 'cd "$SCRIPT_DIR/src-tauri" && [ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"; cargo build --release'

echo "=== Instalando $APP_NAME ==="
sudo cp "$SCRIPT_DIR/src-tauri/target/release/$APP_NAME" /usr/local/bin/
sudo cp "$SCRIPT_DIR/solix.desktop" /usr/share/applications/
sudo cp "$SCRIPT_DIR/src-tauri/icons/128x128.png" "/usr/share/icons/hicolor/128x128/apps/$APP_NAME.png"
sudo gtk-update-icon-cache /usr/share/icons/hicolor/ 2>/dev/null || true

echo "✓ $APP_NAME instalado. Execute com: $APP_NAME"
echo ""
echo "📥 Download direto (pre-compilado):"
echo "   https://github.com/Rafa-MKR2/solix/releases/latest/download/solix-x86_64-linux"
echo ""
echo "🚀 Instalação rápida (como root):"
echo "   curl -sSL https://github.com/Rafa-MKR2/solix/releases/latest/download/quick-install.sh | sudo bash"
