# Solix

> Configure seu Linux de forma simples e rápida.

Solix is a desktop GUI tool built with [Tauri](https://tauri.app) that helps Linux beginners
install, remove, update, and monitor their system — all without touching the terminal.

![Solix Screenshot](screenshot.png)

## Features

- **System Overview** — Distribution info, hardware specs (CPU, RAM, GPU, kernel), user profile with avatar.
- **Real-time Monitoring** — Live CPU, RAM, and temperature gauges (polled every 3 seconds).
- **Disk Usage** — Per-disk cards with percentage bars (green → red thresholds).
- **Tool Manager** — 55+ pre-configured tools across 9 categories:
  - Desenvolvimento (git, node, python, gcc, rust, go, vscode, etc.)
  - Internet (brave, chrome, firefox, telegram, discord, etc.)
  - Container (docker, docker-compose, podman)
  - Jogos (steam, lutris, heroic, prismlauncher, gamemode, mangohud, hydra)
  - Mídia (vlc, spotify, audacity, obs-studio, handbrake, mpv, ffmpeg)
  - Escritório (libreoffice, onlyoffice, obsidian, zoom)
  - Comunicação (discord, telegram)
  - Utilitários (timeshift, htop, fastfetch, vim, etc.)
  - Temas (arc, papirus, materia, windows-10, fluent-design)
- **Select/Deselect** — Click to mark for install (absent tools) or removal (installed tools); category-level select-all.
- **Search** — Filter tools by name or description.
- **System Update** — Runs `pacman -Syu` (or apt/dnf/zypper) + `flatpak update` with a confirmation dialog.
- **ZRAM** — One-click ZRAM swap activation (zram-generator or zram-config).
- **Cleanup** — Package manager cache prune + unused Flatpak removal.
- **Network & Battery** — Internet status, Bluetooth, WiFi SSID + signal, battery percentage.
- **Info Modal** — Click the ⓘ button on any tool to see package version, size, description, and icon.
- **Cancellable Operations** — Cancel button kills the running child process via `SIGTERM`.
- **Password Caching** — System password is requested once per session and cached until a wrong attempt.
- **Visual Feedback** — Completion toast with confetti animation, loading shimmer, error alerts.
- **Distro Detection** — Auto-detects Arch, Debian/Ubuntu, Fedora, openSUSE and selects the correct package manager (pacman, apt, dnf, zypper).
- **Icon Lookup** — Tool icons are fetched from local system paths and online (Papirus theme) via curl.

## Architecture

```
solix/
├── src/                        # Frontend (HTML/CSS/JS)
│   ├── index.html              # App skeleton with sidebar + pages
│   ├── style.css               # Dark theme stylesheet
│   ├── app.js                  # Frontend controller
│   └── icon.png                # App icon
├── src-tauri/                  # Rust backend (Tauri v2)
│   ├── src/
│   │   ├── main.rs             # Entry point (Wayland workarounds)
│   │   ├── lib.rs              # Module declarations + Tauri commands
│   │   ├── distribution.rs     # OS-release parsing → distro + PM
│   │   ├── executable.rs       # PATH scan for executables
│   │   ├── install.rs          # Sudo password, package install/remove
│   │   ├── network.rs          # Ping, rfkill, nmcli connectivity
│   │   ├── package_info.rs     # PM queries + Papirus icon download
│   │   ├── stats.rs            # /proc CPU/mem/temperature polling
│   │   ├── system_info.rs     # Hardware detection (cpu, mem, disk, gpu)
│   │   ├── system_ops.rs      # ZRAM, cleanup, battery
│   │   ├── tool.rs            # 55-tool catalog + icon search
│   │   └── user.rs            # User info (avatar, groups, shell)
│   ├── tauri.conf.json         # Tauri configuration
│   ├── Cargo.toml              # Rust dependencies
│   └── icons/                  # Build icons (png, ico, icns)
├── solix.desktop               # Linux desktop entry
├── install.sh                  # Build + system installation script
├── LICENSE                     # MIT License
└── README.md                   # This file
```

## Prerequisites

- **Rust** toolchain (`rustup` + `cargo`)
- **Tauri v2 system dependencies** (webkit2gtk, libsoup, etc.)

### Arch Linux / Garuda

```bash
sudo pacman -S --needed \
  webkit2gtk-4.1 libsoup3 glib2 gtk3 \
  gcc-libs glibc pkgconf cmake ninja \
  libayatana-appindicator
```

### Debian / Ubuntu

```bash
sudo apt install \
  libwebkit2gtk-4.1-dev libsoup-3.0-dev \
  libgtk-3-dev libayatana-appindicator3-dev \
  build-essential curl wget file \
  libxdo-dev libssl-dev librsvg2-dev
```

### Fedora

```bash
sudo dnf install \
  webkit2gtk4.1-devel libsoup3-devel \
  gtk3-devel libappindicator-gtk3-devel \
  libxdo-devel openssl-devel
```

### openSUSE

```bash
sudo zypper install \
  webkit2gtk4-1-devel libsoup3-devel \
  gtk3-devel libappindicator-gtk3-devel \
  libxdo-devel openssl-devel
```

## Build & Install

```bash
# 1. Clone
git clone https://github.com/Rafa-MKR2/solix.git
cd solix

# 2. Build the Rust backend
cd src-tauri
cargo build --release
cd ..

# 3. Install system-wide (optional, adds desktop entry + icon)
sudo ./install.sh
```

After installation, launch Solix from your application menu or run `solix` in a terminal.

To run without installing:

```bash
cd src-tauri
cargo build --release
./target/release/solix
```

## Usage

### Navigation

The sidebar on the left organises the app into five pages:

| Icon | Page       | Content |
|------|------------|---------|
| 🏠   | **Sistema** | User profile, distribution info, live performance gauges, hardware specs |
| 📊   | **Desempenho** | Full-screen CPU / RAM / temperature gauges |
| 💾   | **Discos** | Per-disk usage bars with mount points |
| 🛠️   | **Ferramentas** | Tool catalog with search, select, install, remove, update, zram, cleanup |
| 🌐   | **Rede** | Internet, Bluetooth, WiFi, battery status |

### Managing Tools

1. Navigate to **Ferramentas**.
2. Use the search bar to find tools by name or description.
3. Click a tool card to **select it** for installation (absent) or removal (installed).
4. Selected tools are highlighted. Click again to deselect.
5. Each category has a "Selecionar todas" link to toggle all tools in that category.
6. Click the **Instalar** or **Remover** button at the bottom.
7. Enter your system password when prompted.
8. The output log expands to show real-time command output.

### System Operations

- **🔄 Atualizar Sistema** — Runs the package manager's full system upgrade (`pacman -Syu` / `apt upgrade` / etc.) followed by `flatpak update -y`.
- **⚡ Ativar ZRAM** — Installs `zram-generator` or `zram-config` (distro-dependent) and activates compressed swap in RAM.
- **🧹 Limpeza** — Cleans package manager cache (`pacman -Sc` / `apt autoclean` / etc.) and removes unused Flatpak runtimes.

## Development

### Project structure

The backend is written in Rust, organised into single-responsibility modules under `src-tauri/src/`. The frontend is vanilla HTML/CSS/JS (no framework) served directly by Tauri's webview.

### Adding a new tool

1. Add the tool entry in `src-tauri/src/tool.rs` inside the `get_development_tools()` function.
2. If the package name differs from the tool name, add a mapping in `install.rs` → `get_package_name()`.
3. Optionally add icon aliases in `package_info.rs` → `find_icon()`.

### Key design decisions

- **Password handling**: Password is collected via a GUI modal and piped to `sudo -S stdin`. A `verify_password()` function runs `sudo -S echo ok` before each operation.
- **Distro-agnostic commands**: All package manager queries use `LC_ALL=C` to guarantee English output for parsing.
- **Cancellation**: A global `CANCEL_FLAG` (`AtomicBool`) and `CURRENT_CHILD_PID` (`Mutex<Option<u32>>`) allow the user to kill long-running operations.
- **Icon system**: Local icons are searched in `/usr/share/icons/` and `/usr/share/pixmaps/`. If missing, the app falls back to downloading from the Papirus GitHub repo via `curl`.

## License

[MIT](LICENSE) — Copyright (c) 2025 [Rafa-MKR2](https://github.com/Rafa-MKR2)

---

Built with [Tauri](https://tauri.app) · Rust · HTML · CSS · JavaScript
