// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2
// GitHub: https://github.com/Rafa-MKR2

use serde::Serialize;
use std::collections::HashMap;
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
    pub io_read: String,  // human-readable, e.g. "45.2 MB/s"
    pub io_write: String, // human-readable
    pub device_model: String,
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
    let io_map = get_disk_io_map();

    if Path::new("/usr/bin/df").exists() {
        if let Ok(out) = std::process::Command::new("df").args(["-hT"]).output() {
            let stdout = String::from_utf8_lossy(&out.stdout);
            for line in stdout.lines().skip(1) {
                let line = line.trim();
                if line.is_empty() {
                    continue;
                }
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() < 7 {
                    continue;
                }

                let filesystem = parts[0];
                let fstype = parts[1].to_string();

                if is_virtual_fs(&fstype) {
                    continue;
                }

                let mount = parts[6];
                let total = parts[2].to_string();
                let used = parts[3].to_string();
                let avail = parts[4].to_string();
                let pcent_str = parts[5].trim_end_matches('%');
                let percent = pcent_str.parse::<f64>().unwrap_or(0.0);

                // Extract base device name (e.g. /dev/sda1 → sda, /dev/nvme0n1p2 → nvme0n1)
                let dev_name = filesystem
                    .strip_prefix("/dev/")
                    .unwrap_or(filesystem)
                    .trim_end_matches(|c: char| c.is_ascii_digit())
                    .trim_end_matches('p');

                let full_name = filesystem
                    .strip_prefix("/dev/")
                    .unwrap_or(filesystem)
                    .to_string();

                let (io_read, io_write) = io_map
                    .get(&full_name) // try partition name first
                    .or_else(|| io_map.get(dev_name)) // fallback to base device
                    .cloned()
                    .unwrap_or(("—".to_string(), "—".to_string()));

                let device_model = get_device_model(dev_name);

                disks.push(DiskInfo {
                    mount_point: mount.to_string(),
                    total,
                    used,
                    available: avail,
                    percent_used: percent,
                    filesystem: filesystem.to_string(),
                    fstype,
                    io_read,
                    io_write,
                    device_model,
                });
            }
        }
    }

    disks
}

fn get_disk_io_map() -> HashMap<String, (String, String)> {
    // Read /proc/diskstats twice with a delay to calculate I/O speed
    fn read_diskstats() -> HashMap<String, (u64, u64)> {
        let mut map = HashMap::new();
        if let Ok(content) = std::fs::read_to_string("/proc/diskstats") {
            for line in content.lines() {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 10 {
                    let name = parts[2].to_string();
                    // Skip virtual devices
                    if name.starts_with("loop")
                        || name.starts_with("ram")
                        || name.starts_with("zram")
                        || name.starts_with("dm-")
                    {
                        continue;
                    }
                    let rsect: u64 = parts.get(5).and_then(|s| s.parse().ok()).unwrap_or(0);
                    let wsect: u64 = parts.get(9).and_then(|s| s.parse().ok()).unwrap_or(0);
                    map.insert(name, (rsect, wsect));
                }
            }
        }
        map
    }

    fn sectors_to_bytes(sectors: u64) -> u64 {
        sectors * 512 // 1 sector = 512 bytes
    }

    fn format_speed(bytes_per_sec: u64) -> String {
        if bytes_per_sec > 1_073_741_824 {
            format!("{:.1} GB/s", bytes_per_sec as f64 / 1_073_741_824.0)
        } else if bytes_per_sec > 1_048_576 {
            format!("{:.1} MB/s", bytes_per_sec as f64 / 1_048_576.0)
        } else if bytes_per_sec > 1024 {
            format!("{:.0} KB/s", bytes_per_sec as f64 / 1024.0)
        } else {
            format!("{} B/s", bytes_per_sec)
        }
    }

    let first = read_diskstats();
    std::thread::sleep(std::time::Duration::from_millis(500));
    let second = read_diskstats();

    let mut result = HashMap::new();
    for (name, (s1_r, s1_w)) in &first {
        if let Some(&(s2_r, s2_w)) = second.get(name) {
            let read_bytes = sectors_to_bytes(s2_r.saturating_sub(*s1_r));
            let write_bytes = sectors_to_bytes(s2_w.saturating_sub(*s1_w));
            // Multiply by 2 because we slept 500ms (0.5s), so multiply by 2 for bytes/sec
            let read_speed = format_speed(read_bytes * 2);
            let write_speed = format_speed(write_bytes * 2);
            result.insert(name.clone(), (read_speed, write_speed));
        }
    }
    result
}

