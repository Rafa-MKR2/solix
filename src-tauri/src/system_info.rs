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

fn get_cpu_info() -> String {
    let content = std::fs::read_to_string("/proc/cpuinfo").unwrap_or_default();
    for line in content.lines() {
        if let Some(name) = line.strip_prefix("model name") {
            let parts: Vec<&str> = name.split(':').collect();
            if parts.len() > 1 {
                return parts[1].trim().to_string();
            }
        }
    }
    "Desconhecido".to_string()
}

fn get_cpu_cores() -> String {
    let content = std::fs::read_to_string("/proc/cpuinfo").unwrap_or_default();
    let count = content.lines().filter(|l| l.trim().starts_with("processor")).count();
    if count > 0 {
        format!("{} núcleos", count)
    } else {
        "Desconhecido".to_string()
    }
}

fn get_memory_info() -> (String, String) {
    let content = std::fs::read_to_string("/proc/meminfo").unwrap_or_default();
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

fn get_disks() -> Vec<DiskInfo> {
    let mut disks = Vec::new();

    if Path::new("/usr/bin/df").exists() {
        if let Ok(out) = std::process::Command::new("df")
            .args(["-h", "--output=source,target,size,used,avail,pcent"])
            .output()
        {
            let stdout = String::from_utf8_lossy(&out.stdout);
            for line in stdout.lines().skip(1) {
                let line = line.trim();
                if line.is_empty() { continue; }
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() < 6 { continue; }

                let filesystem = parts[0];
                // Skip virtual filesystems
                if filesystem.starts_with("tmpfs")
                    || filesystem.starts_with("devtmpfs")
                    || filesystem.starts_with("sysfs")
                    || filesystem.starts_with("proc")
                    || filesystem.starts_with("cgroup")
                    || filesystem.starts_with("devpts")
                    || filesystem.starts_with("securityfs")
                    || filesystem.starts_with("pstore")
                    || filesystem.starts_with("bpf")
                    || filesystem.starts_with("efivarfs")
                    || filesystem.starts_with("none")
                    || filesystem.starts_with("overlay")
                    || filesystem.starts_with("shm")
                    || filesystem.starts_with("hugetlbfs")
                    || filesystem.starts_with("mqueue")
                    || filesystem.starts_with("debugfs")
                    || filesystem.starts_with("tracefs")
                    || filesystem.starts_with("configfs")
                    || filesystem.starts_with("fusectl")
                    || filesystem.starts_with("sunrpc")
                    || filesystem.starts_with("nsfs")
                {
                    continue;
                }

                let mount = parts[1];
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
                });
            }
        }
    }

    disks
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

fn get_uptime() -> String {
    let content = read_first_line("/proc/uptime").unwrap_or_default();
    let seconds: f64 = content.split_whitespace().next().and_then(|v| v.parse().ok()).unwrap_or(0.0);
    let hours = (seconds / 3600.0) as u64;
    let minutes = ((seconds % 3600.0) / 60.0) as u64;
    format!("{}h {}m", hours, minutes)
}

pub fn get_system_hardware() -> SystemHardware {
    let (mem_total, mem_used) = get_memory_info();
    let disks = get_disks();

    let (disk_total, disk_used) = if !disks.is_empty() {
        // Use root partition for the summary
        let root = disks.iter().find(|d| d.mount_point == "/").unwrap_or(&disks[0]);
        (root.total.clone(), root.used.clone())
    } else {
        ("—".to_string(), "—".to_string())
    };

    SystemHardware {
        cpu: get_cpu_info(),
        cores: get_cpu_cores(),
        memory_total: mem_total,
        memory_used: mem_used,
        disk_total,
        disk_used,
        disks,
        gpu: get_gpu_info(),
        kernel: get_kernel(),
        uptime: get_uptime(),
    }
}
