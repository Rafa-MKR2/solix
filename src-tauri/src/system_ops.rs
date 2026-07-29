// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2
// GitHub: https://github.com/Rafa-MKR2


use serde::Serialize;
use std::process::Command;

use crate::install;

#[derive(Debug, Serialize)]
pub struct BatteryInfo {
    pub present: bool,
    pub percentage: u8,
    pub status: String,
    pub time_remaining: String,
}

fn find_battery_path() -> Option<std::path::PathBuf> {
    let dir = std::path::Path::new("/sys/class/power_supply/");
    let entries = std::fs::read_dir(dir).ok()?;
    for entry in entries.flatten() {
        let type_path = entry.path().join("type");
        if let Ok(type_str) = std::fs::read_to_string(&type_path) {
            if type_str.trim() == "Battery" {
                return Some(entry.path());
            }
        }
    }
    None
}

fn get_battery_time_remaining() -> String {
    // Try acpi first
    if let Ok(out) = Command::new("acpi").arg("-b").output() {
        let text = String::from_utf8_lossy(&out.stdout);
        if let Some(last) = text.split(',').next_back() {
            let t = last.trim();
            if t != "until charged" && !t.starts_with("rate information") && !t.is_empty() {
                return t.to_string();
            }
        }
    }
    // Fallback: upower
    if let Ok(out) = Command::new("upower").args(["-e"]).output() {
        let devices = String::from_utf8_lossy(&out.stdout);
        for line in devices.lines() {
            if line.contains("battery") || line.contains("BAT") {
                if let Ok(info) = Command::new("upower").args(["-i", line.trim()]).output() {
                    let info_text = String::from_utf8_lossy(&info.stdout);
                    for line in info_text.lines() {
                        if line.trim().starts_with("time to empty") || line.trim().starts_with("time to full") {
                            let t = line.split(':').nth(1).unwrap_or("").trim();
                            if !t.is_empty() {
                                return t.to_string();
                            }
                        }
                    }
                }
            }
        }
    }
    String::new()
}

pub fn get_battery_info() -> BatteryInfo {
    let bat_path = match find_battery_path() {
        Some(p) => p,
        None => return BatteryInfo { present: false, percentage: 0, status: String::new(), time_remaining: String::new() },
    };
    let capacity = std::fs::read_to_string(bat_path.join("capacity")).unwrap_or_default();
    let status = std::fs::read_to_string(bat_path.join("status")).unwrap_or_default();
    let pct = capacity.trim().parse::<u8>().unwrap_or(0);
    BatteryInfo {
        present: true,
        percentage: pct,
        status: status.trim().to_string(),
        time_remaining: get_battery_time_remaining(),
    }
}

pub async fn enable_zram(password: &str) -> Result<install::InstallResult, String> {
    crate::stats::set_operation_in_progress(true);
    crate::install::kill_readonly_pacman_queries();
    let result = async {
        crate::password::verify_password(password).await?;

        let already = Command::new("sh")
            .arg("-c")
            .arg("grep -q zram /proc/swaps && echo yes || echo no")
            .output().ok()
            .map(|o| String::from_utf8_lossy(&o.stdout).trim() == "yes")
            .unwrap_or(false);

        if already {
            return Ok::<install::InstallResult, String>(install::InstallResult {
                tool_name: "zram".into(),
                command: String::new(),
                success: true,
                cancelled: false,
                output: Some("ZRAM já está ativo".into()),
                error: None,
            });
        }

        let distro = crate::distribution::detect_linux_distribution().await;
        let pm = distro.as_ref().map(|d| d.package_manager.as_str()).unwrap_or("pacman");

        let install_cmd = match pm {
            "pacman" => "sudo -S pacman -S --noconfirm zram-generator 2>/dev/null || sudo -S pacman -S --noconfirm systemd/zram",
            "apt" => "sudo -S apt install -y zram-config",
            "dnf" => "sudo -S dnf install -y zram-generator",
            _ => "sudo -S zypper install -y zram-generator",
        };

        let result = install::run_command(password, "zram", install_cmd).await;
        if !result.success {
            return Ok(result);
        }

        let enable = match pm {
            "pacman" => "sudo -S systemctl enable --now systemd-zram-setup@zram0.service 2>/dev/null || sudo -S modprobe zram && sudo -S zramctl /dev/zram0 --algorithm zstd --size $(awk '/MemTotal/{print int($2/1024*1.5)}' /proc/meminfo)M && sudo -S mkswap /dev/zram0 && sudo -S swapon /dev/zram0",
            "apt" => "sudo -S systemctl enable --now zram-config.service || (sudo -S modprobe zram && sudo -S zramctl /dev/zram0 --algorithm lz4 --size $(awk '/MemTotal/{print int($2/1024*1.5)}' /proc/meminfo)M && sudo -S mkswap /dev/zram0 && sudo -S swapon /dev/zram0)",
            "dnf" => "sudo -S systemctl enable --now systemd-zram-setup@zram0.service",
            _ => "sudo -S systemctl enable --now systemd-zram-setup@zram0.service",
        };

        Ok(install::run_command(password, "zram-enable", enable).await)
    }.await;
    crate::stats::set_operation_in_progress(false);
    result
}

