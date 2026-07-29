<p align="center">
  <img src="src/icon.png" alt="Solix" width="80" height="80" />
</p>

<h1 align="center">✨ Solix</h1>

<p align="center">
  <strong>Linux para todos — simples, bonito, sem complicação.</strong><br />
  <sub>Configure, monitore e mantenha seu Linux com poucos cliques.</sub>
</p>

<p align="center">
  <a href="#-filosofia">Filosofia</a> •
  <a href="#-recursos">Recursos</a> •
  <a href="#-instalação">Instalação</a> •
  <a href="#-como-usar">Como usar</a> •
  <a href="#-desenvolvimento">Desenvolvimento</a> •
  <a href="#-licença">Licença</a>
</p>

---

## 🧭 Filosofia

> O Solix nasceu com uma missão simples: **tornar o Linux acessível para todos.**
>
> Acreditamos que ninguém deveria precisar decorar comandos ou passar horas
> procurando tutoriais para configurar seu sistema. Nossa filosofia é eliminar
> a complexidade **sem esconder o poder do Linux**, oferecendo uma experiência
> intuitiva, moderna e acolhedora.
>
> O Solix não substitui o conhecimento — ele remove as barreiras para que
> qualquer pessoa, do iniciante ao desenvolvedor, possa aproveitar o melhor
> do Linux com confiança e poucos cliques.

---

## 🎨 Recursos

### 🏠 Sistema — Tudo que você precisa saber

| Componente | Descrição |
|------------|-----------|
| 👤 **Perfil do usuário** | Avatar, nome, shell e badge de administrador |
| 🖥️ **Hardware em grupos** | Processador (CPU + núcleos), Memória RAM (total + uso), Sistema (GPU + Kernel + Uptime) |
| 📋 **Distribuição** | Nome, versão, família e gerenciador de pacotes — detectados automaticamente |
| 📊 **Visão Geral** | 5 cards com pacotes instalados, atualizações pendentes, carga da CPU, swap e serviços ativos |
| 🔵 **Mini-gauges** | CPU, RAM e Temperatura em tempo real — 40% maiores para facilitar a leitura |
| 🆘 **Ajuda educativa** | Ícones `ⓘ` explicando cada termo técnico em português claro e acolhedor |

### 📊 Desempenho — Monitoramento em tempo real

- Gauges animados de **CPU**, **RAM** e **Temperatura** — atualização a cada 3 segundos
- **Tabela de processos** com busca e ordenação por PID, CPU, memória, estado ou usuário
- Cores dinâmicas nos mostradores (verde → amarelo → vermelho conforme o uso)

### 💾 Discos — Visualize e interaja

- Cards com **nome do dispositivo** (ex: `sda1`), **tipo do sistema de arquivos** (ext4, btrfs, NTFS) e ponto de montagem
- Barra de uso colorida (verde → amarelo → laranja → vermelho)
- 📂 **Abrir** — Abre o gerenciador de arquivos na pasta do disco
- 🔍 **Analisar** — Escaneia e mostra as 15 pastas mais pesadas com barras comparativas
- 📋 **Partições** — Exibe a tabela de partições completa do disco

### 🛠️ Ferramentas — Instale programas com um clique

**80+ ferramentas** pré-configuradas em 9 categorias:

| Categoria | Ferramentas |
|-----------|-------------|
| 🛠️ Desenvolvimento | git, node, python3, gcc, make, java, vscode, gh, rust, go, dbeaver, **neovim**, **lazygit** |
| 🌐 Internet | curl, wget, firefox, chromium, brave, qbittorrent, thunderbird, **transmission-qt**, **filezilla**, **nextcloud-client** |
| 📦 Container | docker, docker-compose, virtualbox |
| 🎮 Jogos | steam, lutris, wine, heroic, prismlauncher, gamemode, mangohud, hydra, **retroarch**, **dolphin-emu**, **pcsx2**, **0ad**, **supertuxkart** |
| 🎵 Mídia | vlc, gimp, obs-studio, kdenlive, audacity, flameshot, inkscape, krita, blender, handbrake, mpv, ffmpeg, **spotify**, **shotcut**, **digikam** |
| 📄 Escritório | libreoffice, onlyoffice, obsidian, **calibre** |
| 💬 Comunicação | discord, telegram, zoom, **signal-desktop**, **slack-desktop**, **element-desktop** |
| 🔧 Utilitários | p7zip, timeshift, htop, fastfetch, flatpak, gnome-tweaks, keepassxc, gufw, openssh, pavucontrol, vim, **nano**, **btop**, **bleachbit**, **stacer**, **syncthing**, **tmux**, **unzip**, **unrar** |
| 🎨 Temas | arc-gtk-theme, papirus-icon-theme, materia-gtk-theme, gtk-theme-windows10, fluent-gtk-theme |

