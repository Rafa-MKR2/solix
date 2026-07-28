// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2
// GitHub: https://github.com/Rafa-MKR2


mod distribution;
mod executable;
mod install;
mod network;
mod package_info;
mod stats;
mod system_info;
mod system_ops;
mod tool;
mod user;

use serde::Serialize;

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
    let hardware = tokio::task::spawn_blocking(|| system_info::get_system_hardware())
        .await
        .map_err(|e| e.to_string())?;
    let user = tokio::task::spawn_blocking(|| user::get_user_info())
        .await
        .map_err(|e| e.to_string())?;

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
async fn install_tools(tool_names: Vec<String>, password: String) -> Result<Vec<install::InstallResult>, String> {
    install::install_tools(&tool_names, &password).await
}

#[tauri::command]
async fn remove_tools(tool_names: Vec<String>, password: String) -> Result<Vec<install::InstallResult>, String> {
    install::remove_tools(&tool_names, &password).await
}

#[tauri::command]
async fn update_system(password: String) -> Result<install::InstallResult, String> {
    install::update_system(&password).await
}

#[tauri::command]
async fn cancel_operation() -> Result<(), String> {
    install::cancel_operation_inner().await;
    Ok(())
}

#[tauri::command]
async fn get_battery() -> Result<system_ops::BatteryInfo, String> {
    let info = tokio::task::spawn_blocking(|| system_ops::get_battery_info())
        .await
        .map_err(|e| e.to_string())?;
    Ok(info)
}

#[tauri::command]
async fn enable_zram(password: String) -> Result<install::InstallResult, String> {
    system_ops::enable_zram(&password).await
}

#[tauri::command]
async fn cleanup_system(password: String) -> Result<install::InstallResult, String> {
    system_ops::cleanup_system(&password).await
}

#[tauri::command]
async fn get_package_info(tool_name: String) -> Result<package_info::PackageDetail, String> {
    package_info::get_package_info(&tool_name).await
}

#[tauri::command]
async fn get_connectivity() -> Result<network::ConnectivityInfo, String> {
    let info = tokio::task::spawn_blocking(|| network::get_connectivity())
        .await
        .map_err(|e| e.to_string())?;
    Ok(info)
}

#[tauri::command]
async fn get_system_stats() -> Result<stats::SystemStats, String> {
    let stats = tokio::task::spawn_blocking(|| stats::get_system_stats())
        .await
        .map_err(|e| e.to_string())?;
    Ok(stats)
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