pub async fn cleanup_system(password: &str) -> Result<install::InstallResult, String> {
    crate::stats::set_operation_in_progress(true);
    crate::install::kill_readonly_pacman_queries();
    let result = async {
        crate::password::verify_password(password).await?;

        let distro = crate::distribution::detect_linux_distribution().await;
        let pm = distro.as_ref().map(|d| d.package_manager.as_str()).unwrap_or("pacman");

        let pm_cmd = match pm {
            "pacman" => "sudo -S pacman -Sc --noconfirm",
            "apt" => "sudo -S apt autoremove --purge -y && sudo -S apt autoclean -y",
            "dnf" => "sudo -S dnf clean all",
            _ => "sudo -S zypper clean",
        };

        let pm_result = install::run_command(password, "cleanup-pm", pm_cmd).await;

        let flatpak_cmd = "flatpak uninstall --unused -y 2>/dev/null; echo done";
        let fp_result = install::run_command(password, "cleanup-flatpak", flatpak_cmd).await;

        let output = format!(
            "PM: {}\nFlatpak: {}",
            pm_result.output.as_deref().unwrap_or(""),
            fp_result.output.as_deref().unwrap_or("")
        );

        let success = pm_result.success;

        Ok::<install::InstallResult, String>(install::InstallResult {
            tool_name: "cleanup".into(),
            command: String::new(),
            success,
            cancelled: false,
            output: Some(output),
            error: if success { None } else { pm_result.error },
        })
    }.await;
    crate::stats::set_operation_in_progress(false);
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_battery_info_present() {
        let b = BatteryInfo {
            present: true,
            percentage: 75,
            status: "Charging".into(),
            time_remaining: "1:30".into(),
        };
        assert!(b.present);
        assert_eq!(b.percentage, 75);
        assert_eq!(b.status, "Charging");
    }

    #[test]
    fn test_battery_info_not_present() {
        let b = BatteryInfo {
            present: false,
            percentage: 0,
            status: String::new(),
            time_remaining: String::new(),
        };
        assert!(!b.present);
        assert_eq!(b.percentage, 0);
    }

    #[test]
    fn test_battery_info_discharging() {
        let b = BatteryInfo {
            present: true,
            percentage: 50,
            status: "Discharging".into(),
            time_remaining: "2:00".into(),
        };
        assert_eq!(b.status, "Discharging");
        assert_eq!(b.time_remaining, "2:00");
    }

    #[test]
    fn test_battery_info_status_full() {
        let b = BatteryInfo {
            present: true,
            percentage: 100,
            status: "Full".into(),
            time_remaining: String::new(),
        };
        assert_eq!(b.status, "Full");
        assert_eq!(b.percentage, 100);
    }

    #[test]
    fn test_battery_info_status_unknown() {
        let b = BatteryInfo {
            present: true,
            percentage: 0,
            status: "Unknown".into(),
            time_remaining: String::new(),
        };
        assert_eq!(b.status, "Unknown");
    }

    #[test]
    fn test_battery_info_percentage_0() {
        let b = BatteryInfo {
            present: true,
            percentage: 0,
            status: "Unknown".into(),
            time_remaining: String::new(),
        };
        assert_eq!(b.percentage, 0);
    }

    #[test]
    fn test_battery_info_percentage_50() {
        let b = BatteryInfo {
            present: true,
            percentage: 50,
            status: "Discharging".into(),
            time_remaining: "1:00".into(),
        };
        assert_eq!(b.percentage, 50);
    }

    #[test]
    fn test_battery_info_percentage_100() {
        let b = BatteryInfo {
            present: true,
            percentage: 100,
            status: "Full".into(),
            time_remaining: String::new(),
        };
        assert_eq!(b.percentage, 100);
    }

    #[test]
    fn test_battery_info_present_false() {
        let b = BatteryInfo {
            present: false,
            percentage: 0,
            status: String::new(),
            time_remaining: String::new(),
        };
        assert!(!b.present);
        assert_eq!(b.percentage, 0);
        assert!(b.status.is_empty());
        assert!(b.time_remaining.is_empty());
    }

    #[test]
    fn test_battery_info_time_remaining_empty() {
        let b = BatteryInfo {
            present: true,
            percentage: 80,
            status: "Charging".into(),
            time_remaining: String::new(),
        };
        assert!(b.time_remaining.is_empty());
    }
}

