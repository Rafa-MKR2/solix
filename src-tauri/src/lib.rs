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
mod backup;
mod package_manager;
mod script_analyzer;
mod updater;
mod user;
mod util;

use serde::Serialize;
use tauri::Emitter;

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
async fn open_url(url: String) -> Result<(), String> {
    // Usa xdg-open com caminho absoluto e spawn (fire-and-forget)
    // para abrir URLs no navegador padrão do sistema
    tokio::process::Command::new("/usr/bin/xdg-open")
        .arg(&url)
        .spawn()
        .map_err(|e| format!("Erro ao abrir URL: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn save_report_to_desktop(content: String) -> Result<String, String> {
    let home = std::env::var("HOME").map_err(|_| "Variável HOME não encontrada".to_string())?;
    // Procura a Área de Trabalho (português, inglês ou fallback pra home)
    let candidates = vec![
        format!("{}/Área de Trabalho", home),
        format!("{}/Desktop", home),
        format!("{}/Escritorio", home),
        home.clone(), // fallback: salva na home
    ];
    let dest = candidates.into_iter()
        .find(|p| std::path::Path::new(p).exists())
        .unwrap_or(home.clone());

    // Timestamp: segundos desde epoch (único e simples)
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| "Erro ao obter tempo".to_string())?
        .as_secs();
    let filename = format!("{}/solix-report-{}.txt", dest, secs);

    tokio::fs::write(&filename, &content)
        .await
        .map_err(|e| format!("Erro ao salvar arquivo: {}", e))?;

    Ok(filename)
}

#[tauri::command]
async fn create_desktop_shortcut(name: String) -> Result<String, String> {
    let home = std::env::var("HOME").map_err(|_| "HOME not found".to_string())?;

    // Find binary
    let which = tokio::process::Command::new("sh")
        .arg("-c")
        .arg(format!("which {} 2>/dev/null || echo ''", name))
        .output()
        .await
        .map_err(|e| format!("Error finding binary: {}", e))?;
    let exec_path = String::from_utf8_lossy(&which.stdout).trim().to_string();
    if exec_path.is_empty() {
        return Err(format!("Could not find binary for '{}'", name));
    }

    // Find desktop folder
    let candidates = vec![
        format!("{}/Área de Trabalho", home),
        format!("{}/Desktop", home),
        format!("{}/Escritorio", home),
        home.clone(),
    ];
    let dest = candidates.into_iter()
        .find(|p| std::path::Path::new(p).exists())
        .unwrap_or(home);

    let desktop_path = format!("{}/{}.desktop", dest, name);

    // Check if shortcut already exists
    if std::path::Path::new(&desktop_path).exists() {
        return Ok(format!("Shortcut already exists: {}", desktop_path));
    }

    // Find icon (try common locations)
    let icon = name.clone();

    let content = format!(
        "[Desktop Entry]\nName={}\nExec={}\nIcon={}\nTerminal=false\nType=Application\nCategories=Utility;\n",
        name, exec_path, icon
    );

    tokio::fs::write(&desktop_path, &content)
        .await
        .map_err(|e| format!("Error writing shortcut: {}", e))?;

    // Make executable
    tokio::process::Command::new("chmod")
        .args(["+x", &desktop_path])
        .output()
        .await
        .map_err(|e| format!("Error making shortcut executable: {}", e))?;

    Ok(desktop_path)
}

#[tauri::command]
async fn get_app_version() -> Result<String, String> {
    Ok(env!("CARGO_PKG_VERSION").to_string())
}

#[tauri::command]
async fn check_app_update() -> Result<updater::UpdateInfo, String> {
    updater::check_update().await
}

#[tauri::command]
async fn install_update(app: tauri::AppHandle, password: String) -> Result<(), String> {
    let info = updater::check_update().await?;

    if !info.update_available {
        return Err("Nenhuma atualização disponível.".to_string());
    }

    let binary_path = updater::download_release(&info.download_url, &app).await?;

    let _ = app.emit("update-progress", updater::UpdateProgress {
        stage: "verify".into(),
        percent: 0,
        message: "Verificando integridade...".into(),
    });

    if !info.checksum_url.is_empty() {
        let checksum_text = updater::download_checksum(&info.checksum_url).await?;
        let expected = updater::parse_checksum(
            &checksum_text,
            &std::path::Path::new(&info.download_url)
                .file_name()
                .map(|f| f.to_string_lossy().to_string())
                .unwrap_or_default(),
        ).map_err(|_| "Checksum não encontrado para validação.".to_string())?;
        updater::validate_checksum(&binary_path, &expected)?;
    }

    let _ = app.emit("update-progress", updater::UpdateProgress {
        stage: "install".into(),
        percent: 0,
        message: "Instalando atualização...".into(),
    });

    updater::install_update(&binary_path, &password, &app).await?;

    let _ = app.emit("update-progress", updater::UpdateProgress {
        stage: "restart".into(),
        percent: 100,
        message: "Reiniciando Solix...".into(),
    });

    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    updater::restart_application()
        .map_err(|e| format!("Erro ao reiniciar: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn list_installed_packages() -> Result<Vec<package_manager::InstalledPackage>, String> {
    let pkgs = tokio::task::spawn_blocking(package_manager::list_installed)
        .await
        .map_err(|_| "Erro ao listar pacotes".to_string())?;
    Ok(pkgs)
}

#[tauri::command]
async fn search_repo_packages(query: String) -> Result<Vec<package_manager::RepoPackage>, String> {
    let pkgs = tokio::task::spawn_blocking(move || package_manager::search_repos(&query))
        .await
        .map_err(|_| "Erro ao buscar pacotes".to_string())?;
    Ok(pkgs)
}

#[tauri::command]
async fn get_package_history() -> Result<Vec<package_manager::PackageHistoryEntry>, String> {
    let entries = tokio::task::spawn_blocking(package_manager::get_history)
        .await
        .map_err(|_| "Erro ao carregar histórico".to_string())?;
    Ok(entries)
}

#[tauri::command]
async fn remove_system_packages(password: String, package_names: Vec<String>) -> Result<Vec<String>, String> {
    package_manager::remove_system_packages(&password, &package_names).await
}

#[tauri::command]
async fn install_repo_packages(password: String, package_names: Vec<String>) -> Result<Vec<String>, String> {
    package_manager::install_repo_packages(&password, &package_names).await
}

#[tauri::command]
async fn get_processes() -> Result<Vec<stats::ProcessInfo>, String> {
    let list = tokio::task::spawn_blocking(stats::get_processes)
        .await
        .map_err(|_| "Erro ao carregar lista de processos".to_string())?;
    Ok(list)
}

#[tauri::command]
async fn create_backup(source: String, destination: String, mount_point: String) -> Result<backup::BackupResult, String> {
    backup::create_backup(&source, &destination, &mount_point).await
}

#[tauri::command]
async fn analyze_script(content: String) -> Result<script_analyzer::ScriptAnalysis, String> {
    let analysis = tokio::task::spawn_blocking(move || {
        script_analyzer::analyze_script(&content)
    })
    .await
    .map_err(|_| "Erro ao analisar script".to_string())?;
    Ok(analysis)
}

#[cfg(test)]
mod tests {
    use super::*;

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
    open_url,
    check_app_update,
    install_update,
    check_pm_lock,
    open_file_manager,
    analyze_disk_usage,
    get_partition_table,
    inspect_local_package,
    install_local_package,
    inspect_package_data,
    install_package_data,
    run_simple_command,
    list_installed_packages,
    search_repo_packages,
    get_package_history,
    remove_system_packages,
    install_repo_packages,
    create_backup,
    analyze_script,
    save_report_to_desktop,
    create_desktop_shortcut,
])
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| eprintln!("Erro ao iniciar o aplicativo: {}", e));
}
