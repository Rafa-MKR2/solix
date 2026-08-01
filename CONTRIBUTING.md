# 🤝 Contribuindo para o Solix

> Resumo técnico para desenvolvedores — visão geral da arquitetura, stack e convenções do projeto.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Desktop | **Tauri v2** (Rust + WebView) |
| Backend | **Rust** — `commands/` + domain modules em `src-tauri/src/` |
| Frontend | **TypeScript vanilla** → compila pra JS em `src/` (source em `src-ts/`) |
| Scripts | **Shell** — `install.sh`, `quick-install.sh`, `dist.sh` |

---

## Arquitetura

### Rust (`src-tauri/src/`)

| Módulo | Responsabilidade |
|--------|-----------------|
| `lib.rs` | Orquestrador puro (~150 linhas), registra ~25 comandos Tauri |
| `commands/` | Comandos Tauri extraídos por domínio |
| `commands/disk.rs` | `analyze_disk_usage`, `get_partition_table` |
| `commands/smart.rs` | S.M.A.R.T. health info |
| `commands/report.rs` | Geração de relatórios do sistema |
| `commands/process.rs` | Kill process, lock check, comandos simples |
| `commands/desktop.rs` | Atalhos `.desktop` |
| `updater.rs` | Auto-update custom (download, SHA256, instalação, restart) |
| `password.rs` | Gerenciamento de senha sudo (cache base64 com expiração) |
| `package_installer.rs` | Instala pacotes .deb/.rpm locais |
| `package_manager.rs` | Abstração multi-distro (pacman/apt/dnf/zypper) |
| `stats.rs` | Leituras de /proc/stat, /proc/meminfo, /proc/diskstats |
| `system_info.rs` | Hardware: CPU, RAM, discos, GPU |
| `system_ops.rs` | ZRAM, limpeza do sistema, bateria |
| `network.rs` | Ping, Wi-Fi, Bluetooth, bateria |
| `user.rs` | Informações do usuário |
| `tool.rs` | Catálogo de 80+ ferramentas em 9 categorias |
| `install.rs` | Instalação/remoção multi-distro (mapeamento pacotes) |
| `distribution.rs` | Detecção de distribuição Linux |
| `executable.rs` | Scan de executáveis no PATH |
| `package_info.rs` | Informações de pacotes + ícones |
| `backup.rs` | Backup de discos (tar.gz) |
| `script_analyzer.rs` | Análise estática de scripts shell |
| `util.rs` | Utilitários diversos |

### TypeScript (`src-ts/` → compila pra `src/`)

| Módulo | Responsabilidade |
|--------|----------------|
| `app.ts` | Bootstrap + delegação para features (~100 linhas) |
| `features/` | **Organizado por funcionalidade** (9 features) |
| `features/home/` | Dashboard: gauges SVG, stats tempo real (polling 3s) |
| `features/disks/` | Discos: render, S.M.A.R.T., backup, partições |
| `features/tools/` | Catálogo: seleção, render, atalhos desktop |
| `features/packages/` | 4 abas: upload, instalados, repositório, histórico |
| `features/network/` | Conectividade, ping, speed test com velocímetro |
| `features/script/` | Analisador: drop zone, análise, render |
| `features/update/` | Auto-update: banner, progress, listener |
| `features/report/` | Relatórios: modal, copy/save/email/github issue |
| `features/developer/` | Roadmap visual, links GitHub |
| `shared/` | **Código reutilizável** |
| `shared/components/` | Modal, Card, Gauge, ProgressBar, Badge, Toast, Table |
| `shared/dialogs/` | PasswordDialog (6 tipos), UpdateDialog, BackupDialog, ReportDialog, ConfirmDialog |
| `shared/services/` | 8 services: system, package, network, disk, process, backup, script, misc |
| `shared/utils/` | tauri (invoke wrapper), escape, dom, toast |
| `shared/types/` | Interfaces compartilhadas (~35 types) |
| `shared/auth.ts` | Estado centralizado de `passwordVerified` |
| `animations.ts` | Confetes, animações |
| `utils.ts` | Re-exporta `shared/utils/` |
| `types.ts` | Re-exporta `shared/types/` |

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
- **Script Analyzer** — Análise estática de scripts shell com sugestões
- **Developer** — Página com roadmap visual e links do projeto

---

## Convenções do projeto

| O que | Regra |
|-------|-------|
| **Commits** | 🇬🇧 Inglês (técnico/universal) — *Conventional Commits* |
| **Release notes** | 🇧🇷 Português (público-alvo pt-BR) |
| **Interface (UI)** | 🇧🇷 Português |
| **Código** | 🇬🇧 Inglês (variáveis, funções, comentários) |
| **Estilo Rust** | `cargo clippy` — zero warnings |
| **Estilo TS** | `npx tsc` sem erros de tipo |
| **Testes** | 442+ testes unitários Rust, sem dependência de rede |
| **Arquitetura Frontend** | Feature-based (`features/`) + Shared (`shared/`) |
| **Comunicação Tauri** | UI **nunca** chama `invoke()` direto — sempre via `shared/services/` |
| **Estado auth** | Centralizado em `shared/auth.ts` (`passwordVerified`) |
| **Diálogos** | Usar `shared/dialogs/` — não criar modais inline |
| **Componentes** | Usar `shared/components/` — base visual consistente |
| **Autenticação sudo** | Sistema próprio (cache com expiração, pipe para stdin) |
| **Distribuição** | Release + assets upados via `gh release upload` |
| **Tamanho arquivos** | Features: 30-200 linhas | Shared: <300 linhas | `lib.rs`: ≤150 |

---

## Pontos de atenção

- **Não usa Tauri Plugin Updater** — updater custom em Rust (`updater.rs`) para controle total do fluxo sudo
- **Frontend é TypeScript compilado** — editar em `src-ts/`, compilar com `npx tsc`
- **quick-install.sh** depende de `solix-assets.tar.gz` → precisa rodar `dist.sh` antes de criar release
- **Testes nunca usam internet** — HTTP mockado via structs injetadas
- **O binário é instalado em** `/opt/solix/solix` com symlink em `/usr/local/bin/solix`
- **Regra de ouro frontend**: `features/` contém lógica de negócio, `shared/` contém código reutilizável — sem acoplamento cruzado entre features

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

### Qualidade (rodar antes de PR)

```bash
# Rust
cd src-tauri
cargo fmt
cargo clippy
cargo test

# TypeScript
npx tsc
```

### Adicionar uma Nova Feature Frontend

1. Criar pasta em `src-ts/features/<nome>/`
2. Criar arquivos: `main.ts` (lógica), `index.ts` (barrel export)
3. Usar `shared/services/` para comunicação com backend
4. Usar `shared/components/` + `shared/dialogs/` para UI
5. Registrar em `app.ts` via dynamic import
6. `npx tsc` — zero erros

### Adicionar um Novo Comando Tauri

1. Criar arquivo em `src-tauri/src/commands/<domain>.rs`
2. Implementar função `pub async fn` com `#[tauri::command]`
3. Registrar em `lib.rs` via `.invoke_handler(tauri::generate_handler![...])`
4. Adicionar service method em `src-ts/shared/services/<domain>.service.ts`
5. `cargo test` + `npx tsc`

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
- **Docs técnicas:** https://github.com/Rafa-MKR2/solix-docs
- **Última release:** https://github.com/Rafa-MKR2/solix/releases/latest
