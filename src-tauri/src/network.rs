// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2
// GitHub: https://github.com/Rafa-MKR2

use serde::Serialize;
use std::process::Command;

#[derive(Debug, Serialize)]
pub struct ConnectivityInfo {
    pub internet: bool,
    pub ping_latency_ms: f64,
    pub ethernet: bool,
    pub ip_address: String,
    pub bluetooth: bool,
    pub wifi_present: bool,
    pub wifi_ssid: String,
    pub wifi_signal: i32,
}

pub fn get_connectivity() -> ConnectivityInfo {
    let internet = check_internet();
    let ping_latency_ms = get_ping_latency();
    let (ethernet, ip) = check_ethernet();
    let bluetooth = check_bluetooth();
    let wifi_present = check_wifi_present();
    let (wifi_ssid, wifi_signal) = check_wifi();

    ConnectivityInfo {
        internet,
        ping_latency_ms,
        ethernet,
        ip_address: ip,
        bluetooth,
        wifi_present,
        wifi_ssid,
        wifi_signal,
    }
}

fn check_internet() -> bool {
    Command::new("ping")
        .args(["-c", "1", "-W", "2", "1.1.1.1"])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

fn get_ping_latency() -> f64 {
    let output = Command::new("sh")
        .args(["-c", "LANG=C ping -c 1 -W 3 1.1.1.1"])
        .output()
        .ok();
    let text = match output {
        Some(out) => String::from_utf8_lossy(&out.stdout).to_string(),
        None => return 0.0,
    };
    for line in text.lines() {
        if let Some(pos) = line.find("time=") {
            let rest = &line[pos + 5..];
            let num: String = rest.chars().take_while(|c| c.is_ascii_digit() || *c == '.').collect();
            if let Ok(ms) = num.parse::<f64>() {
                return ms;
            }
        }
    }
    0.0
}

fn check_ethernet() -> (bool, String) {
    let dir = std::fs::read_dir("/sys/class/net/").ok();
    if let Some(entries) = dir {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name == "lo" || name.starts_with("wl") || name.starts_with("wlan") { continue; }
            let carrier = entry.path().join("carrier");
            if let Ok(c) = std::fs::read_to_string(&carrier) {
                if c.trim() == "1" {
                    if let Ok(out) = Command::new("ip").args(["-4", "addr", "show", &name]).output() {
                        let text = String::from_utf8_lossy(&out.stdout);
                        for line in text.lines() {
                            if let Some(pos) = line.find("inet ") {
                                let ip = line[pos + 5..].split('/').next().unwrap_or("").to_string();
                                return (true, ip);
                            }
                        }
                    }
                    return (true, "\u{2014}".to_string());
                }
            }
        }
    }
    (false, String::new())
}

fn check_wifi_present() -> bool {
    if let Ok(dir) = std::fs::read_dir("/sys/class/net/") {
        for entry in dir.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with("wl") || name.starts_with("wlan") {
                return true;
            }
        }
    }
    // Fallback: iwconfig lists wireless interfaces
    if let Ok(out) = Command::new("iwconfig").output() {
        let text = String::from_utf8_lossy(&out.stdout);
        text.lines().any(|l| l.contains("IEEE 802.11"))
    } else {
        false
    }
}

fn check_bluetooth() -> bool {
    let sys_present = std::fs::read_dir("/sys/class/bluetooth/").ok()
        .map(|d| d.filter_map(|e| e.ok()).any(|e| e.file_name().to_string_lossy().starts_with("hci")))
        .unwrap_or(false);

    let (rfkill_present, rfkill_blocked) = match Command::new("rfkill").args(["list", "bluetooth"]).output() {
        Ok(out) => {
            let text = String::from_utf8_lossy(&out.stdout);
            (text.to_lowercase().contains("bluetooth"), text.contains("Soft blocked: yes") || text.contains("Hard blocked: yes"))
        }
        Err(_) => (false, false),
    };

    match (sys_present, rfkill_present, rfkill_blocked) {
        (true, _, false) => true,
        (false, true, false) => true,
        (_, _, true) => false,
        _ => false,
    }
}

