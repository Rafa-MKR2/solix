#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Copyright (c) 2025 Rafa-MKR2
# GitHub: https://github.com/Rafa-MKR2
#
# Quick install script — downloads pre-built Solix binary and runs it.
# Usage: curl -sSL https://github.com/Rafa-MKR2/solix/releases/download/v1.0/quick-install.sh | bash

set -euo pipefail

APP_NAME="solix"
VERSION="v1.0"
REPO="Rafa-MKR2/solix"
BIN_URL="https://github.com/$REPO/releases/download/$VERSION/$APP_NAME-x86_64-linux"
ARCHIVE_URL="https://github.com/$REPO/releases/download/$VERSION/solix-assets.tar.gz"
INSTALL_DIR="/opt/$APP_NAME"

echo "=== Solix $VERSION Quick Install ==="

# Detect if running with sudo
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo)."
  exit 1
fi

# Create install directory
mkdir -p "$INSTALL_DIR"

# Download binary
echo "Downloading binary..."
curl -sSL "$BIN_URL" -o "$INSTALL_DIR/$APP_NAME"
chmod +x "$INSTALL_DIR/$APP_NAME"

# Download frontend assets
echo "Downloading assets..."
curl -sSL "$ARCHIVE_URL" -o /tmp/solix-assets.tar.gz
tar xzf /tmp/solix-assets.tar.gz -C "$INSTALL_DIR"
rm /tmp/solix-assets.tar.gz

# Create symlink
ln -sf "$INSTALL_DIR/$APP_NAME" /usr/local/bin/$APP_NAME

# Install desktop entry
cat > /usr/share/applications/$APP_NAME.desktop << EOF
[Desktop Entry]
Name=Solix
Comment=Configure seu Linux de forma simples e rápida
Exec=$INSTALL_DIR/$APP_NAME
Path=$INSTALL_DIR
Icon=$INSTALL_DIR/icon.png
Terminal=false
Type=Application
Categories=Utility;System;
StartupWMClass=solix
EOF

# Install icon
cp "$INSTALL_DIR/icon.png" /usr/share/icons/hicolor/128x128/apps/$APP_NAME.png 2>/dev/null || true
gtk-update-icon-cache /usr/share/icons/hicolor/ 2>/dev/null || true

echo ""
echo "✓ Solix $VERSION installed!"
echo "  Run:  solix"
echo "  Or:   $INSTALL_DIR/$APP_NAME"
echo ""
echo "  To uninstall:"
echo "    sudo rm -rf $INSTALL_DIR /usr/local/bin/$APP_NAME /usr/share/applications/$APP_NAME.desktop"