Funcionalidades:
- Busca por nome ou descrição
- Seleção individual ou "Selecionar todas" por categoria
- Instalação e remoção com senha do sistema (cache por sessão)
- Modal de informações com versão, tamanho e ícone do pacote

### ⚡ Operações do Sistema

| Botão | Descrição |
|-------|-----------|
| 🔄 **Atualizar Sistema** | Atualiza todos os pacotes (pacman/apt/dnf/zypper + flatpak) |
| ⚡ **Ativar ZRAM** | Compacta parte da RAM — ideal para máquinas com 4 GB ou menos |
| 🧹 **Limpeza** | Remove cache e pacotes antigos — libera espaço no disco |
| 🐛 **Reportar Problema** | Gera relatório automático do sistema e abre página para reportar no GitHub |

### 🌐 Rede — Conectividade completa

- Status da **Internet** com latência (ping)
- **Ethernet** com endereço IP
- **Wi-Fi** com SSID e intensidade do sinal
- **Bluetooth** ativo/inativo
- **Bateria** do notebook com porcentagem e tempo restante
- 🚀 **Velocímetro** animado com teste de velocidade
- Informações externas: IP público, provedor de internet, localização

### 🔄 Auto-Update

- Verifica automaticamente se há uma **nova versão do Solix disponível**
- Mostra um banner verde no topo da página Sistema
- Clique no banner para abrir a página de release no GitHub

### 🆘 Ajuda Educativa

Ícones `ⓘ` espalhados por toda a interface com explicações em português simples:

> 💡 **CPU:** *"O processador, ou 'cérebro' do computador. Quanto maior a porcentagem, mais ele está trabalhando. Entre 0-30% é uso normal."*
>
> 💡 **Swap:** *"Uma área do disco que o sistema usa como 'memória extra' quando a RAM está cheia. É mais lenta que a RAM, mas evita travamentos."*
>
> 💡 **ZRAM:** *"Compacta parte da memória RAM para evitar lentidão quando o computador está com pouca memória. Recomendado para máquinas com 4GB ou menos."*

### 🧪 Testes Unitários

**65 testes** cobrindo 9 dos 10 módulos do backend Rust:

| Módulo | Testes | O que cobre |
|--------|--------|-------------|
| `tool.rs` | 10 | Base64, validação de 55+ ferramentas, categorias |
| `install.rs` | 6 | Mapeamento de pacotes, comandos multi-distro |
| `distribution.rs` | 14 | Parse de os-release, detecção de distros |
| `system_info.rs` | 12 | Parse de CPU/Memória/Discos |
| `network.rs` | 7 | Formatação de velocidade, conectividade |
| `user.rs` | 6 | Parse de passwd, info do usuário |
| `stats.rs` | 5 | Mapeamento de UID, estados de processo |
| `system_ops.rs` | 3 | Informações de bateria |
| `executable.rs` | 2 | Status de executáveis |

---

## 📸 Capturas de Tela

> *Adicione aqui uma screenshot do Solix em ação!*

```
[Screenshot da página Sistema do Solix]
```

---

## 🚀 Instalação

### Pré-requisitos

- **Rust** (`rustup` + `cargo`)
- Dependências do **Tauri v2**

<details>
<summary><b>Arch Linux / Garuda / Manjaro</b></summary>

```bash
sudo pacman -S --needed \
  webkit2gtk-4.1 libsoup3 glib2 gtk3 \
  gcc-libs glibc pkgconf cmake ninja \
  libayatana-appindicator
```
</details>

<details>
<summary><b>Debian / Ubuntu / Linux Mint</b></summary>

```bash
sudo apt install \
  libwebkit2gtk-4.1-dev libsoup-3.0-dev \
  libgtk-3-dev libayatana-appindicator3-dev \
  build-essential curl wget file \
  libxdo-dev libssl-dev librsvg2-dev
```
</details>

<details>
<summary><b>Fedora</b></summary>

```bash
sudo dnf install \
  webkit2gtk4.1-devel libsoup3-devel \
  gtk3-devel libappindicator-gtk3-devel \
  libxdo-devel openssl-devel
```
</details>

<details>
<summary><b>openSUSE</b></summary>

```bash
sudo zypper install \
  webkit2gtk4-1-devel libsoup3-devel \
  gtk3-devel libappindicator-gtk3-devel \
  libxdo-devel openssl-devel
```
</details>

### Instalação Rápida

```bash
git clone https://github.com/Rafa-MKR2/solix.git
cd solix
sudo ./install.sh
```

Depois de instalado, procure por **Solix** no menu de aplicativos ou execute `solix` no terminal.