fn check_wifi_nmcli() -> Option<(String, i32)> {
    if let Ok(out) = Command::new("nmcli").args(["-t", "-f", "NAME,DEVICE,TYPE", "connection", "show", "--active"]).output() {
        let text = String::from_utf8_lossy(&out.stdout);
        for line in text.lines() {
            let parts: Vec<&str> = line.split(':').collect();
            if parts.len() >= 3 && (parts[2] == "wifi" || parts[2] == "802-11-wireless") {
                let ssid = parts[0].to_string();
                if let Ok(wifi_out) = Command::new("nmcli").args(["-t", "-f", "ACTIVE,SIGNAL,SSID", "device", "wifi"]).output() {
                    let wifi_text = String::from_utf8_lossy(&wifi_out.stdout);
                    for wline in wifi_text.lines() {
                        let wparts: Vec<&str> = wline.split(':').collect();
                        if wparts.len() >= 3 && wparts[0] == "yes" {
                            let signal = wparts[1].parse::<i32>().unwrap_or(0);
                            return Some((ssid, signal));
                        }
                    }
                }
                return Some((ssid, 0));
            }
        }
    }

    // Check nmcli device status for wifi
    if let Ok(out) = Command::new("nmcli").args(["-t", "-f", "DEVICE,TYPE,STATE", "device", "status"]).output() {
        let text = String::from_utf8_lossy(&out.stdout);
        for line in text.lines() {
            let parts: Vec<&str> = line.split(':').collect();
            if parts.len() >= 3 && parts[1] == "wifi" && (parts[2] == "connected" || parts[2] == "connecting") {
                // Device is connected via wifi but nmcli connection didn't find it
                return Some(("Conectado".to_string(), 0));
            }
        }
    }

    None
}

fn check_wifi_iwconfig() -> Option<(String, i32)> {
    let output = Command::new("iwconfig").output().ok()?;
    let text = String::from_utf8_lossy(&output.stdout);
    let mut ssid = String::new();
    let mut signal = 0i32;

    for line in text.lines() {
        if let Some(pos) = line.find("ESSID:") {
            let after = &line[pos..];
            if after.contains("off/any") || after.contains("\"\"") {
                return None;
            }
            if let Some(qs) = after.find('"') {
                if let Some(qe) = after[qs + 1..].find('"') {
                    ssid = after[qs + 1..qs + 1 + qe].to_string();
                }
            }
        }
        if let Some(lq) = line.find("Link Quality=") {
            let val = &line[lq + 13..];
            if let Some(end) = val.find(' ') {
                let frac = &val[..end];
                if let Some(slash) = frac.find('/') {
                    if let (Ok(cur), Ok(max)) = (frac[..slash].parse::<f64>(), frac[slash + 1..].parse::<f64>()) {
                        if max > 0.0 { signal = (cur / max * 100.0) as i32; }
                    }
                }
            }
        }
    }

    if ssid.is_empty() { None } else { Some((ssid, signal)) }
}

fn check_wifi() -> (String, i32) {
    if let Some(result) = check_wifi_nmcli() { return result; }
    if let Some(result) = check_wifi_iwconfig() { return result; }
    (String::new(), 0)
}

#[derive(Debug, Serialize)]
pub struct SpeedTestResult {
    pub mbps: f64,
    pub formatted: String,
}

fn format_speed(bps: f64) -> (f64, String) {
    let mbps = bps * 8.0 / 1_000_000.0;
    if mbps >= 10.0 {
        (mbps, format!("{:.0} Mbps", mbps))
    } else if mbps >= 1.0 {
        (mbps, format!("{:.1} Mbps", mbps))
    } else {
        let kbps = bps * 8.0 / 1000.0;
        (mbps, format!("{:.0} Kbps", kbps))
    }
}

#[derive(Debug, Serialize)]
pub struct ExternalNetworkInfo {
    pub external_ip: String,
    pub isp: String,
    pub city: String,
    pub region: String,
}

