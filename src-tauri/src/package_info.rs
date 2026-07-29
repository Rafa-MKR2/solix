// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2
// GitHub: https://github.com/Rafa-MKR2


use serde::Serialize;
use std::process::Command;

use crate::distribution;
use crate::install;

fn find_icon(name: &str) -> Option<String> {
    // Check local filesystem first
    if let Some(local) = find_icon_local(name) {
        return Some(local);
    }

    // Fallback: download from Papirus icon theme
    download_icon(name)
}

fn find_icon_local(name: &str) -> Option<String> {
    let dirs = [
        "/usr/share/icons/hicolor/128x128/apps",
        "/usr/share/icons/hicolor/48x48/apps",
        "/usr/share/icons/hicolor/64x64/apps",
        "/usr/share/icons/hicolor/256x256/apps",
        "/usr/share/icons/hicolor/scalable/apps",
        "/usr/share/pixmaps",
        "/usr/share/icons/breeze/apps/48",
        "/usr/share/icons/Adwaita/48x48/apps",
        "/usr/share/icons/Adwaita/scalable/apps",
    ];

    let name_lower = name.to_lowercase();
    let name_upper = {
        let mut c = name.chars();
        match c.next() {
            None => String::new(),
            Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
        }
    };

    let candidates = vec![
        name.to_string(),
        name_lower.clone(),
        name_upper,
        format!("org.{name_lower}.{name_lower}"),
        format!("org.{name_lower}.desktop"),
    ];

    for sname in &candidates {
        for dir in &dirs {
            for ext in &["png", "svg", "xpm"] {
                let path = format!("{dir}/{sname}.{ext}");
                if let Ok(data) = std::fs::read(&path) {
                    let mime = if *ext == "svg" { "image/svg+xml" } else if *ext == "xpm" { "image/x-xpm" } else { "image/png" };
                    let b64 = base64_encode(&data);
                    return Some(format!("data:{mime};base64,{b64}"));
                }
            }
        }
    }

    // Try .desktop file for Icon= field
    for desk_name in &candidates {
        let desk_path = format!("/usr/share/applications/{desk_name}.desktop");
        if let Ok(content) = std::fs::read_to_string(&desk_path) {
            for line in content.lines() {
                if let Some(icon_name) = line.strip_prefix("Icon=") {
                    let trimmed = icon_name.trim();
                    if !trimmed.is_empty() {
                        return find_icon_local(trimmed);
                    }
                }
            }
        }
    }

    None
}

