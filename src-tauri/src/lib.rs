// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2
// GitHub: https://github.com/Rafa-MKR2


mod distribution;
mod executable;
mod install;
mod network;
mod package_info;
mod package_installer;
mod password;
mod stats;
mod system_info;
mod system_ops;
mod tool;
mod user;
mod util;

use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct AppUpdateInfo {
    pub current_version: String,
    pub latest_version: String,
    pub update_available: bool,
    pub release_url: String,
    pub release_notes: String,
}

#[derive(Debug, Serialize)]
pub struct DiskUsageItem {
    pub path: String,
    pub size: String,
}

#[derive(Debug, Serialize)]
pub struct SystemInfo {
    pub distribution: Option<distribution::LinuxDistribution>,
    pub package_managers: Vec<executable::ExecutableStatus>,
    pub tools: Vec<tool::DevelopmentToolStatus>,
    pub hardware: system_info::SystemHardware,
    pub user: user::UserInfo,
}

#[tauri::command]
async fn get_system_info() -> Result<SystemInfo, String> {
    let distro = distribution::detect_linux_distribution().await;
    let pm_names = vec!["pacman", "apt", "dnf", "zypper"];
    let package_managers = executable::detect_executables(&pm_names).await;
    let tools = tool::detect_development_tools().await;
    let hardware = tokio::task::spawn_blocking(system_info::get_system_hardware)
        .await
        .map_err(|_| "Erro ao carregar informações de hardware".to_string())?;
    let user = tokio::task::spawn_blocking(user::get_user_info)
        .await
        .map_err(|_| "Erro ao carregar informações do usuário".to_string())?;

    Ok(SystemInfo {
        distribution: distro,
        package_managers,
        tools,
        hardware,
        user,
    })
}

#[tauri::command]
async fn get_install_command(tool_name: String) -> Result<install::InstallCommandResult, String> {
    install::get_install_command(&tool_name).await
}

#[tauri::command]
async fn install_tools(app: tauri::AppHandle, tool_names: Vec<String>, password: String) -> Result<Vec<install::InstallResult>, String> {
    install::install_tools(&tool_names, &password, Some(&app)).await
}

#[tauri::command]
async fn remove_tools(app: tauri::AppHandle, tool_names: Vec<String>, password: String) -> Result<Vec<install::InstallResult>, String> {
    install::remove_tools(&tool_names, &password, Some(&app)).await
}

#[tauri::command]
async fn update_system(app: tauri::AppHandle, password: String) -> Result<install::InstallResult, String> {
    install::update_system(&password, Some(&app)).await
}

#[tauri::command]
async fn enable_zram(app: tauri::AppHandle, password: String) -> Result<install::InstallResult, String> {
    system_ops::enable_zram(&password, Some(&app)).await
}

#[tauri::command]
async fn cleanup_system(app: tauri::AppHandle, password: String) -> Result<install::InstallResult, String> {
    system_ops::cleanup_system(&password, Some(&app)).await
}

#[tauri::command]
async fn check_pm_lock() -> Result<install::PmLockInfo, String> {
    let info = tokio::task::spawn_blocking(|| {
        install::check_pm_lock_sync()
    })
    .await
    .map_err(|_| "Erro ao verificar lock".to_string())?;
    Ok(info)
}

#[tauri::command]
async fn cancel_operation() -> Result<(), String> {
    install::cancel_operation_inner().await;
    Ok(())
}

#[tauri::command]
async fn get_battery() -> Result<system_ops::BatteryInfo, String> {
    let info = tokio::task::spawn_blocking(system_ops::get_battery_info)
        .await
        .map_err(|_| "Erro ao carregar informações da bateria".to_string())?;
    Ok(info)
}

#[tauri::command]
async fn get_package_info(tool_name: String) -> Result<package_info::PackageDetail, String> {
    package_info::get_package_info(&tool_name).await
}

#[tauri::command]
async fn get_connectivity() -> Result<network::ConnectivityInfo, String> {
    let info = tokio::task::spawn_blocking(network::get_connectivity)
        .await
        .map_err(|_| "Erro ao carregar informações de rede".to_string())?;
    Ok(info)
}

#[tauri::command]
async fn get_external_info() -> Result<network::ExternalNetworkInfo, String> {
    let info = tokio::task::spawn_blocking(network::get_external_info)
        .await
        .map_err(|_| "Erro ao obter informações externas".to_string())?;
    Ok(info)
}