fn get_device_model(dev_name: &str) -> String {
    // Try /sys/block/<name>/device/model for NVMe/SATA/SCSI
    let model_path = format!("/sys/block/{}/device/model", dev_name);
    if let Ok(model) = std::fs::read_to_string(&model_path) {
        return model.trim().to_string();
    }
    // Try loopback devices
    if dev_name.starts_with("loop") {
        return "Loopback".to_string();
    }
    // Try /sys/block/<name>/dm/name for device mapper
    if dev_name.starts_with("dm-") {
        if let Ok(name) = std::fs::read_to_string(format!("/sys/block/{}/dm/name", dev_name)) {
            return format!("DM-{}", name.trim());
        }
    }
    String::new()
}

fn is_virtual_fs(fstype: &str) -> bool {
    matches!(
        fstype,
        "tmpfs"
            | "devtmpfs"
            | "sysfs"
            | "proc"
            | "cgroup"
            | "cgroup2"
            | "devpts"
            | "securityfs"
            | "pstore"
            | "bpf"
            | "efivarfs"
            | "overlay"
            | "hugetlbfs"
            | "mqueue"
            | "debugfs"
            | "tracefs"
            | "configfs"
            | "fusectl"
            | "sunrpc"
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
        let count = content
            .lines()
            .filter(|l| l.trim().starts_with("processor"))
            .count();
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
            total_kb = val
                .split_whitespace()
                .next()
                .and_then(|v| v.parse().ok())
                .unwrap_or(0);
        }
        if let Some(val) = line.strip_prefix("MemAvailable:") {
            available_kb = val
                .split_whitespace()
                .next()
                .and_then(|v| v.parse().ok())
                .unwrap_or(0);
        }
    }

    let total_gb = total_kb as f64 / 1_048_576.0;
    let used_gb = total_kb.saturating_sub(available_kb) as f64 / 1_048_576.0;
    (format!("{:.1} GB", total_gb), format!("{:.1} GB", used_gb))
}

