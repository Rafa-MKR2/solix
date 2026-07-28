// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2
// GitHub: https://github.com/Rafa-MKR2


use serde::Serialize;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use crate::distribution;
use crate::tool;

static CANCEL_FLAG: AtomicBool = AtomicBool::new(false);
static CURRENT_CHILD_PID: Mutex<Option<u32>> = Mutex::new(None);

#[derive(Debug, Serialize)]
pub struct InstallCommandResult {
    pub tool_name: String,
    pub command: String,
    pub package_manager: String,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct InstallResult {
    pub tool_name: String,
    pub command: String,
    pub success: bool,
    pub cancelled: bool,
    pub output: Option<String>,
    pub error: Option<String>,
}

fn get_command_prefixes() -> HashMap<&'static str, (&'static str, &'static str)> {
    let mut map = HashMap::new();
    map.insert("pacman", ("sudo -S pacman -S --noconfirm", "sudo -S pacman -R --noconfirm"));
    map.insert("apt", ("sudo -S apt install -y", "sudo -S apt remove -y"));
    map.insert("dnf", ("sudo -S dnf install -y", "sudo -S dnf remove -y"));
    map.insert("zypper", ("sudo -S zypper install -y", "sudo -S zypper remove -y"));
    map
}

pub fn get_package_name(tool_name: &str) -> &str {
    let package_map: HashMap<&str, &str> = [
        ("git", "git"),
        ("node", "nodejs"),
        ("python3", "python3"),
        ("gcc", "gcc"),
        ("make", "make"),
        ("java", "default-jre"),
        ("code", "code"),
        ("gh", "gh"),
        ("rust", "rust"),
        ("go", "go"),
        ("dbeaver", "dbeaver"),
        ("curl", "curl"),
        ("wget", "wget"),
        ("firefox", "firefox"),
        ("chromium", "chromium"),
        ("brave", "brave"),
        ("docker", "docker"),
        ("steam", "steam"),
        ("lutris", "lutris"),
        ("wine", "wine"),
        ("heroic", "heroic-games-launcher"),
        ("prismlauncher", "prismlauncher"),
        ("vlc", "vlc"),
        ("gimp", "gimp"),
        ("obs-studio", "obs-studio"),
        ("kdenlive", "kdenlive"),
        ("audacity", "audacity"),
        ("flameshot", "flameshot"),
        ("inkscape", "inkscape"),
        ("krita", "krita"),
        ("libreoffice", "libreoffice"),
        ("onlyoffice", "onlyoffice"),
        ("obsidian", "obsidian"),
        ("discord", "discord"),
        ("telegram", "telegram-desktop"),
        ("zoom", "zoom"),
        ("p7zip", "p7zip"),
        ("timeshift", "timeshift"),
        ("vim", "vim"),
        ("htop", "htop"),
        ("fastfetch", "fastfetch"),
        ("flatpak", "flatpak"),
        ("gnome-tweaks", "gnome-tweaks"),
        ("keepassxc", "keepassxc"),
        ("gufw", "gufw"),
        ("openssh", "openssh"),
        ("pavucontrol", "pavucontrol"),
        ("qbittorrent", "qbittorrent"),
        ("thunderbird", "thunderbird"),
        ("docker-compose", "docker-compose"),
        ("virtualbox", "virtualbox"),
        ("gamemode", "gamemode"),
        ("mangohud", "mangohud"),
        ("hydra", "hydra"),
        ("blender", "blender"),
        ("handbrake", "handbrake"),
        ("mpv", "mpv"),
        ("ffmpeg", "ffmpeg"),
        ("arc-gtk-theme", "arc-gtk-theme"),
        ("papirus-icon-theme", "papirus-icon-theme"),
        ("materia-gtk-theme", "materia-gtk-theme"),
        ("gtk-theme-windows10", "gtk-theme-windows10"),
        ("fluent-gtk-theme", "fluent-gtk-theme"),
    ].iter().copied().collect();
    package_map.get(tool_name).copied().unwrap_or(tool_name)
}

async fn get_distro_and_prefix() -> Result<(distribution::LinuxDistribution, (&'static str, &'static str)), String> {
    let distro = distribution::detect_linux_distribution()
        .await
        .ok_or_else(|| "Unable to detect Linux distribution".to_string())?;

    let prefixes = get_command_prefixes();
    let prefix = prefixes
        .get(distro.package_manager.as_str())
        .ok_or_else(|| format!("Unsupported package manager: {}", distro.package_manager))?;

    Ok((distro, *prefix))
}

pub async fn get_install_command(tool_name: &str) -> Result<InstallCommandResult, String> {
    let tools = tool::get_development_tools();
    let tool = tools.iter().find(|t| t.name == tool_name)
        .ok_or_else(|| format!("Unknown tool: {}", tool_name))?;
    let (distro, (install_prefix, _)) = get_distro_and_prefix().await?;
    Ok(InstallCommandResult {
        tool_name: tool.name.clone(),
        command: format!("{} {}", install_prefix, tool.name),
        package_manager: distro.package_manager.clone(),
        success: true,
        error: None,
    })
}