#[tauri::command]
async fn test_speed() -> Result<network::SpeedTestResult, String> {
    let result = tokio::task::spawn_blocking(network::test_speed_inner)
        .await
        .map_err(|_| "Erro ao testar velocidade".to_string())?;
    Ok(result)
}

#[tauri::command]
async fn get_system_stats() -> Result<stats::SystemStats, String> {
    let stats = tokio::task::spawn_blocking(stats::get_system_stats)
        .await
        .map_err(|_| "Erro ao carregar estatísticas do sistema".to_string())?;
    Ok(stats)
}

#[derive(Debug, Serialize)]
pub struct ReportInfo {
    pub app_version: String,
    pub distro_name: String,
    pub distro_version: String,
    pub kernel: String,
    pub package_manager: String,
    pub cpu_percent: f64,
    pub memory_percent: f64,
    pub temperature: f64,
}

#[tauri::command]
async fn get_report_info() -> Result<ReportInfo, String> {
    let distro = distribution::detect_linux_distribution().await;
    let hardware = tokio::task::spawn_blocking(system_info::get_system_hardware)
        .await
        .map_err(|_| "Erro ao carregar hardware".to_string())?;
    let stats = tokio::task::spawn_blocking(stats::get_system_stats)
        .await
        .map_err(|_| "Erro ao carregar stats".to_string())?;

    Ok(ReportInfo {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        distro_name: distro.as_ref().map(|d| d.name.clone()).unwrap_or_default(),
        distro_version: distro.as_ref().map(|d| d.version.clone()).unwrap_or_default(),
        kernel: hardware.kernel,
        package_manager: distro.as_ref().map(|d| d.package_manager.clone()).unwrap_or_default(),
        cpu_percent: stats.cpu_percent,
        memory_percent: stats.memory_percent,
        temperature: stats.temperature,
    })
}

#[tauri::command]
async fn get_home_stats() -> Result<stats::HomeStats, String> {
    let h = tokio::task::spawn_blocking(stats::get_home_stats)
        .await
        .map_err(|_| "Erro ao carregar estatísticas".to_string())?;
    Ok(h)
}

#[tauri::command]
async fn inspect_local_package(path: String) -> Result<package_installer::LocalPackageInfo, String> {
    let info = tokio::task::spawn_blocking(move || {
        package_installer::inspect_package(&path)
    })
    .await
    .map_err(|_| "Erro ao inspecionar pacote".to_string())??;
    Ok(info)
}

#[tauri::command]
async fn inspect_package_data(data: String, file_name: String) -> Result<package_installer::LocalPackageInfo, String> {
    let info = tokio::task::spawn_blocking(move || {
        package_installer::inspect_package_data(&data, &file_name)
    })
    .await
    .map_err(|_| "Erro ao inspecionar pacote".to_string())??;
    Ok(info)
}

#[tauri::command]
async fn install_local_package(path: String, password: String) -> Result<install::InstallResult, String> {
    let result = package_installer::install_local_package(&path, &password).await?;
    Ok(result)
}

#[tauri::command]
async fn install_package_data(data: String, file_name: String, password: String) -> Result<install::InstallResult, String> {
    let result = package_installer::install_package_data(&data, &file_name, &password).await?;
    Ok(result)
}

