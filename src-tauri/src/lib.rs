// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2
// GitHub: https://github.com/Rafa-MKR2

mod backup;
mod commands;
mod distribution;
mod executable;
mod install;
mod network;
mod package_info;
mod package_installer;
mod package_manager;
mod password;
mod script_analyzer;
mod stats;
mod system_info;
mod system_ops;
mod tool;
mod updater;
mod user;
mod util;

use std::sync::Mutex;

static PASSWORD_CACHE: Mutex<Option<String>> = Mutex::new(None);

pub(crate) fn get_cached_password() -> Option<String> {
    PASSWORD_CACHE.lock().ok().and_then(|c| c.clone())
}

pub(crate) fn set_cached_password(password: String) {
    if let Ok(mut cache) = PASSWORD_CACHE.lock() {
        *cache = Some(password);
    }
}

pub(crate) fn clear_cached_password() {
    if let Ok(mut cache) = PASSWORD_CACHE.lock() {
        *cache = None;
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::info::get_system_info,
            commands::install::get_install_command,
            commands::install::set_password,
            commands::install::clear_password,
            commands::install::install_tools,
            commands::install::remove_tools,
            commands::install::update_system,
            commands::info::get_system_stats,
            commands::install::cancel_operation,
            commands::network::get_connectivity,
            commands::system_ops::get_battery,
            commands::system_ops::enable_zram,
            commands::system_ops::cleanup_system,
            commands::package::get_package_info,
            commands::network::test_speed,
            commands::network::get_external_info,
            commands::process::get_processes,
            commands::info::get_report_info,
            commands::info::get_home_stats,
            commands::info::get_app_version,
            commands::misc::open_url,
            commands::updater::check_app_update,
            commands::updater::install_update,
            commands::install::check_pm_lock,
            commands::disk::open_file_manager,
            commands::disk::analyze_disk_usage,
            commands::disk::get_partition_table,
            commands::local_pkg::inspect_local_package,
            commands::local_pkg::install_local_package,
            commands::local_pkg::inspect_package_data,
            commands::local_pkg::install_package_data,
            commands::process::run_simple_command,
            commands::process::kill_process,
            commands::process::remove_lock_files,
            commands::pm::list_installed_packages,
            commands::pm::search_repo_packages,
            commands::pm::get_package_history,
            commands::pm::remove_system_packages,
            commands::pm::install_repo_packages,
            commands::backup::create_backup,
            commands::script::analyze_script,
            commands::misc::save_report_to_desktop,
            commands::misc::create_desktop_shortcut,
            commands::disk::get_disk_smart_info,
        ])
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| eprintln!("Erro ao iniciar o aplicativo: {}", e));
}

#[cfg(test)]
mod tests {
    use super::*;

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
    fn test_system_info_debug_serialize() {
        let info = commands::info::SystemInfo {
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