pub fn get_external_info() -> ExternalNetworkInfo {
    let mut info = ExternalNetworkInfo {
        external_ip: String::new(),
        isp: String::new(),
        city: String::new(),
        region: String::new(),
    };

    if let Ok(out) = Command::new("sh").args(["-c", "LANG=C curl -s --max-time 5 https://ipinfo.io/json 2>/dev/null"]).output() {
        if out.status.success() {
            let text = String::from_utf8_lossy(&out.stdout);
            for line in text.lines() {
                if let Some(val) = line.trim().strip_prefix("\"ip\":") {
                    info.external_ip = val.trim().trim_matches(',').trim_matches('"').to_string();
                } else if let Some(val) = line.trim().strip_prefix("\"org\":") {
                    info.isp = val.trim().trim_matches(',').trim_matches('"').to_string();
                } else if let Some(val) = line.trim().strip_prefix("\"city\":") {
                    info.city = val.trim().trim_matches(',').trim_matches('"').to_string();
                } else if let Some(val) = line.trim().strip_prefix("\"region\":") {
                    info.region = val.trim().trim_matches(',').trim_matches('"').to_string();
                }
            }
        }
    }

    // Fallback: just get external IP via ifconfig.me
    if info.external_ip.is_empty() {
        if let Ok(out) = Command::new("sh").args(["-c", "LANG=C curl -s --max-time 5 https://ifconfig.me 2>/dev/null"]).output() {
            if out.status.success() {
                info.external_ip = String::from_utf8_lossy(&out.stdout).trim().to_string();
            }
        }
    }

    info
}

pub fn test_speed_inner() -> SpeedTestResult {
    if let Ok(out) = Command::new("sh").args(["-c", "which curl 2>/dev/null"]).output() {
        if String::from_utf8_lossy(&out.stdout).trim().is_empty() {
            return SpeedTestResult { mbps: 0.0, formatted: "curl n\u{e3}o instalado".to_string() };
        }
    } else {
        return SpeedTestResult { mbps: 0.0, formatted: "curl n\u{e3}o instalado".to_string() };
    }

    // Primary test: Cloudflare speed test
    let cmd = "LANG=C curl -o /dev/null -s -w '%{speed_download}' --max-time 8 'https://speed.cloudflare.com/__down?bytes=50000000' 2>/dev/null";
    if let Ok(out) = Command::new("sh").args(["-c", cmd]).output() {
        if out.status.success() {
            let speed: f64 = String::from_utf8_lossy(&out.stdout).trim().parse().unwrap_or(0.0);
            if speed > 1_000_000.0 {
                return SpeedTestResult { mbps: speed * 8.0 / 1_000_000.0, formatted: format_speed(speed).1 };
            }
        }
    }

    // Fallback: try 20MB
    let cmd = "LANG=C curl -o /dev/null -s -w '%{speed_download}' --max-time 6 'https://speed.cloudflare.com/__down?bytes=20000000' 2>/dev/null";
    if let Ok(out) = Command::new("sh").args(["-c", cmd]).output() {
        if out.status.success() {
            let speed: f64 = String::from_utf8_lossy(&out.stdout).trim().parse().unwrap_or(0.0);
            if speed > 100_000.0 {
                return SpeedTestResult { mbps: speed * 8.0 / 1_000_000.0, formatted: format_speed(speed).1 };
            }
        }
    }

    // Last resort: tele2.net
    let cmd = "LANG=C curl -o /dev/null -s -w '%{speed_download}' --max-time 10 http://speedtest.tele2.net/10MB.zip 2>/dev/null";
    if let Ok(out) = Command::new("sh").args(["-c", cmd]).output() {
        if out.status.success() {
            let speed: f64 = String::from_utf8_lossy(&out.stdout).trim().parse().unwrap_or(0.0);
            if speed > 0.0 {
                return SpeedTestResult { mbps: speed * 8.0 / 1_000_000.0, formatted: format_speed(speed).1 };
            }
        }
    }

    SpeedTestResult { mbps: 0.0, formatted: "Indispon\u{ed}vel".to_string() }
}
