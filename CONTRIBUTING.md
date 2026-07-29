# 🤝 Contribuindo para o Solix

> Resumo técnico para desenvolvedores — visão geral da arquitetura, stack e convenções do projeto.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Desktop | **Tauri v2** (Rust + WebView) |
| Backend | **Rust** — monolítico em `src-tauri/src/` |
| Frontend | **TypeScript vanilla** → compila pra JS em `src/` |
| Scripts | **Shell** — `install.sh`, `quick-install.sh`, `dist.sh` |

---

## Arquitetura

### Rust (`src-tauri/src/`)

| Módulo | Responsabilidade |
|--------|-----------------|
| `lib.rs` | Entry point, ~25 comandos Tauri registrados |
| `updater.rs` | Auto-update completo (download, SHA256, instalação, restart) |
| `password.rs` | Gerenciamento de senha sudo (cache em base64) |
| `package_installer.rs` | Instala pacotes .deb/.rpm locais |
| `stats.rs` | Leituras de /proc/stat, /proc/meminfo, /proc/diskstats |
| `system_info.rs` | Hardware: CPU, RAM, discos, GPU |
| `system_ops.rs` | ZRAM, limpeza do sistema, bateria |
| `network.rs` | Ping, Wi-Fi, Bluetooth, bateria |
| `user.rs` | Informações do usuário |
| `tool.rs` | Catálogo de 80+ ferramentas em 9 categorias |
| `install.rs` | Instalação/remoção multi-distro |
| `distribution.rs` | Detecção de distribuição Linux |
| `executable.rs` | Scan de executáveis no PATH |
| `package_info.rs` | Informações de pacotes + ícones |
| `util.rs` | Utilitários diversos |

### TypeScript (`src-ts/` → compila pra `src/`)

| Módulo | Responsabilidade |
|--------|----------------|
| `app.ts` | Setup de event listeners e boot |
| `operations.ts` | Toda lógica de UI (instalar, remover, reportar, backup) |
| `ui.ts` | Renderização de páginas (Discos, Pacotes, Ferramentas, Home) |
| `network.ts` | Testes de ping/speed |
| `animations.ts` | Confetes, animações |
| `types.ts` | Interfaces compartilhadas entre módulos |

### Distribuição

- `dist.sh` → compila Tauri, gera `solix-x86_64-linux`, `solix-assets.tar.gz`, `SHA256SUMS`
- `quick-install.sh` → download direto do binário + assets (detecta última versão via API)
- `install.sh` → compila do código fonte

---

## Features principais

- **Home** — Dashboard CPU/RAM/temperatura/discos com stats em tempo real
- **Ferramentas** — 80+ apps em 9 categorias (instalar/remover com 1 clique)
- **Pacotes** — 4 abas (Instalados, Repositórios, Upload .deb/.rpm, Histórico)
- **Discos** — Tabela estilo Windows com I/O real, modelo, partições, backup
- **Rede** — Info, ping, speed test com velocímetro animado
- **Relatório** — Modal com preview, salvar, email, copiar, abrir GitHub issue
- **Auto-update** — Download → SHA256 → instala → restart, tudo automático
- **Roadmap** — Timeline visual de features implementadas e planejadas

---

## Convenções do projeto

| O que | Regra |
|-------|-------|
| **Commits** | 🇬🇧 Inglês (técnico/universal) |
| **Release notes** | 🇧🇷 Português (público-alvo pt-BR) |
| **Interface (UI)** | 🇧🇷 Português |
| **Código** | 🇬🇧 Inglês (variáveis, funções, comentários) |
| **Estilo Rust** | `cargo clippy` — zero warnings |
| **Estilo TS** | `npx tsc` sem erros de tipo |
| **Testes** | 214+ testes unitários, sem dependência de rede |
| **Autenticação sudo** | Sistema próprio (cache com expiração, pipe para stdin) |
| **Distribuição** | Release + assets upados via `gh release upload` |

---

## Pontos de atenção

- **Não usa Tauri Plugin Updater** — updater custom em Rust (`updater.rs`) para controle total do fluxo sudo
- **Frontend é TypeScript compilado** — editar em `src-ts/`, compilar com `npx tsc`
- **quick-install.sh** depende de `solix-assets.tar.gz` → precisa rodar `dist.sh` antes de criar release
- **Testes nunca usam internet** — HTTP mockado via structs injetadas
- **O binário é instalado em** `/opt/solix/solix` com symlink em `/usr/local/bin/solix`

---

## Desenvolvimento

### Build

```bash
# TypeScript
npx tsc

# Rust
cd src-tauri
cargo build --release
```

### Testes

```bash
cd src-tauri
cargo test
```

### Release (nova versão)

```bash
# 1. Atualizar versão em Cargo.toml, tauri.conf.json e package.json
# 2. Commitar: chore: bump version to X.Y.Z
# 3. Criar tag: git tag vX.Y.Z
# 4. Push: git push origin main --tags
# 5. Rodar dist.sh
# 6. Upload: gh release upload vX.Y.Z dist/* --clobber
# 7. Editar release notes via GitHub ou gh release edit
```

---

## Links

- **GitHub:** https://github.com/Rafa-MKR2/solix
- **Última release:** https://github.com/Rafa-MKR2/solix/releases/latest