pub fn parse_uptime(content: &str) -> String {
    let seconds: f64 = content
        .split_whitespace()
        .next()
        .and_then(|v| v.parse().ok())
        .unwrap_or(0.0);
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
        let root = disks
            .iter()
            .find(|d| d.mount_point == "/")
            .unwrap_or(&disks[0]);
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
            io_read: "—".into(),
            io_write: "—".into(),
            device_model: String::new(),
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

    #[test]
    fn test_parse_cpuinfo_multi_core_different_names() {
        let content = "\
processor\t: 0\n\
model name\t: Intel(R) Core(TM) i7-8700K\n\
processor\t: 1\n\
model name\t: Intel(R) Core(TM) i7-8700K\n\
processor\t: 2\n\
model name\t: AMD Ryzen 5 3600\n\
processor\t: 3\n\
model name\t: AMD Ryzen 5 3600\n\
processor\t: 4\n\
model name\t: AMD Ryzen 5 3600\n";
        let (cpu, cores) = parse_cpuinfo(content);
        assert_eq!(cpu, "Intel(R) Core(TM) i7-8700K");
        assert_eq!(cores, "5 núcleos");
    }

    #[test]
    fn test_parse_meminfo_zero_values() {
        let content = "MemTotal:        0 kB\nMemAvailable:        0 kB\n";
        let (total, used) = parse_meminfo(content);
        assert_eq!(total, "0.0 GB");
        assert_eq!(used, "0.0 GB");
    }

    #[test]
    fn test_parse_meminfo_partial_missing_available() {
        let content = "MemTotal:       1048576 kB\n";
        let (total, used) = parse_meminfo(content);
        assert_eq!(total, "1.0 GB");
        assert_eq!(used, "1.0 GB");
    }

    #[test]
    fn test_parse_meminfo_missing_available() {
        let content = "MemTotal:       1048576 kB\n";
        let (total, used) = parse_meminfo(content);
        assert_eq!(total, "1.0 GB");
        assert_eq!(used, "1.0 GB");
    }

    #[test]
    fn test_parse_uptime_very_large() {
        assert_eq!(parse_uptime("172800.0 100000.0"), "48h 0m");
    }

    #[test]
    fn test_parse_uptime_huge() {
        assert_eq!(parse_uptime("604800.0 300000.0"), "168h 0m");
    }

    #[test]
    fn test_disk_info_struct_full() {
        let d = DiskInfo {
            mount_point: "/home".into(),
            total: "500 GB".into(),
            used: "200 GB".into(),
            available: "300 GB".into(),
            percent_used: 40.0,
            filesystem: "/dev/sdb1".into(),
            fstype: "btrfs".into(),
            io_read: "45.2 MB/s".into(),
            io_write: "22.8 MB/s".into(),
            device_model: "Samsung SSD 970".into(),
        };
        assert_eq!(d.mount_point, "/home");
        assert_eq!(d.total, "500 GB");
        assert_eq!(d.used, "200 GB");
        assert_eq!(d.available, "300 GB");
        assert_eq!(d.percent_used, 40.0);
        assert_eq!(d.filesystem, "/dev/sdb1");
        assert_eq!(d.fstype, "btrfs");
        assert_eq!(d.io_read, "45.2 MB/s");
        assert_eq!(d.io_write, "22.8 MB/s");
        assert_eq!(d.device_model, "Samsung SSD 970");
    }

    #[test]
    fn test_system_hardware_struct_empty_fields() {
        let hw = SystemHardware {
            cpu: String::new(),
            cores: String::new(),
            memory_total: String::new(),
            memory_used: String::new(),
            disk_total: String::new(),
            disk_used: String::new(),
            disks: vec![],
            gpu: String::new(),
            kernel: String::new(),
            uptime: String::new(),
        };
        assert!(hw.cpu.is_empty());
        assert!(hw.cores.is_empty());
        assert!(hw.memory_total.is_empty());
        assert!(hw.memory_used.is_empty());
        assert!(hw.disk_total.is_empty());
        assert!(hw.disk_used.is_empty());
        assert!(hw.disks.is_empty());
        assert!(hw.gpu.is_empty());
        assert!(hw.kernel.is_empty());
        assert!(hw.uptime.is_empty());
    }

    #[test]
    fn test_is_virtual_fs_common() {
        assert!(is_virtual_fs("tmpfs"));
        assert!(is_virtual_fs("proc"));
        assert!(is_virtual_fs("sysfs"));
        assert!(is_virtual_fs("devtmpfs"));
        assert!(is_virtual_fs("overlay"));
        assert!(is_virtual_fs("cgroup2"));
    }

    #[test]
    fn test_is_virtual_fs_not_virtual() {
        assert!(!is_virtual_fs("ext4"));
        assert!(!is_virtual_fs("btrfs"));
        assert!(!is_virtual_fs("ntfs"));
        assert!(!is_virtual_fs("vfat"));
        assert!(!is_virtual_fs("xfs"));
        assert!(!is_virtual_fs("zfs"));
    }

    #[test]
    fn test_is_virtual_fs_empty() {
        assert!(!is_virtual_fs(""));
    }

    #[test]
    fn test_is_virtual_fs_case_sensitive() {
        assert!(!is_virtual_fs("Tmpfs"));
        assert!(!is_virtual_fs("PROC"));
    }

    #[test]
    fn test_parse_uptime_malformed() {
        assert_eq!(parse_uptime("abc def"), "0h 0m");
    }

    #[test]
    fn test_parse_uptime_partial() {
        assert_eq!(parse_uptime("3600"), "1h 0m");
    }

    #[test]
    fn test_parse_meminfo_negative_values() {
        let content = "MemTotal:        -1 kB\nMemAvailable:    -5 kB\n";
        let (total, used) = parse_meminfo(content);
        assert_eq!(total, "0.0 GB");
        assert_eq!(used, "0.0 GB");
    }

    #[test]
    fn test_parse_cpuinfo_no_model_name() {
        let content = "processor\t: 0\nvendor_id\t: GenuineIntel\n";
        let (cpu, cores) = parse_cpuinfo(content);
        assert_eq!(cpu, "Desconhecido");
        assert_eq!(cores, "1 núcleos");
    }

    #[test]
    fn test_parse_meminfo_available_greater_than_total() {
        let content = "MemTotal:       1048576 kB\nMemAvailable:    2097152 kB\n";
        let (total, used) = parse_meminfo(content);
        assert_eq!(total, "1.0 GB");
        assert_eq!(used, "0.0 GB"); // saturating at 0
    }
}
