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

pub fn get_battery_info() -> BatteryInfo {
    let bat = "/sys/class/power_supply/BAT0";
    if !std::path::Path::new(bat).exists() {
        return BatteryInfo { present: false, percentage: 0, status: String::new(), time_remaining: String::new() };
    }
    let capacity = std::fs::read_to_string(format!("{bat}/capacity")).unwrap_or_default();
    let status = std::fs::read_to_string(format!("{bat}/status")).unwrap_or_default();
    let pct = capacity.trim().parse::<u8>().unwrap_or(0);
    let st = status.trim().to_string();
    let time = Command::new("acpi")
        .output().ok()
        .and_then(|o| {
            let t = String::from_utf8_lossy(&o.stdout).to_string();
            t.split(',').last().map(|s| s.trim().to_string())
        })
        .unwrap_or_default();
    BatteryInfo { present: true, percentage: pct, status: st, time_remaining: time }
}

pub async fn enable_zram(password: &str) -> Result<install::InstallResult, String> {
    install::verify_password(password).await?;

    let already = Command::new("sh")
        .arg("-c")
        .arg("grep -q zram /proc/swaps && echo yes || echo no")
        .output().ok()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim() == "yes")
        .unwrap_or(false);

    if already {
        return Ok(install::InstallResult {
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
}

pub async fn cleanup_system(password: &str) -> Result<install::InstallResult, String> {
    install::verify_password(password).await?;

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

    Ok(install::InstallResult {
        tool_name: "cleanup".into(),
        command: String::new(),
        success,
        cancelled: false,
        output: Some(output),
        error: if success { None } else { pm_result.error },
    })
}
