// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2
// GitHub: https://github.com/Rafa-MKR2


use serde::Serialize;
use crate::executable;

fn quick_icon(name: &str) -> Option<String> {
    let name_lower = name.to_lowercase();
    let dirs = [
        "/usr/share/icons/hicolor/128x128/apps",
        "/usr/share/icons/hicolor/48x48/apps",
        "/usr/share/icons/hicolor/scalable/apps",
        "/usr/share/pixmaps",
    ];
    for dir in &dirs {
        for (ext, mime) in [("png", "image/png"), ("svg", "image/svg+xml")] {
            let path = format!("{dir}/{name_lower}.{ext}");
            if let Ok(data) = std::fs::read(&path) {
                let b64 = base64_encode(&data);
                return Some(format!("data:{mime};base64,{b64}"));
            }
        }
    }
    None
}

fn base64_encode(data: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::new();
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = chunk.get(1).copied().unwrap_or(0) as u32;
        let b2 = chunk.get(2).copied().unwrap_or(0) as u32;
        let triple = (b0 << 16) | (b1 << 8) | b2;
        result.push(CHARS[((triple >> 18) & 0x3F) as usize] as char);
        result.push(CHARS[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 { result.push(CHARS[((triple >> 6) & 0x3F) as usize] as char); } else { result.push('='); }
        if chunk.len() > 2 { result.push(CHARS[(triple & 0x3F) as usize] as char); } else { result.push('='); }
    }
    result
}

#[derive(Debug, Serialize)]
pub struct DevelopmentTool {
    pub name: String,
    pub description: String,
    pub category: String,
}

#[derive(Debug, Serialize)]
pub struct DevelopmentToolStatus {
    pub name: String,
    pub description: String,
    pub category: String,
    pub available: bool,
    pub executable: Option<String>,
    pub icon_base64: Option<String>,
}

pub fn get_development_tools() -> Vec<DevelopmentTool> {
    vec![
        DevelopmentTool { name: "git".into(), description: "Controle de versão distribuído".into(), category: "desenvolvimento".into() },
        DevelopmentTool { name: "node".into(), description: "Runtime JavaScript".into(), category: "desenvolvimento".into() },
        DevelopmentTool { name: "python3".into(), description: "Linguagem Python".into(), category: "desenvolvimento".into() },
        DevelopmentTool { name: "gcc".into(), description: "Compilador C/C++".into(), category: "desenvolvimento".into() },
        DevelopmentTool { name: "make".into(), description: "Automação de builds".into(), category: "desenvolvimento".into() },
        DevelopmentTool { name: "java".into(), description: "Runtime Java".into(), category: "desenvolvimento".into() },
        DevelopmentTool { name: "code".into(), description: "Visual Studio Code".into(), category: "desenvolvimento".into() },
        DevelopmentTool { name: "gh".into(), description: "GitHub CLI".into(), category: "desenvolvimento".into() },
        DevelopmentTool { name: "rust".into(), description: "Linguagem Rust".into(), category: "desenvolvimento".into() },
        DevelopmentTool { name: "go".into(), description: "Linguagem Go".into(), category: "desenvolvimento".into() },
        DevelopmentTool { name: "dbeaver".into(), description: "Gerenciador de bancos de dados".into(), category: "desenvolvimento".into() },
        // Internet
        DevelopmentTool { name: "curl".into(), description: "Transferência de dados via CLI".into(), category: "internet".into() },
        DevelopmentTool { name: "wget".into(), description: "Download de arquivos via CLI".into(), category: "internet".into() },
        DevelopmentTool { name: "firefox".into(), description: "Navegador web".into(), category: "internet".into() },
        DevelopmentTool { name: "chromium".into(), description: "Navegador open-source".into(), category: "internet".into() },
        DevelopmentTool { name: "brave".into(), description: "Navegador com bloqueador nativo".into(), category: "internet".into() },
        // Container
        DevelopmentTool { name: "docker".into(), description: "Plataforma de containers".into(), category: "container".into() },
        // Jogos
        DevelopmentTool { name: "steam".into(), description: "Plataforma de jogos".into(), category: "jogos".into() },
        DevelopmentTool { name: "lutris".into(), description: "Gerenciador de jogos".into(), category: "jogos".into() },
        DevelopmentTool { name: "wine".into(), description: "Executar apps Windows".into(), category: "jogos".into() },
        DevelopmentTool { name: "heroic".into(), description: "Launcher Epic/GOG".into(), category: "jogos".into() },
        DevelopmentTool { name: "prismlauncher".into(), description: "Launcher de Minecraft".into(), category: "jogos".into() },
        // Mídia
        DevelopmentTool { name: "vlc".into(), description: "Reprodutor multimídia".into(), category: "midia".into() },
        DevelopmentTool { name: "gimp".into(), description: "Editor de imagens".into(), category: "midia".into() },
        DevelopmentTool { name: "obs-studio".into(), description: "Gravação e streaming".into(), category: "midia".into() },
        DevelopmentTool { name: "kdenlive".into(), description: "Editor de vídeo".into(), category: "midia".into() },
        DevelopmentTool { name: "audacity".into(), description: "Editor de áudio".into(), category: "midia".into() },
        DevelopmentTool { name: "flameshot".into(), description: "Captura de tela".into(), category: "midia".into() },
        DevelopmentTool { name: "inkscape".into(), description: "Editor de vetores".into(), category: "midia".into() },
        DevelopmentTool { name: "krita".into(), description: "Pintura digital".into(), category: "midia".into() },
        // Escritório
        DevelopmentTool { name: "libreoffice".into(), description: "Suíte de escritório completa".into(), category: "escritorio".into() },
        DevelopmentTool { name: "onlyoffice".into(), description: "Suíte compatível com Office".into(), category: "escritorio".into() },
        DevelopmentTool { name: "obsidian".into(), description: "App de notas e conhecimento".into(), category: "escritorio".into() },
        // Comunicação
        DevelopmentTool { name: "discord".into(), description: "Chat de voz e texto".into(), category: "comunicacao".into() },
        DevelopmentTool { name: "telegram".into(), description: "Mensageiro rápido e seguro".into(), category: "comunicacao".into() },
        DevelopmentTool { name: "zoom".into(), description: "Videochamadas e reuniões".into(), category: "comunicacao".into() },
        // Utilitários
        DevelopmentTool { name: "p7zip".into(), description: "Compactador de arquivos".into(), category: "utilitarios".into() },
        DevelopmentTool { name: "timeshift".into(), description: "Backup e restauração do sistema".into(), category: "utilitarios".into() },
        DevelopmentTool { name: "htop".into(), description: "Monitor de processos interativo".into(), category: "utilitarios".into() },
        DevelopmentTool { name: "fastfetch".into(), description: "Informações do sistema".into(), category: "utilitarios".into() },
        DevelopmentTool { name: "flatpak".into(), description: "Empacotamento universal de apps".into(), category: "utilitarios".into() },
        DevelopmentTool { name: "gnome-tweaks".into(), description: "Ajustes avançados do GNOME".into(), category: "utilitarios".into() },
        DevelopmentTool { name: "keepassxc".into(), description: "Gerenciador de senhas".into(), category: "utilitarios".into() },
        DevelopmentTool { name: "gufw".into(), description: "Firewall gráfico".into(), category: "utilitarios".into() },
        DevelopmentTool { name: "openssh".into(), description: "Servidor SSH".into(), category: "utilitarios".into() },
        DevelopmentTool { name: "pavucontrol".into(), description: "Controle de volume por app".into(), category: "utilitarios".into() },
        DevelopmentTool { name: "vim".into(), description: "Editor de texto no terminal".into(), category: "utilitarios".into() },
        // Internet
        DevelopmentTool { name: "qbittorrent".into(), description: "Cliente de torrent".into(), category: "internet".into() },
        DevelopmentTool { name: "thunderbird".into(), description: "Cliente de email".into(), category: "internet".into() },
        // Container
        DevelopmentTool { name: "docker-compose".into(), description: "Orquestração de containers".into(), category: "container".into() },
        DevelopmentTool { name: "virtualbox".into(), description: "Máquinas virtuais".into(), category: "container".into() },
        // Jogos
        DevelopmentTool { name: "gamemode".into(), description: "Otimização de performance em jogos".into(), category: "jogos".into() },
        DevelopmentTool { name: "mangohud".into(), description: "Overlay de FPS e desempenho".into(), category: "jogos".into() },
        DevelopmentTool { name: "hydra".into(), description: "Launcher de jogos moderno".into(), category: "jogos".into() },
        // Mídia
        DevelopmentTool { name: "blender".into(), description: "Modelagem e animação 3D".into(), category: "midia".into() },
        DevelopmentTool { name: "handbrake".into(), description: "Conversor de vídeo".into(), category: "midia".into() },
        DevelopmentTool { name: "mpv".into(), description: "Reprodutor multimídia leve".into(), category: "midia".into() },
        DevelopmentTool { name: "ffmpeg".into(), description: "Processamento de áudio e vídeo".into(), category: "midia".into() },
        // Temas
        DevelopmentTool { name: "arc-gtk-theme".into(), description: "Tema GTK moderno (Arc)".into(), category: "temas".into() },
        DevelopmentTool { name: "papirus-icon-theme".into(), description: "Conjunto de ícones Papirus".into(), category: "temas".into() },
        DevelopmentTool { name: "materia-gtk-theme".into(), description: "Tema GTK estilo Material Design".into(), category: "temas".into() },
        DevelopmentTool { name: "gtk-theme-windows10".into(), description: "Tema Windows 10 (B00merang)".into(), category: "temas".into() },
        DevelopmentTool { name: "fluent-gtk-theme".into(), description: "Tema Windows 11 / Fluent Design".into(), category: "temas".into() },
    ]
}

pub async fn detect_development_tools() -> Vec<DevelopmentToolStatus> {
    let tools = get_development_tools();
    let names: Vec<&str> = tools.iter().map(|t| t.name.as_str()).collect();
    let statuses = executable::detect_executables(&names).await;

    tools
        .into_iter()
        .zip(statuses.into_iter())
        .map(|(tool, status)| DevelopmentToolStatus {
            icon_base64: quick_icon(&tool.name),
            name: tool.name,
            description: tool.description,
            category: tool.category,
            available: status.available,
            executable: status.executable,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn get_category_labels() -> [(&'static str, &'static str); 9] {
        [
            ("desenvolvimento", "🛠️ Desenvolvimento"),
            ("internet", "🌐 Internet"),
            ("container", "📦 Container"),
            ("jogos", "🎮 Jogos"),
            ("midia", "🎵 Mídia"),
            ("escritorio", "📄 Escritório"),
            ("comunicacao", "💬 Comunicação"),
            ("utilitarios", "🔧 Utilitários"),
            ("temas", "🎨 Temas"),
        ]
    }

    #[test]
    fn test_get_development_tools_count() {
        let tools = get_development_tools();
        assert!(tools.len() >= 55, "Expected >= 55 tools, got {}", tools.len());
    }

    #[test]
    fn test_get_development_tools_no_duplicates() {
        let tools = get_development_tools();
        let mut names = std::collections::HashSet::new();
        for tool in &tools {
            assert!(names.insert(&tool.name), "Duplicate: {}", tool.name);
        }
    }

    #[test]
    fn test_get_development_tools_valid_categories() {
        let tools = get_development_tools();
        let valid: std::collections::HashSet<&str> =
            get_category_labels().iter().map(|(c, _)| *c).collect();
        for tool in &tools {
            assert!(valid.contains(tool.category.as_str()),
                "Invalid category '{}' for '{}'", tool.category, tool.name);
        }
    }

    #[test]
    fn test_base64_encode_empty() {
        assert_eq!(base64_encode(b""), "");
    }

    #[test]
    fn test_base64_encode_1_byte() { assert_eq!(base64_encode(b"M"), "TQ=="); }
    #[test]
    fn test_base64_encode_2_bytes() { assert_eq!(base64_encode(b"Ma"), "TWE="); }
    #[test]
    fn test_base64_encode_3_bytes() { assert_eq!(base64_encode(b"Man"), "TWFu"); }
    #[test]
    fn test_base64_encode_hello() { assert_eq!(base64_encode(b"Hello World!"), "SGVsbG8gV29ybGQh"); }

    #[test]
    fn test_category_labels_count() {
        assert_eq!(get_category_labels().len(), 9);
    }

    #[test]
    fn test_all_tools_have_descriptions() {
        for tool in &get_development_tools() {
            assert!(!tool.description.is_empty(), "{} has no description", tool.name);
        }
    }
}