### Apenas Build (sem instalar)

```bash
cd solix/src-tauri
cargo build --release
./target/release/solix
```

---

## 📖 Como Usar

### Navegação

A barra lateral organiza o aplicativo em 5 páginas:

| Ícone | Página | Conteúdo |
|-------|--------|----------|
| 🏠 | **Sistema** | Perfil, hardware, distribuição, visão geral e mini-gauges |
| 📊 | **Desempenho** | Gauges completos + tabela de processos ao vivo |
| 💾 | **Discos** | Cards interativos com abrir, analisar e partições |
| 🛠️ | **Ferramentas** | Catálogo com busca, instalação e remoção de programas |
| 🌐 | **Rede** | Conexões, bateria e velocímetro de internet |

### Gerenciando Ferramentas

1. Vá para a página **Ferramentas** 🛠️
2. Busque ou navegue pelas categorias
3. **Clique** nos cards para selecionar (instalar) ou desselecionar (remover)
4. Use o link **"Selecionar todas"** para marcar uma categoria inteira
5. Clique em **Instalar** ou **Remover** no final da página
6. Digite a **senha do sistema** quando solicitado
7. Acompanhe o progresso no log de saída

### Dicas Rápidas

- 🖱️ **Passe o mouse** nos `ⓘ` para ver explicações educativas
- 🔍 Use a **busca** para encontrar ferramentas rapidamente
- 📊 A página **Desempenho** atualiza automaticamente a cada 3 segundos
- 🚀 O **velocímetro** de internet tem animação suave ao testar a velocidade

---

## 🔧 Desenvolvimento

### Estrutura do Projeto

```
solix/
├── src/                        # Frontend (HTML/CSS/JS)
│   ├── index.html              # Estrutura com páginas e modais
│   ├── style.css               # Tema escuro responsivo
│   └── app.js                  # Lógica do frontend
├── src-tauri/                  # Backend Rust (Tauri v2)
│   ├── src/
│   │   ├── main.rs             # Ponto de entrada
│   │   ├── lib.rs              # Comandos Tauri + módulos
│   │   ├── distribution.rs     # Detecção de distribuição Linux
│   │   ├── executable.rs       # Scan de executáveis no PATH
│   │   ├── install.rs          # Instalação/remoção de pacotes
│   │   ├── network.rs          # Ping, Wi-Fi, Bluetooth, bateria
│   │   ├── package_info.rs     # Informações de pacotes + ícones
│   │   ├── stats.rs            # CPU, memória, temperatura, processos
│   │   ├── system_info.rs      # Hardware: CPU, RAM, discos, GPU
│   │   ├── system_ops.rs       # ZRAM, limpeza, bateria
│   │   ├── tool.rs             # Catálogo de 55+ ferramentas
│   │   └── user.rs             # Informações do usuário
│   ├── tauri.conf.json         # Configuração do Tauri
│   └── Cargo.toml              # Dependências Rust
├── dist.sh                     # Script de distribuição
├── install.sh                  # Instalação sistema-wide
├── quick-install.sh            # Instalação rápida
├── solix.desktop               # Atalho de menu
└── README.md                   # Este arquivo
```

### Rodar Testes

```bash
cd src-tauri
cargo test
```

### Adicionar uma Nova Ferramenta

1. Adicione a ferramenta em `src-tauri/src/tool.rs` na função `get_development_tools()`
2. Se o nome do pacote for diferente do nome da ferramenta, mapeie em `install.rs` → `get_package_name()`
3. Opcional: adicione aliases de ícone em `package_info.rs` → `find_icon()`

### Decisões Técnicas

- **Senha**: Coletada via modal e enviada ao `sudo -S stdin`. Verificada antes de cada operação.
- **Multi-distro**: Detecta automaticamente pacotes e comandos corretos (pacman/apt/dnf/zypper).
- **Cancelamento**: Flag atômica global + PID do processo filho para cancelar operações longas.
- **Ícones**: Busca local em `/usr/share/icons/` e fallback para download do Papirus via `curl`.
- **Tooltips**: Sistema próprio com suporte a hover e clique, explicando termos técnicos.

---

## 📜 Licença

**MIT** — Copyright (c) 2025 [Rafa-MKR2](https://github.com/Rafa-MKR2)

*Permissão é concedida, gratuitamente, a qualquer pessoa que obtenha uma cópia deste software e dos arquivos de documentação associados, de usar, copiar, modificar, fundir, publicar, distribuir, sublicenciar e/ou vender cópias do Software.*

---

<p align="center">
  Feito com 💚 e 🦀 Rust + Tauri<br />
  <sub>Solix — Linux para todos</sub>
</p>
