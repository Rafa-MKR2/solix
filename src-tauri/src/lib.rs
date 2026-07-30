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
use std::sync::Mutex;

static PASSWORD_CACHE: Mutex<Option<String>> = Mutex::new(None);

fn get_cached_password() -> Option<String> {
    PASSWORD_CACHE.lock().ok().and_then(|c| c.clone())
}

fn set_cached_password(password: String) {
    if let Ok(mut cache) = PASSWORD_CACHE.lock() {
        *cache = Some(password);
    }
}

fn clear_cached_password() {
    if let Ok(mut cache) = PASSWORD_CACHE.lock() {
        *cache = None;
    }
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
async fn set_password(password: String) -> Result<(), String> {
    let _ = password::verify_password(&password).await?;
    set_cached_password(password);
    Ok(())
}

#[tauri::command]
async fn clear_password() -> Result<(), String> {
    clear_cached_password();
    Ok(())
}

#[tauri::command]
async fn install_tools(app: tauri::AppHandle, tool_names: Vec<String>, password: Option<String>) -> Result<Vec<install::InstallResult>, String> {
    let pwd = password.or_else(get_cached_password).ok_or("Senha não fornecida. Use set_password primeiro.")?;
    install::install_tools(&tool_names, &pwd, Some(&app)).await
}

#[tauri::command]
async fn remove_tools(app: tauri::AppHandle, tool_names: Vec<String>, password: Option<String>) -> Result<Vec<install::InstallResult>, String> {
    let pwd = password.or_else(get_cached_password).ok_or("Senha não fornecida.")?;
    install::remove_tools(&tool_names, &pwd, Some(&app)).await
}

#[tauri::command]
async fn update_system(app: tauri::AppHandle, password: Option<String>) -> Result<install::InstallResult, String> {
    let pwd = password.or_else(get_cached_password).ok_or("Senha não fornecida.")?;
    install::update_system(&pwd, Some(&app)).await
}

#[tauri::command]
async fn enable_zram(app: tauri::AppHandle, password: Option<String>) -> Result<install::InstallResult, String> {
    let pwd = password.or_else(get_cached_password).ok_or("Senha não fornecida.")?;
    system_ops::enable_zram(&pwd, Some(&app)).await
}

#[tauri::command]
async fn cleanup_system(app: tauri::AppHandle, password: Option<String>) -> Result<install::InstallResult, String> {
    let pwd = password.or_else(get_cached_password).ok_or("Senha não fornecida.")?;
    system_ops::cleanup_system(&pwd, Some(&app)).await
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
async fn install_local_package(path: String, password: Option<String>) -> Result<install::InstallResult, String> {
    let pwd = password.or_else(get_cached_password).ok_or("Senha não fornecida.")?;
    let result = package_installer::install_local_package(&path, &pwd).await?;
    Ok(result)
}

#[tauri::command]
async fn install_package_data(data: String, file_name: String, password: Option<String>) -> Result<install::InstallResult, String> {
    let pwd = password.or_else(get_cached_password).ok_or("Senha não fornecida.")?;
    let result = package_installer::install_package_data(&data, &file_name, &pwd).await?;
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

fn sanitize_path(input: &str) -> String {
    input.chars().filter(|c| c.is_alphanumeric() || *c == '/' || *c == '-' || *c == '_' || *c == '.').collect()
}

#[tauri::command]
async fn analyze_disk_usage(mount_point: String) -> Result<Vec<DiskUsageItem>, String> {
    let path = sanitize_path(mount_point.trim_end_matches('/'));
    if !path.starts_with('/') {
        return Err("Caminho inválido.".to_string());
    }
    let output = tokio::process::Command::new("sh")
        .arg("-c")
        .arg(format!(
            "du -sh '{}'/* 2>/dev/null | sort -rh | head -15",
            path.replace('\'', "'\\''")
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

// ─── SMART Disk Health ───

#[derive(Debug, Serialize)]
pub struct SmartAttribute {
    pub id: u8,
    pub name: String,
    pub value: u8,
    pub worst: u8,
    pub threshold: u8,
    pub raw: String,
    pub status: String,
}

#[derive(Debug, Serialize)]
pub struct SmartCommandInfo {
    pub command: String,
    pub description: String,
}

#[derive(Debug, Serialize)]
pub struct SmartInfo {
    pub device: String,
    pub device_model: String,
    pub health: String,
    pub temperature: String,
    pub power_on_hours: String,
    pub attributes: Vec<SmartAttribute>,
    pub smart_available: bool,
    pub error_message: String,
    pub commands_used: Vec<SmartCommandInfo>,
}

#[tauri::command]
async fn get_disk_smart_info(device: String, password: Option<String>) -> Result<SmartInfo, String> {
    let pwd = password.or_else(get_cached_password);
    let device_path = format!("/dev/{}", device.trim());

    // Educational command info
    let commands_used = vec![
        SmartCommandInfo {
            command: format!("smartctl -H {}", device_path),
            description: "Verifica o status geral de saúde do disco usando S.M.A.R.T. (Self-Monitoring, Analysis and Reporting Technology). Retorna PASSED se o disco está saudável ou FAILED se detectou problemas críticos.".to_string(),
        },
        SmartCommandInfo {
            command: format!("smartctl -A {}", device_path),
            description: "Lista todos os atributos S.M.A.R.T. do disco. Cada atributo monitora um aspecto específico da saúde: setores realocados, temperatura, horas de uso, erros de leitura, etc.".to_string(),
        },
    ];

    // Check if smartctl is available
    let which = tokio::process::Command::new("sh")
        .arg("-c")
        .arg("which smartctl 2>/dev/null || echo ''")
        .output()
        .await
        .map_err(|e| format!("Erro ao verificar smartctl: {}", e))?;
    let smartctl_path = String::from_utf8_lossy(&which.stdout).trim().to_string();

    if smartctl_path.is_empty() {
        // No smartctl available, suggest installation
        return Ok(SmartInfo {
            device: device.clone(),
            device_model: String::new(),
            health: "NOT_AVAILABLE".into(),
            temperature: String::new(),
            power_on_hours: String::new(),
            attributes: vec![],
            smart_available: false,
            error_message: "smartctl não está instalado. Instale o pacote 'smartmontools' para habilitar o monitoramento S.M.A.R.T.".to_string(),
            commands_used,
        });
    }

    async fn run_sudo_smartctl(args: &[&str], device_path: &str, password: &Option<String>) -> Result<std::process::Output, String> {
        let full_cmd = format!("sudo -S smartctl {} {}", args.join(" "), device_path);
        if let Some(pwd) = password {
            let mut child = tokio::process::Command::new("sh")
                .arg("-c")
                .arg(&full_cmd)
                .stdin(std::process::Stdio::piped())
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped())
                .spawn()
                .map_err(|e| format!("Erro ao executar smartctl: {}", e))?;
            let _ = password::pipe_password(&mut child, pwd).await;
            let output = child.wait_with_output().await.map_err(|e| format!("Erro smartctl: {}", e))?;
            Ok(output)
        } else {
            tokio::process::Command::new("sudo")
                .args(["-n", "smartctl"])
                .args(args)
                .arg(device_path)
                .output()
                .await
                .map_err(|e| format!("Erro smartctl: {}", e))
        }
    }

    // Check if device supports SMART
    let info_output = run_sudo_smartctl(&["-i"], &device_path, &pwd).await?;
    let info_text = String::from_utf8_lossy(&info_output.stdout);
    let info_stderr = String::from_utf8_lossy(&info_output.stderr);

    if info_text.contains("Unknown USB bridge") || info_text.contains("device lacks SMART capability") {
        return Ok(SmartInfo {
            device: device.clone(),
            device_model: String::new(),
            health: "UNSUPPORTED".into(),
            temperature: String::new(),
            power_on_hours: String::new(),
            attributes: vec![],
            smart_available: false,
            error_message: "Este dispositivo não suporta S.M.A.R.T. ou é uma unidade USB externa não compatível.".to_string(),
            commands_used,
        });
    }

    // Get device model from info
    let device_model = info_text.lines()
        .find(|l| l.contains("Device Model") || l.contains("Product") || l.contains("Model Number") || l.contains("Model Family"))
        .and_then(|l| l.split(':').nth(1))
        .map(|s| s.trim().to_string())
        .unwrap_or_default();

    // Run smartctl -H (health)
    let health_output = run_sudo_smartctl(&["-H"], &device_path, &pwd).await?;
    let health_text = String::from_utf8_lossy(&health_output.stdout);

    let health = if health_text.contains("PASSED") {
        "PASSED".to_string()
    } else if health_text.contains("FAILED") || health_text.contains("FAILING") {
        "FAILED".to_string()
    } else {
        "UNKNOWN".to_string()
    };

    // Run smartctl -A (attributes)
    let attr_output = run_sudo_smartctl(&["-A"], &device_path, &pwd).await?;
    let attr_text = String::from_utf8_lossy(&attr_output.stdout);

    // Parse temperature
    let temperature = attr_text.lines()
        .find(|l| l.contains("Temperature_Celsius") || l.contains("Airflow_Temperature_Cel") || l.contains("Temp") || l.contains("Temperature"))
        .and_then(|l| {
            let parts: Vec<&str> = l.split_whitespace().collect();
            // smartctl format: ID ATTRIBUTE_NAME VALUE WORST THRESH RAW_VALUE
            parts.get(9).map(|v| format!("{}°C", v))
        })
        .unwrap_or_default();

    // Parse power-on hours
    let power_on_hours = attr_text.lines()
        .find(|l| l.contains("Power_On_Hours") || l.contains("Power_On_Minutes") || l.contains("Power_On"))
        .and_then(|l| {
            let parts: Vec<&str> = l.split_whitespace().collect();
            parts.get(9).map(|v| format!("{}h", v))
        })
        .unwrap_or_default();

    // Parse all attributes
    let attributes: Vec<SmartAttribute> = attr_text.lines()
        .filter(|l| {
            // Lines that start with a number (attribute ID)
            l.trim().starts_with(|c: char| c.is_ascii_digit())
            && l.split_whitespace().count() >= 10
        })
        .filter_map(|l| {
            let parts: Vec<&str> = l.split_whitespace().collect();
            if parts.len() < 10 { return None; }

            let id = parts[0].parse::<u8>().ok()?;
            let name = parts[1].to_string();
            let value = parts[2].parse::<u8>().ok()?;
            let worst = parts[3].parse::<u8>().ok()?;
            let threshold = parts[4].parse::<u8>().ok().unwrap_or(0);
            let raw = parts[9..].join(" ");

            let status = if value <= threshold && threshold > 0 {
                "bad"
            } else if value < 100 && value > threshold {
                "warn"
            } else {
                "good"
            };

            Some(SmartAttribute {
                id,
                name,
                value,
                worst,
                threshold,
                raw,
                status: status.to_string(),
            })
        })
        .collect();

    Ok(SmartInfo {
        device: device.clone(),
        device_model,
        health,
        temperature,
        power_on_hours,
        attributes,
        smart_available: true,
        error_message: String::new(),
        commands_used,
    })
}

#[tauri::command]
async fn get_partition_table(device: String) -> Result<String, String> {
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
async fn kill_process(name: String) -> Result<String, String> {
    let allowed = ["pamac", "pamac-manager", "discover", "kpackagekit"];
    if !allowed.contains(&name.as_str()) {
        return Err("Processo não permitido.".to_string());
    }
    let output = tokio::process::Command::new("sh")
        .arg("-c")
        .arg(format!("pkill -f '{}' 2>/dev/null; echo done", name.replace('\'', "'\\''")))
        .output()
        .await
        .map_err(|e| format!("Falha ao executar: {}", e))?;
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
async fn remove_lock_files() -> Result<String, String> {
    let output = tokio::process::Command::new("sh")
        .arg("-c")
        .arg("rm -f /var/lib/pacman/db.lck /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock 2>/dev/null; echo done")
        .output()
        .await
        .map_err(|e| format!("Falha ao remover lock: {}", e))?;
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
async fn run_simple_command(command: String) -> Result<String, String> {
    let allowed_commands = [
        "pkill -f pamac 2>/dev/null; pkill -f pamac-manager 2>/dev/null; echo done",
        "pkill -f discover 2>/dev/null; echo done",
        "pkill -f kpackagekit 2>/dev/null; echo done",
    ];
    if allowed_commands.contains(&command.as_str()) {
        let output = tokio::process::Command::new("sh")
            .arg("-c")
            .arg(&command)
            .output()
            .await
            .map_err(|e| format!("Falha ao executar comando: {}", e))?;
        return Ok(String::from_utf8_lossy(&output.stdout).to_string());
    }
    Err("Comando não permitido.".to_string())
}

#[tauri::command]
async fn open_url(url: String) -> Result<(), String> {
    tokio::process::Command::new("/usr/bin/xdg-open")
        .arg(&url)
        .spawn()
        .map_err(|e| format!("Erro ao abrir URL: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn save_report_to_desktop(content: String) -> Result<String, String> {
    let home = std::env::var("HOME").map_err(|_| "Variável HOME não encontrada".to_string())?;
    let candidates = vec![
        format!("{}/Área de Trabalho", home),
        format!("{}/Desktop", home),
        format!("{}/Escritorio", home),
        home.clone(),
    ];
    let dest = candidates.into_iter()
        .find(|p| std::path::Path::new(p).exists())
        .unwrap_or(home.clone());

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

    let safe_name: String = name.chars().filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_').collect();
    if safe_name.is_empty() {
        return Err("Invalid tool name.".to_string());
    }

    let which = tokio::process::Command::new("which")
        .arg(&safe_name)
        .output()
        .await
        .map_err(|e| format!("Error finding binary: {}", e))?;
    let exec_path = String::from_utf8_lossy(&which.stdout).trim().to_string();
    if exec_path.is_empty() {
        return Err(format!("Could not find binary for '{}'", safe_name));
    }

    let candidates = vec![
        format!("{}/Área de Trabalho", home),
        format!("{}/Desktop", home),
        format!("{}/Escritorio", home),
        home.clone(),
    ];
    let dest = candidates.into_iter()
        .find(|p| std::path::Path::new(p).exists())
        .unwrap_or(home);

    let desktop_path = format!("{}/{}.desktop", dest, safe_name);

    if std::path::Path::new(&desktop_path).exists() {
        return Ok(format!("Shortcut already exists: {}", desktop_path));
    }

    let icon = safe_name.clone();

    let content = format!(
        "[Desktop Entry]\nName={}\nExec={}\nIcon={}\nTerminal=false\nType=Application\nCategories=Utility;\n",
        safe_name, exec_path, icon
    );

    tokio::fs::write(&desktop_path, &content)
        .await
        .map_err(|e| format!("Error writing shortcut: {}", e))?;

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
async fn install_update(app: tauri::AppHandle, password: Option<String>) -> Result<(), String> {
    let password = password.or_else(get_cached_password).ok_or("Senha não fornecida.")?;
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
async fn remove_system_packages(package_names: Vec<String>, password: Option<String>) -> Result<Vec<String>, String> {
    let pwd = password.or_else(get_cached_password).ok_or("Senha não fornecida.")?;
    package_manager::remove_system_packages(&pwd, &package_names).await
}

#[tauri::command]
async fn install_repo_packages(package_names: Vec<String>, password: Option<String>) -> Result<Vec<String>, String> {
    let pwd = password.or_else(get_cached_password).ok_or("Senha não fornecida.")?;
    package_manager::install_repo_packages(&pwd, &package_names).await
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

    #[test]
    fn test_sanitize_path_allows_valid() {
        assert_eq!(sanitize_path("/usr/share/applications"), "/usr/share/applications");
        assert_eq!(sanitize_path("/home/user/my-app_1.0.deb"), "/home/user/my-app_1.0.deb");
    }

    #[test]
    fn test_sanitize_path_strips_special() {
        let result = sanitize_path("../../../etc/passwd; rm -rf /");
        assert!(!result.contains(';'));
        assert!(!result.contains(' '));
        assert!(!result.contains('$'));
        assert!(!result.contains('`'));
        assert_eq!(result, "../../../etc/passwdrm-rf/");
    }

    #[test]
    fn test_sanitize_path_empty() {
        assert_eq!(sanitize_path(""), "");
    }

    #[test]
    fn test_sanitize_path_only_special() {
        assert_eq!(sanitize_path("!@#$%^&*()"), "");
    }

    #[test]
    fn test_sanitize_path_keeps_slash() {
        assert_eq!(sanitize_path("/"), "/");
    }

    #[test]
    fn test_get_cached_password_none_initially() {
        clear_cached_password();
        assert_eq!(get_cached_password(), None);
    }

    #[test]
    fn test_set_and_get_cached_password() {
        clear_cached_password();
        set_cached_password("senha123".into());
        assert_eq!(get_cached_password(), Some("senha123".into()));
        clear_cached_password();
    }

    #[test]
    fn test_clear_cached_password() {
        clear_cached_password();
        set_cached_password("temp".into());
        clear_cached_password();
        assert_eq!(get_cached_password(), None);
    }

    #[test]
    fn test_disk_usage_item_struct() {
        let item = DiskUsageItem {
            path: "/home".into(),
            size: "10 GB".into(),
        };
        assert_eq!(item.path, "/home");
        assert_eq!(item.size, "10 GB");
    }

    #[test]
    fn test_smart_attribute_struct() {
        let attr = SmartAttribute {
            id: 5,
            name: "Reallocated_Sector_Ct".into(),
            value: 100,
            worst: 100,
            threshold: 10,
            raw: "0".into(),
            status: "ok".into(),
        };
        assert_eq!(attr.id, 5);
        assert_eq!(attr.name, "Reallocated_Sector_Ct");
        assert_eq!(attr.status, "ok");
    }

    #[test]
    fn test_smart_command_info_struct() {
        let cmd = SmartCommandInfo {
            command: "smartctl -a /dev/sda".into(),
            description: "Full info".into(),
        };
        assert_eq!(cmd.command, "smartctl -a /dev/sda");
    }

    #[test]
    fn test_smart_info_struct() {
        let info = SmartInfo {
            device: "/dev/sda".into(),
            device_model: "Samsung SSD 860".into(),
            health: "PASSED".into(),
            temperature: "30°C".into(),
            power_on_hours: "1000h".into(),
            attributes: vec![],
            smart_available: true,
            error_message: String::new(),
            commands_used: vec![],
        };
        assert_eq!(info.device, "/dev/sda");
        assert!(info.smart_available);
        assert!(info.error_message.is_empty());
    }

    #[test]
    fn test_system_info_debug_serialize() {
        let info = SystemInfo {
            distribution: None,
            package_managers: vec![],
            tools: vec![],
            hardware: system_info::SystemHardware {
                kernel: "6.8.0".into(),
                cpu: "Intel".into(),
                cores: "4".into(),
                memory_total: "8 GB".into(),
                memory_used: "4 GB".into(),
                disk_total: "256 GB".into(),
                disk_used: "128 GB".into(),
                disks: vec![],
                gpu: "NVIDIA".into(),
                uptime: "1h".into(),
            },
            user: user::UserInfo {
                username: "user".into(),
                full_name: "User".into(),
                is_admin: true,
                avatar_base64: None,
                shell: "/bin/bash".into(),
                home_dir: "/home/user".into(),
            },
        };
        assert_eq!(info.hardware.kernel, "6.8.0");
        assert_eq!(info.user.username, "user");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            get_install_command,
            set_password,
            clear_password,
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
            kill_process,
            remove_lock_files,
            list_installed_packages,
            search_repo_packages,
            get_package_history,
            remove_system_packages,
            install_repo_packages,
            create_backup,
            analyze_script,
            save_report_to_desktop,
            create_desktop_shortcut,
            get_disk_smart_info,
        ])
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| eprintln!("Erro ao iniciar o aplicativo: {}", e));
}
