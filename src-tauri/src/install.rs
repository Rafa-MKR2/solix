// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2
// GitHub: https://github.com/Rafa-MKR2

use serde::Serialize;
use std::borrow::Cow;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use crate::distribution;
use crate::password;
use crate::tool;

#[derive(Debug, Serialize, Clone)]
pub struct PmLockInfo {
    pub locked: bool,
    pub lock_file: String,
    pub pids: Vec<String>,
    pub process_names: Vec<String>,
    pub message: String,
}

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

pub fn get_package_name(tool_name: &str) -> Cow<'static, str> {
    static PACKAGE_MAP: std::sync::OnceLock<HashMap<&'static str, &'static str>> = std::sync::OnceLock::new();
    let map = PACKAGE_MAP.get_or_init(|| {
        HashMap::from([
            ("git", "git"), ("node", "nodejs"), ("python3", "python3"),
            ("gcc", "gcc"), ("make", "make"), ("java", "default-jre"),
            ("code", "code"), ("gh", "gh"), ("rust", "rust"), ("go", "go"),
            ("dbeaver", "dbeaver"), ("curl", "curl"), ("wget", "wget"),
            ("firefox", "firefox"), ("chromium", "chromium"), ("brave", "brave"),
            ("docker", "docker"), ("steam", "steam"), ("lutris", "lutris"),
            ("wine", "wine"), ("heroic", "heroic-games-launcher"),
            ("prismlauncher", "prismlauncher"), ("vlc", "vlc"), ("gimp", "gimp"),
            ("obs-studio", "obs-studio"), ("kdenlive", "kdenlive"),
            ("audacity", "audacity"), ("flameshot", "flameshot"),
            ("inkscape", "inkscape"), ("krita", "krita"),
            ("libreoffice", "libreoffice"), ("onlyoffice", "onlyoffice"),
            ("obsidian", "obsidian"), ("discord", "discord"),
            ("telegram", "telegram-desktop"), ("zoom", "zoom"),
            ("p7zip", "p7zip"), ("timeshift", "timeshift"),
            ("vim", "vim"), ("htop", "htop"), ("fastfetch", "fastfetch"),
            ("flatpak", "flatpak"), ("gnome-tweaks", "gnome-tweaks"),
            ("keepassxc", "keepassxc"), ("gufw", "gufw"), ("openssh", "openssh"),
            ("pavucontrol", "pavucontrol"), ("qbittorrent", "qbittorrent"),
            ("thunderbird", "thunderbird"),
            ("docker-compose", "docker-compose"), ("virtualbox", "virtualbox"),
            ("gamemode", "gamemode"), ("mangohud", "mangohud"),
            ("hydra", "hydra"), ("blender", "blender"),
            ("handbrake", "handbrake"), ("mpv", "mpv"), ("ffmpeg", "ffmpeg"),
            ("arc-gtk-theme", "arc-gtk-theme"),
            ("papirus-icon-theme", "papirus-icon-theme"),
            ("materia-gtk-theme", "materia-gtk-theme"),
            ("gtk-theme-windows10", "gtk-theme-windows10"),
            ("fluent-gtk-theme", "fluent-gtk-theme"),
            ("neovim", "neovim"), ("lazygit", "lazygit"),
            ("transmission-qt", "transmission-qt"), ("filezilla", "filezilla"),
            ("nextcloud-client", "nextcloud-client"),
            ("signal-desktop", "signal-desktop"),
            ("slack-desktop", "slack-desktop"),
            ("element-desktop", "element-desktop"),
            ("retroarch", "retroarch"), ("dolphin-emu", "dolphin-emu"),
            ("pcsx2", "pcsx2"), ("0ad", "0ad"),
            ("supertuxkart", "supertuxkart"), ("spotify", "spotify"),
            ("shotcut", "shotcut"), ("digikam", "digikam"),
            ("nano", "nano"), ("btop", "btop"), ("bleachbit", "bleachbit"),
            ("stacer", "stacer"), ("syncthing", "syncthing"),
            ("tmux", "tmux"), ("unzip", "unzip"), ("unrar", "unrar"),
            ("calibre", "calibre"),
        ])
    });
    match map.get(tool_name) {
        Some(&name) => Cow::Borrowed(name),
        None => Cow::Owned(tool_name.to_string()),
    }
}