pub async fn run_command(password: &str, tool_name: &str, command: &str) -> InstallResult {
    let child = tokio::process::Command::new("sh")
        .arg("-c")
        .arg(command)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn();

    match child {
        Ok(mut c) => {
            let pid = c.id().unwrap_or(0);
            if let Ok(mut guard) = CURRENT_CHILD_PID.lock() {
                *guard = Some(pid);
            }

            if let Some(mut stdin) = c.stdin.take() {
                use tokio::io::AsyncWriteExt;
                let input = format!("{}\n", password);
                let _ = stdin.write_all(input.as_bytes()).await;
                let _ = stdin.shutdown().await;
            }

            let output = c.wait_with_output().await;

            if let Ok(mut guard) = CURRENT_CHILD_PID.lock() {
                if *guard == Some(pid) {
                    *guard = None;
                }
            }

            let cancelled = CANCEL_FLAG.load(Ordering::SeqCst);

            match output {
                Ok(out) => {
                    let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                    let stderr = String::from_utf8_lossy(&out.stderr).to_string();
                    let success = out.status.success();
                    let (output_text, error_text) = if cancelled {
                        (String::new(), Some("Operação cancelada".to_string()))
                    } else if success {
                        (stdout, None)
                    } else {
                        (stderr.clone(), Some(stderr))
                    };
                    InstallResult {
                        tool_name: tool_name.to_string(),
                        command: command.to_string(),
                        success: cancelled || success,
                        cancelled,
                        output: Some(output_text),
                        error: error_text,
                    }
                }
                Err(e) => InstallResult {
                    tool_name: tool_name.to_string(),
                    command: command.to_string(),
                    success: false,
                    cancelled,
                    output: None,
                    error: Some(if cancelled { "Operação cancelada".to_string() } else { e.to_string() }),
                },
            }
        }
        Err(e) => InstallResult {
            tool_name: tool_name.to_string(),
            command: command.to_string(),
            success: false,
            cancelled: false,
            output: None,
            error: Some(e.to_string()),
        },
    }
}

pub async fn verify_password(password: &str) -> Result<(), String> {
    let mut child = tokio::process::Command::new("sh")
        .arg("-c")
        .arg("sudo -S echo ok")
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn sudo: {}", e))?;

    if let Some(mut stdin) = child.stdin.take() {
        use tokio::io::AsyncWriteExt;
        let input = format!("{}\n", password);
        stdin.write_all(input.as_bytes()).await.map_err(|e| format!("Failed to write password: {}", e))?;
        stdin.shutdown().await.map_err(|e| format!("Failed to close stdin: {}", e))?;
    }

    let output = child.wait_with_output().await.map_err(|e| format!("Failed to wait for sudo: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(stderr.to_string())
    }
}

pub async fn cancel_operation_inner() {
    CANCEL_FLAG.store(true, Ordering::SeqCst);
    if let Ok(mut guard) = CURRENT_CHILD_PID.lock() {
        if let Some(pid) = guard.take() {
            let _ = std::process::Command::new("kill")
                .arg("-TERM")
                .arg(pid.to_string())
                .spawn();
        }
    }
}

pub async fn install_tools(tool_names: &[String], password: &str) -> Result<Vec<InstallResult>, String> {
    CANCEL_FLAG.store(false, Ordering::SeqCst);
    verify_password(password).await?;

    let (_, (install_prefix, _)) = get_distro_and_prefix().await?;
    let mut results = Vec::new();
    for tool_name in tool_names {
        if CANCEL_FLAG.load(Ordering::SeqCst) {
            results.push(InstallResult {
                tool_name: tool_name.to_string(),
                command: String::new(),
                success: false,
                cancelled: true,
                output: None,
                error: Some("Operação cancelada".to_string()),
            });
            continue;
        }
        let package = get_package_name(tool_name);
        let command = format!("{} {}", install_prefix, package);
        results.push(run_command(password, tool_name, &command).await);
    }
    CANCEL_FLAG.store(false, Ordering::SeqCst);
    Ok(results)
}

pub async fn remove_tools(tool_names: &[String], password: &str) -> Result<Vec<InstallResult>, String> {
    CANCEL_FLAG.store(false, Ordering::SeqCst);
    verify_password(password).await?;

    let (_, (_, remove_prefix)) = get_distro_and_prefix().await?;
    let mut results = Vec::new();
    for tool_name in tool_names {
        if CANCEL_FLAG.load(Ordering::SeqCst) {
            results.push(InstallResult {
                tool_name: tool_name.to_string(),
                command: String::new(),
                success: false,
                cancelled: true,
                output: None,
                error: Some("Operação cancelada".to_string()),
            });
            continue;
        }
        let package = get_package_name(tool_name);
        let command = format!("{} {}", remove_prefix, package);
        results.push(run_command(password, tool_name, &command).await);
    }
    CANCEL_FLAG.store(false, Ordering::SeqCst);
    Ok(results)
}

fn get_update_command(pm: &str) -> &'static str {
    match pm {
        "pacman" => "sudo -S pacman -Syu --noconfirm",
        "apt" => "sudo -S sh -c 'apt update && apt upgrade -y'",
        "dnf" => "sudo -S dnf upgrade -y",
        "zypper" => "sudo -S zypper update -y",
        _ => "sudo -S echo unknown-package-manager",
    }
}

pub async fn update_system(password: &str) -> Result<InstallResult, String> {
    CANCEL_FLAG.store(false, Ordering::SeqCst);
    verify_password(password).await?;

    let (distro, _) = get_distro_and_prefix().await?;
    let command = get_update_command(&distro.package_manager);
    let mut result = run_command(password, "system-update", command).await;

    if result.success {
        let fp = run_command(password, "flatpak-update", "flatpak update -y 2>/dev/null; echo done").await;
        let out = result.output.unwrap_or_default();
        let fp_out = fp.output.unwrap_or_default();
        result.output = Some(format!("{out}\nFlatpak: {fp_out}"));
    }

    CANCEL_FLAG.store(false, Ordering::SeqCst);
    Ok(result)
}
