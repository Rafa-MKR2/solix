// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2
// GitHub: https://github.com/Rafa-MKR2


use serde::Serialize;
use std::process::Command;

#[derive(Debug, Serialize)]
pub struct ConnectivityInfo {
    pub internet: bool,
    pub bluetooth: bool,
    pub wifi_ssid: String,
    pub wifi_signal: i32,
}

pub fn get_connectivity() -> ConnectivityInfo {
    let internet = check_internet();
    let bluetooth = check_bluetooth();
    let (wifi_ssid, wifi_signal) = check_wifi();

    ConnectivityInfo {
        internet,
        bluetooth,
        wifi_ssid,
        wifi_signal,
    }
}

fn check_internet() -> bool {
    Command::new("ping")
        .arg("-c")
        .arg("1")
        .arg("-W")
        .arg("2")
        .arg("1.1.1.1")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

fn check_bluetooth() -> bool {
    let output = Command::new("rfkill")
        .arg("list")
        .arg("bluetooth")
        .output()
        .ok();
    if let Some(out) = output {
        let text = String::from_utf8_lossy(&out.stdout);
        text.contains("bluetooth") && !text.contains("Soft blocked: yes")
    } else {
        false
    }
}

fn check_wifi() -> (String, i32) {
    let output = Command::new("nmcli")
        .arg("-t")
        .arg("-f")
        .arg("ACTIVE,SIGNAL,SSID")
        .arg("device")
        .arg("wifi")
        .arg("list")
        .output()
        .ok();
    if let Some(out) = output {
        let text = String::from_utf8_lossy(&out.stdout);
        for line in text.lines() {
            let parts: Vec<&str> = line.split(':').collect();
            if parts.len() >= 3 && parts[0] == "yes" {
                let ssid = parts[2..].join(":").to_string();
                let signal = parts[1].parse::<i32>().unwrap_or(0);
                return (ssid, signal);
            }
        }
    }
    (String::new(), 0)
}