async fn get_distro_and_prefix() -> Result<(distribution::LinuxDistribution, (&'static str, &'static str)), String> {
    let distro = distribution::detect_linux_distribution()
        .await
        .ok_or_else(|| "Não foi possível detectar a distribuição Linux".to_string())?;
 
     let prefixes = get_command_prefixes();
     let prefix = prefixes
         .get(distro.package_manager.as_str())
         .ok_or_else(|| format!("Gerenciador de pacotes não suportado: {}", distro.package_manager))?;

    Ok((distro, *prefix))
}

pub async fn get_install_command(tool_name: &str) -> Result<InstallCommandResult, String> {
    let tools = tool::get_development_tools();
    let tool = tools.iter().find(|t| t.name == tool_name)
        .ok_or_else(|| format!("Ferramenta desconhecida: {}", tool_name))?;
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

            let _ = password::pipe_password(&mut c, password).await;

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
                        success: success && !cancelled,
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



/// Mata processos pacman de consulta (read-only: pacman -Q, pacman -Qu) que
/// estejam rodando, para evitar falso positivo de lock quando uma operação de
/// escrita for iniciada. São processos iniciados pelo nosso próprio HomeStats
/// e serão reiniciados no próximo ciclo de polling.
///
/// Usa SIGKILL (-9) para garantir que o processo termine imediatamente,
/// mesmo se estiver travado (como vimos com pacman -Qu a 100% de CPU).
/// Depois, faz polling no arquivo de lock por até 2 segundos.
pub fn kill_readonly_pacman_queries() {
    let _ = std::process::Command::new("sh")
        .arg("-c")
        .arg("pkill -9 -f 'pacman -Q[[:space:]]' 2>/dev/null; pkill -9 -f 'pacman -Qu[[:space:]]' 2>/dev/null; true")
        .output();
    // Polling: aguarda até 2s o lock ser liberado (em vez de sleep fixo)
    let lock = "/var/lib/pacman/db.lck";
    for _ in 0..20 {
        if !std::path::Path::new(lock).exists() {
            return;
        }
        std::thread::sleep(std::time::Duration::from_millis(100));
    }
}

/// Detecta se o gerenciador de pacotes está bloqueado e qual processo segura o lock
pub fn check_pm_lock_sync() -> PmLockInfo {
    // Lista de lock files conhecidos por gerenciador
    let lock_files = [
        ("/var/lib/pacman/db.lck", "pacman"),
        ("/var/lib/dpkg/lock-frontend", "apt"),
        ("/var/lib/dpkg/lock", "apt"),
        ("/var/run/dnf/metadata.lock", "dnf"),
        ("/var/cache/dnf/metadata.lock", "dnf"),
        ("/var/run/zypper.pid", "zypper"),
        ("/var/lib/rpm/.rpm.lock", "rpm"),
    ];

    for (lock_file, pm_name) in &lock_files {
        if std::path::Path::new(lock_file).exists() {
            // Tenta com fuser primeiro (mais comum)
            let output = std::process::Command::new("sh")
                .arg("-c")
                .arg(format!("fuser {} 2>/dev/null", lock_file))
                .output()
                .ok();

            let pids: Vec<String> = if let Some(out) = output {
                let stdout = String::from_utf8_lossy(&out.stdout);
                stdout
                    .split_whitespace()
                    .filter_map(|s| s.parse::<u32>().ok())
                    .map(|p| p.to_string())
                    .collect()
            } else {
                vec![]
            };

            // Obtém nomes dos processos a partir dos PIDs
            let process_names: Vec<String> = pids
                .iter()
                .filter_map(|pid| {
                    let cmdline = std::fs::read_to_string(format!("/proc/{}/comm", pid)).ok()?;
                    Some(cmdline.trim().to_string())
                })
                .collect();

            let name_list = if process_names.is_empty() {
                "processo desconhecido".to_string()
            } else {
                process_names.join(", ")
            };

            let pid_list = if pids.is_empty() {
                String::new()
            } else {
                format!(" (PID: {})", pids.join(", "))
            };

            let message = format!(
                "🔒 Gerenciador '{}' ocupado!\n\n📌 Arquivo de bloqueio: {}\n🧩 Processo(s): {}{}\n\n💡 Feche o(s) programa(s) acima (Pamac, Discover, Synaptic, terminal) e tente novamente.",
                pm_name, lock_file, name_list, pid_list
            );

            return PmLockInfo {
                locked: true,
                lock_file: lock_file.to_string(),
                pids,
                process_names,
                message,
            };
        }
    }

    PmLockInfo {
        locked: false,
        lock_file: String::new(),
        pids: vec![],
        process_names: vec![],
        message: "Nenhum bloqueio detectado.".to_string(),
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

async fn run_tool_operation(
    tool_names: &[String],
    password: &str,
    prefix: &str,
) -> Result<Vec<InstallResult>, String> {
    CANCEL_FLAG.store(false, Ordering::SeqCst);

    password::verify_password(password).await?;

    crate::stats::set_operation_in_progress(true);
    kill_readonly_pacman_queries();

    let result = async {
        let mut results = Vec::with_capacity(tool_names.len());
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
            let command = format!("{} {}", prefix, package);
            results.push(run_command(password, tool_name, &command).await);
        }
        Ok::<Vec<InstallResult>, String>(results)
    }.await;

    crate::stats::set_operation_in_progress(false);
    CANCEL_FLAG.store(false, Ordering::SeqCst);
    result
}

pub async fn install_tools(tool_names: &[String], password: &str) -> Result<Vec<InstallResult>, String> {
    if tool_names.len() == 1 && tool_names[0] == "__verify__" {
        password::verify_password(password).await?;
        return Ok(vec![InstallResult {
            tool_name: "__verify__".into(),
            command: String::new(),
            success: true,
            cancelled: false,
            output: Some("Senha verificada".into()),
            error: None,
        }]);
    }

    let (_, (install_prefix, _)) = get_distro_and_prefix().await?;
    run_tool_operation(tool_names, password, install_prefix).await
}

pub async fn remove_tools(tool_names: &[String], password: &str) -> Result<Vec<InstallResult>, String> {
    let (_, (_, remove_prefix)) = get_distro_and_prefix().await?;
    run_tool_operation(tool_names, password, remove_prefix).await
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

    crate::stats::set_operation_in_progress(true);
    kill_readonly_pacman_queries();

    let result = async {
        password::verify_password(password).await?;

        let (distro, _) = get_distro_and_prefix().await?;
        let command = get_update_command(&distro.package_manager);
        let mut result = run_command(password, "system-update", command).await;

        if result.success {
            let fp = run_command(password, "flatpak-update", "flatpak update -y 2>/dev/null; echo done").await;
            let out = result.output.unwrap_or_default();
            let fp_out = fp.output.unwrap_or_default();
            result.output = Some(format!("{out}\nFlatpak: {fp_out}"));
        }

        Ok::<InstallResult, String>(result)
    }.await;

    crate::stats::set_operation_in_progress(false);
    CANCEL_FLAG.store(false, Ordering::SeqCst);
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_package_name_known() {
        assert_eq!(get_package_name("node"), "nodejs");
        assert_eq!(get_package_name("python3"), "python3");
        assert_eq!(get_package_name("heroic"), "heroic-games-launcher");
        assert_eq!(get_package_name("telegram"), "telegram-desktop");
        assert_eq!(get_package_name("steam"), "steam");
    }

    #[test]
    fn test_get_package_name_fallback() {
        assert_eq!(get_package_name("unknown-tool"), "unknown-tool");
    }

    #[test]
    fn test_get_package_name_all_mapped() {
        let tools = ["git", "node", "python3", "gcc", "make", "java", "code", "gh", "rust", "go",
            "dbeaver", "neovim", "lazygit", "curl", "wget", "firefox", "chromium", "brave",
            "docker", "steam", "lutris", "wine", "heroic", "prismlauncher", "vlc", "gimp",
            "obs-studio", "kdenlive", "audacity", "flameshot", "inkscape", "krita", "libreoffice",
            "onlyoffice", "obsidian", "discord", "telegram", "zoom", "p7zip", "timeshift", "vim",
            "htop", "fastfetch", "flatpak", "gnome-tweaks", "keepassxc", "gufw", "openssh",
            "pavucontrol", "qbittorrent", "thunderbird", "transmission-qt", "filezilla",
            "nextcloud-client", "signal-desktop", "slack-desktop", "element-desktop",
            "docker-compose", "virtualbox", "gamemode", "mangohud", "hydra", "retroarch",
            "dolphin-emu", "pcsx2", "0ad", "supertuxkart", "blender", "handbrake", "mpv", "ffmpeg",
            "spotify", "shotcut", "digikam", "nano", "btop", "bleachbit", "stacer", "syncthing",
            "tmux", "unzip", "unrar", "calibre", "arc-gtk-theme", "papirus-icon-theme",
            "materia-gtk-theme", "gtk-theme-windows10", "fluent-gtk-theme"];
        for t in &tools {
            let result = get_package_name(t);
            assert!(!result.is_empty(), "Package name for '{}' is empty", t);
        }
    }

    #[test]
    fn test_get_command_prefixes_all_present() {
        let prefixes = get_command_prefixes();
        for pm in &["pacman", "apt", "dnf", "zypper"] {
            let (install, remove) = prefixes.get(pm).expect("Missing prefix for {pm}");
            if *pm == "pacman" {
                assert!(install.contains("-S"), "{pm} install cmd missing");
            } else {
                assert!(install.contains("install"), "{pm} install cmd missing 'install'");
            }
            assert!(remove.contains("remove") || remove.contains("-R"), "{pm} remove cmd wrong");
        }
    }

    #[test]
    fn test_get_update_command_all() {
        assert!(get_update_command("pacman").contains("pacman -Syu"));
        assert!(get_update_command("apt").contains("apt update"));
        assert!(get_update_command("dnf").contains("dnf upgrade"));
        assert!(get_update_command("zypper").contains("zypper update"));
        assert!(get_update_command("unknown").contains("unknown-package-manager"));
    }

    #[test]
    fn test_install_result_struct() {
        let r = InstallResult {
            tool_name: "test".into(),
            command: "echo ok".into(),
            success: true,
            cancelled: false,
            output: Some("ok".into()),
            error: None,
        };
        assert!(r.success);
        assert!(!r.cancelled);
        assert_eq!(r.tool_name, "test");
    }

    // ─── PmLockInfo tests ───

    #[test]
    fn test_pm_lock_info_not_locked() {
        let info = PmLockInfo {
            locked: false,
            lock_file: String::new(),
            pids: vec![],
            process_names: vec![],
            message: "Nenhum bloqueio detectado.".to_string(),
        };
        assert!(!info.locked);
        assert!(info.pids.is_empty());
        assert!(info.process_names.is_empty());
    }

    #[test]
    fn test_pm_lock_info_locked() {
        let info = PmLockInfo {
            locked: true,
            lock_file: "/var/lib/pacman/db.lck".into(),
            pids: vec!["1234".into()],
            process_names: vec!["pacman".into()],
            message: "🔒 Gerenciador 'pacman' ocupado!".into(),
        };
        assert!(info.locked);
        assert_eq!(info.pids.len(), 1);
        assert_eq!(info.process_names[0], "pacman");
    }

    #[test]
    fn test_check_pm_lock_sync_no_lock() {
        let info = check_pm_lock_sync();
        assert!(!info.locked);
    }

    #[test]
    fn test_install_command_result_struct() {
        let r = InstallCommandResult {
            tool_name: "git".into(),
            command: "sudo apt install -y git".into(),
            package_manager: "apt".into(),
            success: true,
            error: None,
        };
        assert!(r.success);
        assert_eq!(r.package_manager, "apt");
    }

    #[test]
    fn test_pm_lock_info_locked_multiple_pids() {
        let info = PmLockInfo {
            locked: true,
            lock_file: "/var/lib/pacman/db.lck".into(),
            pids: vec!["1234".into(), "5678".into()],
            process_names: vec!["pacman".into(), "pamac".into()],
            message: "🔒 Gerenciador 'pacman' ocupado!".into(),
        };
        assert!(info.locked);
        assert_eq!(info.pids.len(), 2);
        assert_eq!(info.process_names[1], "pamac");
    }

    #[test]
    fn test_install_result_cancelled_success_false() {
        let r = InstallResult {
            tool_name: "test".into(),
            command: "echo ok".into(),
            success: false,
            cancelled: true,
            output: Some("cancelled".into()),
            error: Some("Operação cancelada".into()),
        };
        assert!(r.cancelled);
        assert!(!r.success);
    }

    #[test]
    fn test_install_result_output_none() {
        let r = InstallResult {
            tool_name: "test".into(),
            command: "failing".into(),
            success: false,
            cancelled: false,
            output: None,
            error: Some("error".into()),
        };
        assert!(r.output.is_none());
        assert!(!r.success);
    }

    #[test]
    fn test_get_package_name_all_categories() {
        assert_eq!(get_package_name("git"), "git");
        assert_eq!(get_package_name("node"), "nodejs");
        assert_eq!(get_package_name("python3"), "python3");
        assert_eq!(get_package_name("gcc"), "gcc");
        assert_eq!(get_package_name("make"), "make");
        assert_eq!(get_package_name("java"), "default-jre");
        assert_eq!(get_package_name("code"), "code");
        assert_eq!(get_package_name("gh"), "gh");
        assert_eq!(get_package_name("rust"), "rust");
        assert_eq!(get_package_name("go"), "go");
        assert_eq!(get_package_name("dbeaver"), "dbeaver");
        assert_eq!(get_package_name("curl"), "curl");
        assert_eq!(get_package_name("wget"), "wget");
        assert_eq!(get_package_name("firefox"), "firefox");
        assert_eq!(get_package_name("chromium"), "chromium");
        assert_eq!(get_package_name("brave"), "brave");
        assert_eq!(get_package_name("docker"), "docker");
        assert_eq!(get_package_name("steam"), "steam");
        assert_eq!(get_package_name("lutris"), "lutris");
        assert_eq!(get_package_name("wine"), "wine");
        assert_eq!(get_package_name("heroic"), "heroic-games-launcher");
        assert_eq!(get_package_name("prismlauncher"), "prismlauncher");
        assert_eq!(get_package_name("vlc"), "vlc");
        assert_eq!(get_package_name("gimp"), "gimp");
        assert_eq!(get_package_name("obs-studio"), "obs-studio");
        assert_eq!(get_package_name("kdenlive"), "kdenlive");
        assert_eq!(get_package_name("audacity"), "audacity");
        assert_eq!(get_package_name("flameshot"), "flameshot");
        assert_eq!(get_package_name("inkscape"), "inkscape");
        assert_eq!(get_package_name("krita"), "krita");
        assert_eq!(get_package_name("libreoffice"), "libreoffice");
        assert_eq!(get_package_name("onlyoffice"), "onlyoffice");
        assert_eq!(get_package_name("obsidian"), "obsidian");
        assert_eq!(get_package_name("discord"), "discord");
        assert_eq!(get_package_name("telegram"), "telegram-desktop");
        assert_eq!(get_package_name("zoom"), "zoom");
        assert_eq!(get_package_name("p7zip"), "p7zip");
        assert_eq!(get_package_name("timeshift"), "timeshift");
        assert_eq!(get_package_name("vim"), "vim");
        assert_eq!(get_package_name("htop"), "htop");
        assert_eq!(get_package_name("fastfetch"), "fastfetch");
        assert_eq!(get_package_name("flatpak"), "flatpak");
        assert_eq!(get_package_name("gnome-tweaks"), "gnome-tweaks");
        assert_eq!(get_package_name("keepassxc"), "keepassxc");
        assert_eq!(get_package_name("gufw"), "gufw");
        assert_eq!(get_package_name("openssh"), "openssh");
        assert_eq!(get_package_name("pavucontrol"), "pavucontrol");
        assert_eq!(get_package_name("qbittorrent"), "qbittorrent");
        assert_eq!(get_package_name("thunderbird"), "thunderbird");
        assert_eq!(get_package_name("docker-compose"), "docker-compose");
        assert_eq!(get_package_name("virtualbox"), "virtualbox");
        assert_eq!(get_package_name("gamemode"), "gamemode");
        assert_eq!(get_package_name("mangohud"), "mangohud");
        assert_eq!(get_package_name("hydra"), "hydra");
        assert_eq!(get_package_name("blender"), "blender");
        assert_eq!(get_package_name("handbrake"), "handbrake");
        assert_eq!(get_package_name("mpv"), "mpv");
        assert_eq!(get_package_name("ffmpeg"), "ffmpeg");
        assert_eq!(get_package_name("arc-gtk-theme"), "arc-gtk-theme");
        assert_eq!(get_package_name("papirus-icon-theme"), "papirus-icon-theme");
        assert_eq!(get_package_name("materia-gtk-theme"), "materia-gtk-theme");
        assert_eq!(get_package_name("gtk-theme-windows10"), "gtk-theme-windows10");
        assert_eq!(get_package_name("fluent-gtk-theme"), "fluent-gtk-theme");
        assert_eq!(get_package_name("neovim"), "neovim");
        assert_eq!(get_package_name("lazygit"), "lazygit");
        assert_eq!(get_package_name("transmission-qt"), "transmission-qt");
        assert_eq!(get_package_name("filezilla"), "filezilla");
        assert_eq!(get_package_name("nextcloud-client"), "nextcloud-client");
        assert_eq!(get_package_name("signal-desktop"), "signal-desktop");
        assert_eq!(get_package_name("slack-desktop"), "slack-desktop");
        assert_eq!(get_package_name("element-desktop"), "element-desktop");
        assert_eq!(get_package_name("retroarch"), "retroarch");
        assert_eq!(get_package_name("dolphin-emu"), "dolphin-emu");
        assert_eq!(get_package_name("pcsx2"), "pcsx2");
        assert_eq!(get_package_name("0ad"), "0ad");
        assert_eq!(get_package_name("supertuxkart"), "supertuxkart");
        assert_eq!(get_package_name("spotify"), "spotify");
        assert_eq!(get_package_name("shotcut"), "shotcut");
        assert_eq!(get_package_name("digikam"), "digikam");
        assert_eq!(get_package_name("nano"), "nano");
        assert_eq!(get_package_name("btop"), "btop");
        assert_eq!(get_package_name("bleachbit"), "bleachbit");
        assert_eq!(get_package_name("stacer"), "stacer");
        assert_eq!(get_package_name("syncthing"), "syncthing");
        assert_eq!(get_package_name("tmux"), "tmux");
        assert_eq!(get_package_name("unzip"), "unzip");
        assert_eq!(get_package_name("unrar"), "unrar");
        assert_eq!(get_package_name("calibre"), "calibre");
    }

    #[test]
    fn test_get_package_name_returns_self_for_unknown() {
        assert_eq!(get_package_name("nonexistent-tool"), "nonexistent-tool");
    }

    #[test]
    fn test_get_package_name_returns_self_for_empty() {
        assert_eq!(get_package_name(""), "");
    }

    #[test]
    fn test_get_package_name_case_sensitive() {
        // Map has lowercase keys only; mixed case should return self
        assert_eq!(get_package_name("Node"), "Node");
        assert_eq!(get_package_name("FIREFOX"), "FIREFOX");
    }
}