fn download_icon(name: &str) -> Option<String> {
    let cache_dir = "/tmp/solix-icons";
    let _ = std::fs::create_dir_all(cache_dir);

    let name_lower = name.to_lowercase();
    let cache_path = format!("{cache_dir}/{name_lower}.svg");

    // Check cache
    if let Ok(data) = std::fs::read(&cache_path) {
        let b64 = base64_encode(&data);
        return Some(format!("data:image/svg+xml;base64,{b64}"));
    }

    // Try Papirus theme
    let url = format!("https://raw.githubusercontent.com/PapirusDevelopmentTeam/papirus-icon-theme/master/Papirus/128x128/apps/{name_lower}.svg");

    let status = Command::new("curl")
        .args(["-s", "-o", &cache_path, "-w", "%{http_code}", &url])
        .output().ok()
        .and_then(|o| {
            let code = String::from_utf8_lossy(&o.stdout);
            code.trim().parse::<u16>().ok()
        })
        .unwrap_or(0);

    if status == 200 {
        if let Ok(data) = std::fs::read(&cache_path) {
            let b64 = base64_encode(&data);
            return Some(format!("data:image/svg+xml;base64,{b64}"));
        }
    }

    // Try alternative names for well-known apps
    let alt_names: Vec<&str> = match name_lower.as_str() {
        "code" => vec!["visual-studio-code"],
        "gh" => vec!["github-cli"],
        "node" => vec!["nodejs"],
        "dbeaver" => vec!["dbeaver-ce"],
        "brave" => vec!["brave-browser"],
        "telegram" => vec!["telegram-desktop"],
        "prismlauncher" => vec!["prism-launcher"],
        "qbittorrent" => vec!["qBittorrent"],
        "gnome-tweaks" => vec!["gnome-tweaks", "gnome-tweak-tool"],
        "gufw" => vec!["gufw", "ufw"],
        "pavucontrol" => vec!["pavucontrol"],
        "timeshift" => vec!["timeshift"],
        "keepassxc" => vec!["keepassxc"],
        "fastfetch" => vec!["fastfetch"],
        "onlyoffice" => vec!["onlyoffice-desktopeditors"],
        "libreoffice" => vec!["libreoffice"],
        "obsidian" => vec!["obsidian"],
        "thunderbird" => vec!["thunderbird"],
        "chromium" => vec!["chromium", "chromium-browser"],
        "firefox" => vec!["firefox"],
        "steam" => vec!["steam"],
        "lutris" => vec!["lutris"],
        "wine" => vec!["wine"],
        "heroic" => vec!["heroic"],
        "discord" => vec!["discord"],
        "zoom" => vec!["zoom"],
        "blender" => vec!["blender"],
        "handbrake" => vec!["handbrake"],
        "mpv" => vec!["mpv"],
        "vlc" => vec!["vlc"],
        "gimp" => vec!["gimp"],
        "obs-studio" => vec!["obs"],
        "kdenlive" => vec!["kdenlive"],
        "audacity" => vec!["audacity"],
        "flameshot" => vec!["flameshot"],
        "inkscape" => vec!["inkscape"],
        "krita" => vec!["krita"],
        "virtualbox" => vec!["virtualbox"],
        "docker" => vec!["docker"],
        "docker-compose" => vec!["docker-compose"],
        "htop" => vec!["htop"],
        "vim" => vec!["vim"],
        "gamemode" => vec!["gamemode"],
        "mangohud" => vec!["mangohud"],
        "hydra" => vec!["hydra"],
        "arc-gtk-theme" => vec!["arc"],
        "papirus-icon-theme" => vec!["papirus"],
        "materia-gtk-theme" => vec!["materia"],
        "gtk-theme-windows10" => vec!["windows10"],
        "fluent-gtk-theme" => vec!["fluent"],
        _ => vec![],
    };

    for alt in &alt_names {
        let alt_cache = format!("{cache_dir}/{alt}.svg");
        if let Ok(data) = std::fs::read(&alt_cache) {
            let b64 = base64_encode(&data);
            return Some(format!("data:image/svg+xml;base64,{b64}"));
        }
        let alt_url = format!("https://raw.githubusercontent.com/PapirusDevelopmentTeam/papirus-icon-theme/master/Papirus/128x128/apps/{alt}.svg");
        let status = Command::new("curl")
            .args(["-s", "-o", &alt_cache, "-w", "%{http_code}", &alt_url])
            .output().ok()
            .and_then(|o| {
                let code = String::from_utf8_lossy(&o.stdout);
                code.trim().parse::<u16>().ok()
            })
            .unwrap_or(0);
        if status == 200 {
            if let Ok(data) = std::fs::read(&alt_cache) {
                let b64 = base64_encode(&data);
                return Some(format!("data:image/svg+xml;base64,{b64}"));
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
pub struct PackageDetail {
    pub tool_name: String,
    pub package_name: String,
    pub description: String,
    pub version: String,
    pub size: String,
    pub installed: bool,
    pub icon_base64: Option<String>,
}

fn is_installed(pm: &str, pkg: &str) -> bool {
    match pm {
        "pacman" => Command::new("pacman").args(["-Qi", pkg]).env("LC_ALL", "C").stdout(std::process::Stdio::null()).stderr(std::process::Stdio::null()).status().map(|s| s.success()).unwrap_or(false),
        "apt" => Command::new("dpkg-query").args(["-W", "--showformat=${Status}", pkg]).output().ok().map(|o| String::from_utf8_lossy(&o.stdout).contains("installed")).unwrap_or(false),
        "dnf" | "zypper" => Command::new("rpm").args(["-q", pkg]).stdout(std::process::Stdio::null()).stderr(std::process::Stdio::null()).status().map(|s| s.success()).unwrap_or(false),
        _ => false,
    }
}

fn query_info(pm: &str, pkg: &str, installed: bool) -> (String, String, String) {
    let (cmd, args): (&str, Vec<&str>) = match (pm, installed) {
        ("pacman", true) => ("pacman", vec!["-Qi", pkg]),
        ("pacman", false) => ("pacman", vec!["-Si", pkg]),
        ("apt", _) => ("apt", vec!["show", pkg]),
        ("dnf", _) => ("dnf", vec!["info", pkg]),
        ("zypper", _) => ("zypper", vec!["info", pkg]),
        _ => return ("—".into(), "—".into(), "—".into()),
    };

    let output = Command::new(cmd)
        .args(&args)
        .env("LC_ALL", "C")
        .output().ok();
    let text = output.and_then(|o| {
        if o.status.success() { Some(String::from_utf8_lossy(&o.stdout).to_string()) } else { None }
    }).unwrap_or_default();

    let mut version = "—".to_string();
    let mut size = "—".to_string();
    let mut desc = "—".to_string();

    match pm {
        "pacman" => {
            for line in text.lines() {
                let line = line.trim();
                if let Some((key, val)) = line.split_once(':') {
                    let k = key.trim();
                    let v = val.trim();
                    if k == "Version" { version = v.to_string(); }
                    else if k == "Installed Size" { size = v.to_string(); }
                    else if k == "Download Size" && size == "—" { size = v.to_string(); }
                    else if k == "Description" { desc = v.to_string(); }
                }
            }
        },
        "apt" => {
            for line in text.lines() {
                if let Some((key, val)) = line.split_once(':') {
                    let k = key.trim();
                    let v = val.trim();
                    if k == "Version" { version = v.to_string(); }
                    else if k == "Installed-Size" {
                        let kb: u64 = v.parse().unwrap_or(0);
                        size = if kb > 1024 { format!("{:.1} MB", kb as f64 / 1024.0) } else { format!("{} kB", kb) };
                    }
                    else if k == "Description-en" || k == "Description" { desc = v.to_string(); }
                }
            }
        },
        "dnf" | "zypper" => {
            for line in text.lines() {
                if let Some((key, val)) = line.split_once(':') {
                    let k = key.trim();
                    let v = val.trim();
                    if k == "Version" || k == "Versão" { version = v.to_string(); }
                    else if k == "Size" || k == "Tamanho" { size = v.to_string(); }
                    else if k == "Description" || k == "Descrição" { desc = v.to_string(); }
                }
            }
        },
        _ => {},
    }

    (version, size, desc)
}

pub async fn get_package_info(tool_name: &str) -> Result<PackageDetail, String> {
    let package_name = install::get_package_name(tool_name).to_string();
    let distro = distribution::detect_linux_distribution().await
        .ok_or_else(|| "Não foi possível detectar a distribuição".to_string())?;
    let pm = &distro.package_manager;

    let installed = is_installed(pm, &package_name);
    let (version, size, desc) = query_info(pm, &package_name, installed);

    let icon = find_icon(tool_name);

    Ok(PackageDetail {
        tool_name: tool_name.to_string(),
        package_name,
        description: desc,
        version,
        size,
        installed,
        icon_base64: icon,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_package_detail_complete() {
        let detail = PackageDetail {
            tool_name: "firefox".into(),
            package_name: "firefox".into(),
            description: "Navegador web Firefox".into(),
            version: "123.0".into(),
            size: "50.0 MB".into(),
            installed: true,
            icon_base64: Some("data:image/png;base64,iVBORw0KGgo=".into()),
        };
        assert_eq!(detail.tool_name, "firefox");
        assert_eq!(detail.package_name, "firefox");
        assert_eq!(detail.description, "Navegador web Firefox");
        assert_eq!(detail.version, "123.0");
        assert_eq!(detail.size, "50.0 MB");
        assert!(detail.installed);
        assert_eq!(detail.icon_base64, Some("data:image/png;base64,iVBORw0KGgo=".into()));
    }

    #[test]
    fn test_icon_info_struct() {
        #[derive(Debug, PartialEq)]
        struct IconInfo {
            pub name: String,
            pub data: Option<String>,
        }
        let icon = IconInfo {
            name: "firefox".into(),
            data: Some("data:image/svg+xml;base64,PHN2Zy...".into()),
        };
        assert_eq!(icon.name, "firefox");
        assert!(icon.data.is_some());
        let icon2 = IconInfo {
            name: "unknown".into(),
            data: None,
        };
        assert_eq!(icon2.name, "unknown");
        assert!(icon2.data.is_none());
    }

    #[test]
    fn test_package_detail_icon_none() {
        let detail = PackageDetail {
            tool_name: "teste".into(),
            package_name: "teste-pkg".into(),
            description: String::new(),
            version: "0.1".into(),
            size: "1 KB".into(),
            installed: false,
            icon_base64: None,
        };
        assert!(!detail.installed);
        assert!(detail.icon_base64.is_none());
        assert_eq!(detail.description, "");
    }
}
