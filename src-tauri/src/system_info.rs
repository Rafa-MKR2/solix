// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2
// GitHub: https://github.com/Rafa-MKR2


use serde::Serialize;
use std::path::Path;

#[derive(Debug, Serialize)]
pub struct DiskInfo {
    pub mount_point: String,
    pub total: String,
    pub used: String,
    pub available: String,
    pub percent_used: f64,
    pub filesystem: String,
    pub fstype: String,
}

#[derive(Debug, Serialize)]
pub struct SystemHardware {
    pub cpu: String,
    pub cores: String,
    pub memory_total: String,
    pub memory_used: String,
    pub disk_total: String,
    pub disk_used: String,
    pub disks: Vec<DiskInfo>,
    pub gpu: String,
    pub kernel: String,
    pub uptime: String,
}

fn read_first_line(path: &str) -> Option<String> {
    let content = std::fs::read_to_string(path).ok()?;
    content.lines().next().map(|l| l.to_string())
}

fn get_disks() -> Vec<DiskInfo> {
    let mut disks = Vec::new();

    if Path::new("/usr/bin/df").exists() {
        // df -hT: formato legível + tipo do filesystem (ext4, btrfs, ntfs, etc.)
        // Colunas: source, type, size, used, avail, use%, mount
        if let Ok(out) = std::process::Command::new("df")
            .args(["-hT"])
            .output()
        {
            let stdout = String::from_utf8_lossy(&out.stdout);
            for line in stdout.lines().skip(1) {
                let line = line.trim();
                if line.is_empty() { continue; }
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() < 7 { continue; }

                let filesystem = parts[0];
                let fstype = parts[1].to_string();

                // Skip virtual filesystems
                if is_virtual_fs(&fstype) {
                    continue;
                }

                let mount = parts[6];
                let total = parts[2].to_string();
                let used = parts[3].to_string();
                let avail = parts[4].to_string();
                let pcent_str = parts[5].trim_end_matches('%');
                let percent = pcent_str.parse::<f64>().unwrap_or(0.0);

                disks.push(DiskInfo {
                    mount_point: mount.to_string(),
                    total,
                    used,
                    available: avail,
                    percent_used: percent,
                    filesystem: filesystem.to_string(),
                    fstype,
                });
            }
        }
    }

    disks
}

fn is_virtual_fs(fstype: &str) -> bool {
    matches!(fstype,
        "tmpfs" | "devtmpfs" | "sysfs" | "proc"
        | "cgroup" | "cgroup2" | "devpts"
        | "securityfs" | "pstore" | "bpf"
        | "efivarfs" | "overlay" | "hugetlbfs"
        | "mqueue" | "debugfs" | "tracefs"
        | "configfs" | "fusectl" | "sunrpc"
        | "nsfs"
    )
}

fn get_gpu_info() -> String {
    if Path::new("/usr/bin/lspci").exists() {
        if let Ok(out) = std::process::Command::new("lspci").args(["-nn"]).output() {
            let stdout = String::from_utf8_lossy(&out.stdout);
            for line in stdout.lines() {
                if line.contains("VGA") || line.contains("3D") || line.contains("Display") {
                    let stripped = line.split(':').nth(2).unwrap_or(line).trim();
                    return stripped.to_string();
                }
            }
        }
    }
    "—".to_string()
}

fn get_kernel() -> String {
    let content = read_first_line("/proc/version").unwrap_or_default();
    content.split_whitespace().nth(2).unwrap_or("—").to_string()
}

pub fn parse_cpuinfo(content: &str) -> (String, String) {
    let cpu = content
        .lines()
        .filter_map(|line| line.strip_prefix("model name"))
        .filter_map(|name| name.split(':').nth(1).map(|v| v.trim().to_string()))
        .next()
        .unwrap_or_else(|| "Desconhecido".to_string());

    let cores = {
        let count = content.lines().filter(|l| l.trim().starts_with("processor")).count();
        if count > 0 {
            format!("{} núcleos", count)
        } else {
            "Desconhecido".to_string()
        }
    };
    (cpu, cores)
}

pub fn parse_meminfo(content: &str) -> (String, String) {
    let mut total_kb = 0u64;
    let mut available_kb = 0u64;

    for line in content.lines() {
        if let Some(val) = line.strip_prefix("MemTotal:") {
            total_kb = val.trim().split_whitespace().next().and_then(|v| v.parse().ok()).unwrap_or(0);
        }
        if let Some(val) = line.strip_prefix("MemAvailable:") {
            available_kb = val.trim().split_whitespace().next().and_then(|v| v.parse().ok()).unwrap_or(0);
        }
    }

    let total_gb = total_kb as f64 / 1_048_576.0;
    let used_gb = (total_kb - available_kb) as f64 / 1_048_576.0;
    (format!("{:.1} GB", total_gb), format!("{:.1} GB", used_gb))
}