#[tauri::command]
async fn open_file_manager(path: String) -> Result<(), String> {
    let dir = if path.is_empty() { "/".to_string() } else { path };
    tokio::process::Command::new("xdg-open")
        .arg(&dir)
        .output()
        .await
        .map_err(|e| format!("Erro ao abrir gerenciador de arquivos: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn analyze_disk_usage(mount_point: String) -> Result<Vec<DiskUsageItem>, String> {
    let path = mount_point.trim_end_matches('/');
    let output = tokio::process::Command::new("sh")
        .arg("-c")
        .arg(format!(
            "du -sh \"{}/\"* 2>/dev/null | sort -rh | head -15",
            path
        ))
        .output()
        .await
        .map_err(|e| format!("Erro ao analisar disco: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let items: Vec<DiskUsageItem> = stdout
        .lines()
        .filter_map(|line| {
            let line = line.trim();
            if line.is_empty() {
                return None;
            }
            let parts: Vec<&str> = line.splitn(2, '\t').collect();
            if parts.len() < 2 {
                return None;
            }
            Some(DiskUsageItem {
                size: parts[0].to_string(),
                path: parts[1].to_string(),
            })
        })
        .collect();

    Ok(items)
}

#[tauri::command]
async fn get_partition_table(device: String) -> Result<String, String> {
    // Pega o device base removendo números + sufixo 'p' (ex: /dev/sda1 → /dev/sda, /dev/nvme0n1p2 → /dev/nvme0n1)
    let base = device
        .trim_end_matches(|c: char| c.is_ascii_digit())
        .trim_end_matches('p');
    let output = tokio::process::Command::new("lsblk")
        .args(["-o", "NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT", base])
        .output()
        .await
        .map_err(|e| format!("Erro ao obter tabela de partições: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    if stdout.trim().is_empty() {
        return Err("Nenhuma informação de partição encontrada.".to_string());
    }
    Ok(stdout.trim().to_string())
}

#[tauri::command]
async fn run_simple_command(command: String) -> Result<String, String> {
    let output = tokio::process::Command::new("sh")
        .arg("-c")
        .arg(&command)
        .output()
        .await
        .map_err(|e| format!("Falha ao executar comando: {}", e))?;
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
async fn get_app_version() -> Result<String, String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}

fn parse_semver(version: &str) -> Vec<u32> {
    version
        .trim_start_matches('v')
        .split('.')
        .filter_map(|s| s.parse::<u32>().ok())
        .collect()
}

fn is_newer_version(latest: &str, current: &str) -> bool {
    let latest_parts = parse_semver(latest);
    let current_parts = parse_semver(current);
    for (l, c) in latest_parts.iter().zip(current_parts.iter()) {
        if l > c {
            return true;
        } else if l < c {
            return false;
        }
    }
    latest_parts.len() > current_parts.len()
}

#[tauri::command]
async fn check_app_update() -> Result<AppUpdateInfo, String> {
    let current = env!("CARGO_PKG_VERSION").to_string();
    let repo = "Rafa-MKR2/solix";

    let output = tokio::process::Command::new("sh")
        .arg("-c")
        .arg(format!(
            "curl -sL --max-time 8 -H 'User-Agent: Solix/{}' https://api.github.com/repos/{}/releases/latest 2>/dev/null || echo '{{}}'",
            current, repo
        ))
        .output()
        .await
        .map_err(|e| format!("Erro ao verificar atualizações: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);

    let tag_name;
    let body;
    let html_url;

    match serde_json::from_str::<serde_json::Value>(&stdout) {
        Ok(json) => {
            tag_name = json.get("tag_name").and_then(|v| v.as_str()).unwrap_or("").trim_start_matches('v').to_string();
            body = json.get("body").and_then(|v| v.as_str()).unwrap_or("").to_string();
            html_url = json.get("html_url").and_then(|v| v.as_str()).unwrap_or("").to_string();
        }
        Err(_) => {
            tag_name = String::new();
            body = String::new();
            html_url = String::new();
        }
    }

    let latest = tag_name;
    let update_available = !latest.is_empty() && is_newer_version(&latest, &current);

    Ok(AppUpdateInfo {
        current_version: current.clone(),
        latest_version: if latest.is_empty() { current } else { latest },
        update_available,
        release_url: if html_url.is_empty() {
            format!("https://github.com/{}/releases/latest", repo)
        } else {
            html_url
        },
        release_notes: if body.len() > 200 { body[..200].to_string() + "..." } else { body },
    })
}

#[tauri::command]
async fn get_processes() -> Result<Vec<stats::ProcessInfo>, String> {
    let list = tokio::task::spawn_blocking(stats::get_processes)
        .await
        .map_err(|_| "Erro ao carregar lista de processos".to_string())?;
    Ok(list)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_semver_empty() {
        assert_eq!(parse_semver(""), [] as [u32; 0]);
    }

    #[test]
    fn test_parse_semver_v_prefix() {
        assert_eq!(parse_semver("v2.0.1"), vec![2, 0, 1]);
    }

    #[test]
    fn test_parse_semver_no_prefix() {
        assert_eq!(parse_semver("1.2.3"), vec![1, 2, 3]);
    }

    #[test]
    fn test_parse_semver_major_only() {
        assert_eq!(parse_semver("5"), vec![5]);
    }

    #[test]
    fn test_parse_semver_non_numeric() {
        assert_eq!(parse_semver("1.0.0-beta"), vec![1, 0]);
    }

    #[test]
    fn test_parse_semver_all_non_numeric() {
        assert_eq!(parse_semver("abc"), [] as [u32; 0]);
    }

    #[test]
    fn test_parse_semver_leading_v_with_parts() {
        assert_eq!(parse_semver("v1.2"), vec![1, 2]);
    }

    #[test]
    fn test_is_newer_version_major() {
        assert!(is_newer_version("3.0.0", "2.0.0"));
    }

    #[test]
    fn test_is_newer_version_minor() {
        assert!(is_newer_version("2.1.0", "2.0.0"));
    }

    #[test]
    fn test_is_newer_version_patch() {
        assert!(is_newer_version("2.0.1", "2.0.0"));
    }

    #[test]
    fn test_is_newer_version_equal() {
        assert!(!is_newer_version("2.0.1", "2.0.1"));
    }

    #[test]
    fn test_is_newer_version_older() {
        assert!(!is_newer_version("1.9.9", "2.0.0"));
    }

    #[test]
    fn test_is_newer_version_with_v_prefix() {
        assert!(is_newer_version("v2.0.0", "v1.0.0"));
    }

    #[test]
    fn test_is_newer_version_different_lengths() {
        assert!(is_newer_version("2.0.0.1", "2.0.0"));
    }

    #[test]
    fn test_is_newer_version_shorter_latest() {
        assert!(!is_newer_version("2.0", "2.0.1"));
    }

    #[test]
    fn test_is_newer_version_both_empty() {
        assert!(!is_newer_version("", ""));
    }

    #[test]
    fn test_is_newer_version_one_empty() {
        assert!(is_newer_version("1.0.0", ""));
        assert!(!is_newer_version("", "1.0.0"));
    }

    #[test]
    fn test_is_newer_version_non_numeric_skipped() {
        assert!(is_newer_version("1.0.1", "1.0"));
    }

    #[test]
    fn test_app_update_info_struct() {
        let info = AppUpdateInfo {
            current_version: "1.0.0".into(),
            latest_version: "2.0.0".into(),
            update_available: true,
            release_url: "https://example.com".into(),
            release_notes: "Bug fixes".into(),
        };
        assert_eq!(info.current_version, "1.0.0");
        assert_eq!(info.latest_version, "2.0.0");
        assert!(info.update_available);
        assert_eq!(info.release_url, "https://example.com");
        assert_eq!(info.release_notes, "Bug fixes");
    }

    #[test]
    fn test_app_update_info_no_update() {
        let info = AppUpdateInfo {
            current_version: "1.0.0".into(),
            latest_version: "1.0.0".into(),
            update_available: false,
            release_url: String::new(),
            release_notes: String::new(),
        };
        assert!(!info.update_available);
        assert!(info.release_url.is_empty());
        assert!(info.release_notes.is_empty());
    }

    #[test]
    fn test_report_info_struct() {
        let info = ReportInfo {
            app_version: "1.0".into(),
            distro_name: "Arch Linux".into(),
            distro_version: "rolling".into(),
            kernel: "6.8.0".into(),
            package_manager: "pacman".into(),
            cpu_percent: 45.5,
            memory_percent: 62.0,
            temperature: 68.0,
        };
        assert_eq!(info.app_version, "1.0");
        assert_eq!(info.distro_name, "Arch Linux");
        assert_eq!(info.kernel, "6.8.0");
        assert_eq!(info.cpu_percent, 45.5);
        assert_eq!(info.memory_percent, 62.0);
        assert_eq!(info.temperature, 68.0);
    }

    #[test]
    fn test_report_info_empty_fields() {
        let info = ReportInfo {
            app_version: String::new(),
            distro_name: String::new(),
            distro_version: String::new(),
            kernel: String::new(),
            package_manager: String::new(),
            cpu_percent: 0.0,
            memory_percent: 0.0,
            temperature: 0.0,
        };
        assert!(info.app_version.is_empty());
        assert_eq!(info.cpu_percent, 0.0);
        assert_eq!(info.temperature, 0.0);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            get_install_command,
            install_tools,
            remove_tools,
            update_system,
            get_system_stats,
            cancel_operation,
            get_connectivity,
            get_battery,
            enable_zram,
    cleanup_system,
    get_package_info,
    test_speed,
    get_external_info,
    get_processes,
    get_report_info,
    get_home_stats,
    get_app_version,
    check_app_update,
    check_pm_lock,
    open_file_manager,
    analyze_disk_usage,
    get_partition_table,
    inspect_local_package,
    install_local_package,
    inspect_package_data,
    install_package_data,
    run_simple_command,
])
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| eprintln!("Erro ao iniciar o aplicativo: {}", e));
}
