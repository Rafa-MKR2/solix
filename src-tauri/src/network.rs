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
            let num: String = rest
                .chars()
                .take_while(|c| c.is_ascii_digit() || *c == '.')
                .collect();
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
            if name == "lo" || name.starts_with("wl") || name.starts_with("wlan") {
                continue;
            }
            let carrier = entry.path().join("carrier");
            if let Ok(c) = std::fs::read_to_string(&carrier) {
                if c.trim() == "1" {
                    if let Ok(out) = Command::new("ip")
                        .args(["-4", "addr", "show", &name])
                        .output()
                    {
                        let text = String::from_utf8_lossy(&out.stdout);
                        for line in text.lines() {
                            if let Some(pos) = line.find("inet ") {
                                let ip =
                                    line[pos + 5..].split('/').next().unwrap_or("").to_string();
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
    let sys_present = std::fs::read_dir("/sys/class/bluetooth/")
        .ok()
        .map(|d| {
            d.filter_map(|e| e.ok())
                .any(|e| e.file_name().to_string_lossy().starts_with("hci"))
        })
        .unwrap_or(false);

    let (rfkill_present, rfkill_blocked) =
        match Command::new("rfkill").args(["list", "bluetooth"]).output() {
            Ok(out) => {
                let text = String::from_utf8_lossy(&out.stdout);
                (
                    text.to_lowercase().contains("bluetooth"),
                    text.contains("Soft blocked: yes") || text.contains("Hard blocked: yes"),
                )
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
    if let Ok(out) = Command::new("nmcli")
        .args([
            "-t",
            "-f",
            "NAME,DEVICE,TYPE",
            "connection",
            "show",
            "--active",
        ])
        .output()
    {
        let text = String::from_utf8_lossy(&out.stdout);
        for line in text.lines() {
            let parts: Vec<&str> = line.split(':').collect();
            if parts.len() >= 3 && (parts[2] == "wifi" || parts[2] == "802-11-wireless") {
                let ssid = parts[0].to_string();
                if let Ok(wifi_out) = Command::new("nmcli")
                    .args(["-t", "-f", "ACTIVE,SIGNAL,SSID", "device", "wifi"])
                    .output()
                {
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
    if let Ok(out) = Command::new("nmcli")
        .args(["-t", "-f", "DEVICE,TYPE,STATE", "device", "status"])
        .output()
    {
        let text = String::from_utf8_lossy(&out.stdout);
        for line in text.lines() {
            let parts: Vec<&str> = line.split(':').collect();
            if parts.len() >= 3
                && parts[1] == "wifi"
                && (parts[2] == "connected" || parts[2] == "connecting")
            {
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
                    if let (Ok(cur), Ok(max)) = (
                        frac[..slash].parse::<f64>(),
                        frac[slash + 1..].parse::<f64>(),
                    ) {
                        if max > 0.0 {
                            signal = (cur / max * 100.0) as i32;
                        }
                    }
                }
            }
        }
    }

    if ssid.is_empty() {
        None
    } else {
        Some((ssid, signal))
    }
}

fn check_wifi() -> (String, i32) {
    if let Some(result) = check_wifi_nmcli() {
        return result;
    }
    if let Some(result) = check_wifi_iwconfig() {
        return result;
    }
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

    if let Ok(out) = Command::new("sh")
        .args([
            "-c",
            "LANG=C curl -s --max-time 5 https://ipinfo.io/json 2>/dev/null",
        ])
        .output()
    {
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
        if let Ok(out) = Command::new("sh")
            .args([
                "-c",
                "LANG=C curl -s --max-time 5 https://ifconfig.me 2>/dev/null",
            ])
            .output()
        {
            if out.status.success() {
                info.external_ip = String::from_utf8_lossy(&out.stdout).trim().to_string();
            }
        }
    }

    info
}

pub fn test_speed_inner() -> SpeedTestResult {
    if let Ok(out) = Command::new("sh")
        .args(["-c", "which curl 2>/dev/null"])
        .output()
    {
        if String::from_utf8_lossy(&out.stdout).trim().is_empty() {
            return SpeedTestResult {
                mbps: 0.0,
                formatted: "curl n\u{e3}o instalado".to_string(),
            };
        }
    } else {
        return SpeedTestResult {
            mbps: 0.0,
            formatted: "curl n\u{e3}o instalado".to_string(),
        };
    }

    // Primary test: Cloudflare speed test
    let cmd = "LANG=C curl -o /dev/null -s -w '%{speed_download}' --max-time 8 'https://speed.cloudflare.com/__down?bytes=50000000' 2>/dev/null";
    if let Ok(out) = Command::new("sh").args(["-c", cmd]).output() {
        if out.status.success() {
            let speed: f64 = String::from_utf8_lossy(&out.stdout)
                .trim()
                .parse()
                .unwrap_or(0.0);
            if speed > 1_000_000.0 {
                return SpeedTestResult {
                    mbps: speed * 8.0 / 1_000_000.0,
                    formatted: format_speed(speed).1,
                };
            }
        }
    }

    // Fallback: try 20MB
    let cmd = "LANG=C curl -o /dev/null -s -w '%{speed_download}' --max-time 6 'https://speed.cloudflare.com/__down?bytes=20000000' 2>/dev/null";
    if let Ok(out) = Command::new("sh").args(["-c", cmd]).output() {
        if out.status.success() {
            let speed: f64 = String::from_utf8_lossy(&out.stdout)
                .trim()
                .parse()
                .unwrap_or(0.0);
            if speed > 100_000.0 {
                return SpeedTestResult {
                    mbps: speed * 8.0 / 1_000_000.0,
                    formatted: format_speed(speed).1,
                };
            }
        }
    }

    // Last resort: tele2.net
    let cmd = "LANG=C curl -o /dev/null -s -w '%{speed_download}' --max-time 10 http://speedtest.tele2.net/10MB.zip 2>/dev/null";
    if let Ok(out) = Command::new("sh").args(["-c", cmd]).output() {
        if out.status.success() {
            let speed: f64 = String::from_utf8_lossy(&out.stdout)
                .trim()
                .parse()
                .unwrap_or(0.0);
            if speed > 0.0 {
                return SpeedTestResult {
                    mbps: speed * 8.0 / 1_000_000.0,
                    formatted: format_speed(speed).1,
                };
            }
        }
    }

    SpeedTestResult {
        mbps: 0.0,
        formatted: "Indispon\u{ed}vel".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_speed_zero() {
        let (mbps, fmt) = format_speed(0.0);
        assert_eq!(mbps, 0.0);
        assert_eq!(fmt, "0 Kbps");
    }

    #[test]
    fn test_format_speed_100kbps() {
        let (mbps, fmt) = format_speed(12_500.0); // 100 Kbps
        assert!((mbps - 0.1).abs() < 0.01);
        assert_eq!(fmt, "100 Kbps");
    }

    #[test]
    fn test_format_speed_1mbps() {
        let (mbps, fmt) = format_speed(125_000.0); // 1 Mbps
        assert!((mbps - 1.0).abs() < 0.01);
        assert_eq!(fmt, "1.0 Mbps");
    }

    #[test]
    fn test_format_speed_10mbps() {
        let (mbps, fmt) = format_speed(1_250_000.0); // 10 Mbps
        assert!((mbps - 10.0).abs() < 0.01);
        assert_eq!(fmt, "10 Mbps");
    }

    #[test]
    fn test_format_speed_100mbps() {
        let (mbps, fmt) = format_speed(12_500_000.0);
        assert!((mbps - 100.0).abs() < 0.01);
        assert_eq!(fmt, "100 Mbps");
    }

    #[test]
    fn test_format_speed_1000mbps() {
        let (mbps, fmt) = format_speed(125_000_000.0);
        assert!((mbps - 1000.0).abs() < 0.01);
        assert_eq!(fmt, "1000 Mbps");
    }

    #[test]
    fn test_speed_test_result_struct() {
        let r = SpeedTestResult {
            mbps: 50.5,
            formatted: "50.5 Mbps".into(),
        };
        assert_eq!(r.mbps, 50.5);
        assert_eq!(r.formatted, "50.5 Mbps");
    }

    #[test]
    fn test_external_network_info_struct() {
        let info = ExternalNetworkInfo {
            external_ip: "8.8.8.8".into(),
            isp: "Google".into(),
            city: "Mountain View".into(),
            region: "CA".into(),
        };
        assert_eq!(info.external_ip, "8.8.8.8");
        assert_eq!(info.isp, "Google");
    }

    #[test]
    fn test_connectivity_info_default() {
        let info = ConnectivityInfo {
            internet: true,
            ping_latency_ms: 15.5,
            ethernet: true,
            ip_address: "192.168.1.100".into(),
            bluetooth: true,
            wifi_present: false,
            wifi_ssid: String::new(),
            wifi_signal: 0,
        };
        assert!(info.internet);
        assert_eq!(info.ping_latency_ms, 15.5);
        assert!(info.ethernet);
        assert_eq!(info.ip_address, "192.168.1.100");
        assert!(info.bluetooth);
        assert!(!info.wifi_present);
        assert_eq!(info.wifi_ssid, "");
        assert_eq!(info.wifi_signal, 0);
    }

    #[test]
    fn test_connectivity_info_wifi_off_bluetooth_absent() {
        let info = ConnectivityInfo {
            internet: false,
            ping_latency_ms: 0.0,
            ethernet: false,
            ip_address: String::new(),
            bluetooth: false,
            wifi_present: true,
            wifi_ssid: String::new(),
            wifi_signal: 0,
        };
        assert!(!info.internet);
        assert_eq!(info.ping_latency_ms, 0.0);
        assert!(!info.ethernet);
        assert!(info.ip_address.is_empty());
        assert!(!info.bluetooth);
        assert!(info.wifi_present);
        assert!(info.wifi_ssid.is_empty());
        assert_eq!(info.wifi_signal, 0);
    }

    #[test]
    fn test_connectivity_info_wifi_connected() {
        let info = ConnectivityInfo {
            internet: true,
            ping_latency_ms: 12.3,
            ethernet: false,
            ip_address: "192.168.1.5".into(),
            bluetooth: false,
            wifi_present: true,
            wifi_ssid: "MyNetwork".into(),
            wifi_signal: 85,
        };
        assert!(info.internet);
        assert_eq!(info.ping_latency_ms, 12.3);
        assert!(!info.ethernet);
        assert_eq!(info.ip_address, "192.168.1.5");
        assert!(!info.bluetooth);
        assert!(info.wifi_present);
        assert_eq!(info.wifi_ssid, "MyNetwork");
        assert_eq!(info.wifi_signal, 85);
    }

    #[test]
    fn test_external_network_info_all_fields() {
        let info = ExternalNetworkInfo {
            external_ip: "203.0.113.1".into(),
            isp: "ISP Test".into(),
            city: "São Paulo".into(),
            region: "SP".into(),
        };
        assert_eq!(info.external_ip, "203.0.113.1");
        assert_eq!(info.isp, "ISP Test");
        assert_eq!(info.city, "São Paulo");
        assert_eq!(info.region, "SP");
    }

    #[test]
    fn test_speed_test_result_struct_alt() {
        let r = SpeedTestResult {
            mbps: 0.0,
            formatted: "Indispon\u{ed}vel".into(),
        };
        assert_eq!(r.mbps, 0.0);
        assert_eq!(r.formatted, "Indispon\u{ed}vel");
    }

    #[test]
    fn test_format_speed_0_5mbps() {
        let (mbps, fmt) = format_speed(62_500.0);
        assert!((mbps - 0.5).abs() < 0.01);
        assert_eq!(fmt, "500 Kbps");
    }

    #[test]
    fn test_format_speed_9999mbps() {
        let (mbps, fmt) = format_speed(1_249_875_000.0);
        assert!((mbps - 9999.0).abs() < 1.0);
        assert_eq!(fmt, "9999 Mbps");
    }

    #[test]
    fn test_format_speed_very_small() {
        let (mbps, fmt) = format_speed(1.0);
        assert!(mbps < 0.00001);
        assert_eq!(fmt, "0 Kbps");
    }

    #[test]
    fn test_format_speed_negative() {
        let (mbps, fmt) = format_speed(-1000.0);
        assert!(mbps < 0.0);
        assert!(!fmt.is_empty());
    }

    // ─── ConnectivityInfo edge cases ───

    #[test]
    fn test_connectivity_info_default_false() {
        let info = ConnectivityInfo {
            internet: false,
            ping_latency_ms: 0.0,
            ethernet: false,
            ip_address: String::new(),
            bluetooth: false,
            wifi_present: false,
            wifi_ssid: String::new(),
            wifi_signal: 0,
        };
        assert!(!info.internet);
        assert!(!info.ethernet);
        assert!(!info.bluetooth);
        assert!(!info.wifi_present);
    }

    #[test]
    fn test_connectivity_info_all_true() {
        let info = ConnectivityInfo {
            internet: true,
            ping_latency_ms: 10.0,
            ethernet: true,
            ip_address: "10.0.0.1".into(),
            bluetooth: true,
            wifi_present: true,
            wifi_ssid: "CorpNet".into(),
            wifi_signal: 95,
        };
        assert!(info.internet);
        assert!(info.ethernet);
        assert!(info.bluetooth);
        assert!(info.wifi_present);
        assert_eq!(info.wifi_signal, 95);
        assert_eq!(info.ip_address, "10.0.0.1");
    }

    #[test]
    fn test_connectivity_info_max_ping() {
        let info = ConnectivityInfo {
            internet: true,
            ping_latency_ms: f64::MAX,
            ethernet: true,
            ip_address: "192.168.0.1".into(),
            bluetooth: false,
            wifi_present: false,
            wifi_ssid: String::new(),
            wifi_signal: 0,
        };
        assert_eq!(info.ping_latency_ms, f64::MAX);
    }

    #[test]
    fn test_connectivity_info_empty_ip() {
        let info = ConnectivityInfo {
            internet: false,
            ping_latency_ms: 0.0,
            ethernet: false,
            ip_address: String::new(),
            bluetooth: false,
            wifi_present: false,
            wifi_ssid: String::new(),
            wifi_signal: 0,
        };
        assert!(info.ip_address.is_empty());
    }

    #[test]
    fn test_connectivity_info_min_signal() {
        let info = ConnectivityInfo {
            internet: true,
            ping_latency_ms: 5.0,
            ethernet: false,
            ip_address: String::new(),
            bluetooth: true,
            wifi_present: true,
            wifi_ssid: "Guest".into(),
            wifi_signal: -100,
        };
        assert_eq!(info.wifi_signal, -100);
    }

    // ─── ExternalNetworkInfo edge cases ───

    #[test]
    fn test_external_network_info_empty() {
        let info = ExternalNetworkInfo {
            external_ip: String::new(),
            isp: String::new(),
            city: String::new(),
            region: String::new(),
        };
        assert!(info.external_ip.is_empty());
        assert!(info.isp.is_empty());
    }

    #[test]
    fn test_external_network_info_max_length() {
        let info = ExternalNetworkInfo {
            external_ip: "2001:0db8:85a3:0000:0000:8a2e:0370:7334".into(),
            isp: "A".repeat(255),
            city: "A".repeat(100),
            region: "XX".into(),
        };
        assert_eq!(info.isp.len(), 255);
        assert_eq!(info.city.len(), 100);
    }

    // ─── SpeedTestResult edge cases ───

    #[test]
    fn test_speed_test_result_zero() {
        let r = SpeedTestResult {
            mbps: 0.0,
            formatted: "0 Kbps".into(),
        };
        assert_eq!(r.mbps, 0.0);
    }

    #[test]
    fn test_speed_test_result_max() {
        let r = SpeedTestResult {
            mbps: 10_000.0,
            formatted: "10000 Mbps".into(),
        };
        assert!((r.mbps - 10_000.0).abs() < 0.01);
    }

    // ─── format_speed edge cases ───

    #[test]
    fn test_format_speed_exact_10mbps() {
        let bps = 1_250_000.0;
        let (mbps, fmt) = format_speed(bps);
        assert!((mbps - 10.0).abs() < 0.01);
        assert_eq!(fmt, "10 Mbps");
    }

    #[test]
    fn test_format_speed_exact_1gbps() {
        let (mbps, _) = format_speed(125_000_000.0); // 1 Gbps
        assert!((mbps - 1000.0).abs() < 0.01);
    }

    #[test]
    fn test_format_speed_exact_100kbps() {
        let (mbps, fmt) = format_speed(12_500.0);
        assert!((mbps - 0.1).abs() < 0.001);
        assert_eq!(fmt, "100 Kbps");
    }

    // ─── Real system function smoke tests ───

    #[test]
    fn test_check_wifi_present_no_panic() {
        // Should not panic, regardless of system state
        let _present = check_wifi_present();
    }

    #[test]
    fn test_check_bluetooth_no_panic() {
        let _bt = check_bluetooth();
    }

    #[test]
    fn test_check_internet_no_panic() {
        let _online = check_internet();
    }
}