pub fn parse_uptime(content: &str) -> String {
    let seconds: f64 = content.split_whitespace().next().and_then(|v| v.parse().ok()).unwrap_or(0.0);
    let hours = (seconds / 3600.0) as u64;
    let minutes = ((seconds % 3600.0) / 60.0) as u64;
    format!("{}h {}m", hours, minutes)
}

pub fn get_system_hardware() -> SystemHardware {
    let cpu_content = std::fs::read_to_string("/proc/cpuinfo").unwrap_or_default();
    let (cpu, cores) = parse_cpuinfo(&cpu_content);
    let mem_content = std::fs::read_to_string("/proc/meminfo").unwrap_or_default();
    let (mem_total, mem_used) = parse_meminfo(&mem_content);
    let disks = get_disks();

    let (disk_total, disk_used) = if !disks.is_empty() {
        // Use root partition for the summary
        let root = disks.iter().find(|d| d.mount_point == "/").unwrap_or(&disks[0]);
        (root.total.clone(), root.used.clone())
    } else {
        ("—".to_string(), "—".to_string())
    };

    SystemHardware {
        cpu,
        cores,
        memory_total: mem_total,
        memory_used: mem_used,
        disk_total,
        disk_used,
        disks,
        gpu: get_gpu_info(),
        kernel: get_kernel(),
        uptime: parse_uptime(&read_first_line("/proc/uptime").unwrap_or_default()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_cpuinfo_full() {
        let content = "processor\t: 0\nmodel name\t: Intel(R) Core(TM) i7-8700K\nvendor_id\t: GenuineIntel\nprocessor\t: 1\nmodel name\t: Intel(R) Core(TM) i7-8700K\n";
        let (cpu, cores) = parse_cpuinfo(content);
        assert_eq!(cpu, "Intel(R) Core(TM) i7-8700K");
        assert_eq!(cores, "2 núcleos");
    }

    #[test]
    fn test_parse_cpuinfo_empty() {
        let (cpu, cores) = parse_cpuinfo("");
        assert_eq!(cpu, "Desconhecido");
        assert_eq!(cores, "Desconhecido");
    }

    #[test]
    fn test_parse_meminfo_full() {
        let content = "MemTotal:       16412244 kB\nMemFree:         5066780 kB\nMemAvailable:    8912340 kB\n";
        let (total, used) = parse_meminfo(content);
        assert!(total.contains("GB"));
        assert!(used.contains("GB"));
        // 16412244 / 1048576 ≈ 15.7 GB
        assert_eq!(total, "15.7 GB");
        // (16412244 - 8912340) / 1048576 ≈ 7.2 GB
        assert_eq!(used, "7.2 GB");
    }

    #[test]
    fn test_parse_meminfo_empty() {
        let (total, used) = parse_meminfo("");
        assert_eq!(total, "0.0 GB");
        assert_eq!(used, "0.0 GB");
    }

    #[test]
    fn test_parse_uptime_normal() {
        assert_eq!(parse_uptime("3661.23 12345.67"), "1h 1m");
    }

    #[test]
    fn test_parse_uptime_zero() {
        assert_eq!(parse_uptime("0.0 0.0"), "0h 0m");
    }

    #[test]
    fn test_parse_uptime_empty() {
        assert_eq!(parse_uptime(""), "0h 0m");
    }

    #[test]
    fn test_parse_uptime_large() {
        assert_eq!(parse_uptime("86400.0 50000.0"), "24h 0m");
    }

    #[test]
    fn test_disk_info_struct() {
        let d = DiskInfo {
            mount_point: "/".into(),
            total: "100 GB".into(),
            used: "50 GB".into(),
            available: "50 GB".into(),
            percent_used: 50.0,
            filesystem: "/dev/sda1".into(),
            fstype: "ext4".into(),
        };
        assert_eq!(d.mount_point, "/");
        assert_eq!(d.percent_used, 50.0);
    }

    #[test]
    fn test_system_hardware_struct() {
        let hw = SystemHardware {
            cpu: "Test CPU".into(),
            cores: "4 núcleos".into(),
            memory_total: "16 GB".into(),
            memory_used: "8 GB".into(),
            disk_total: "500 GB".into(),
            disk_used: "200 GB".into(),
            disks: vec![],
            gpu: "Test GPU".into(),
            kernel: "6.8.0".into(),
            uptime: "10h 30m".into(),
        };
        assert_eq!(hw.cpu, "Test CPU");
        assert_eq!(hw.kernel, "6.8.0");
        assert_eq!(hw.uptime, "10h 30m");
    }

    #[test]
    fn test_read_first_line_nonexistent() {
        assert!(read_first_line("/nonexistent/path").is_none());
    }
}

