// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2
// GitHub: https://github.com/Rafa-MKR2


use serde::Serialize;
use std::sync::Mutex;

static PREV_CPU: Mutex<Option<CpuTimes>> = Mutex::new(None);

#[derive(Debug, Clone, Copy)]
struct CpuTimes {
    total: u64,
    idle: u64,
}

#[derive(Debug, Serialize)]
pub struct SystemStats {
    pub cpu_percent: f64,
    pub temperature: f64,
    pub memory_percent: f64,
}

fn read_cpu_times() -> Option<CpuTimes> {
    let content = std::fs::read_to_string("/proc/stat").ok()?;
    let first = content.lines().next()?;
    let parts: Vec<&str> = first.split_whitespace().collect();
    if parts.len() < 5 || parts[0] != "cpu" {
        return None;
    }
    let values: Vec<u64> = parts[1..]
        .iter()
        .filter_map(|s| s.parse().ok())
        .collect();
    if values.len() < 4 {
        return None;
    }
    let total: u64 = values.iter().sum();
    let idle = values[3];
    Some(CpuTimes { total, idle })
}

fn get_cpu_percent() -> f64 {
    let current = read_cpu_times();
    let mut prev = PREV_CPU.lock().unwrap();

    match (*prev, current) {
        (Some(p), Some(c)) => {
            let total_delta = c.total.saturating_sub(p.total);
            let idle_delta = c.idle.saturating_sub(p.idle);
            *prev = current;

            if total_delta == 0 {
                return 0.0;
            }
            let usage = (total_delta - idle_delta) as f64 / total_delta as f64 * 100.0;
            usage.clamp(0.0, 100.0)
        }
        (None, Some(_)) => {
            *prev = current;
            0.0
        }
        _ => 0.0,
    }
}

fn get_temperature() -> f64 {
    let base = "/sys/class/thermal";
    let dir = match std::fs::read_dir(base) {
        Ok(d) => d,
        Err(_) => return 0.0,
    };

    for entry in dir.flatten() {
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if name.starts_with("thermal_zone") {
            let type_path = entry.path().join("type");
            let type_str = std::fs::read_to_string(&type_path).unwrap_or_default();
            if type_str.trim() == "x86_pkg_temp" || type_str.trim() == "cpu-thermal" || type_str.trim() == "acpitz" {
                let temp_path = entry.path().join("temp");
                if let Ok(temp_str) = std::fs::read_to_string(&temp_path) {
                    if let Ok(milli) = temp_str.trim().parse::<f64>() {
                        return milli / 1000.0;
                    }
                }
            }
        }
    }

    // Fallback: try first zone
    if let Ok(mut entries) = std::fs::read_dir(base) {
        if let Some(first) = entries.find_map(|e| e.ok()) {
            let temp_path = first.path().join("temp");
            if let Ok(temp_str) = std::fs::read_to_string(&temp_path) {
                if let Ok(milli) = temp_str.trim().parse::<f64>() {
                    return milli / 1000.0;
                }
            }
        }
    }

    0.0
}

fn get_memory_percent() -> f64 {
    let content = std::fs::read_to_string("/proc/meminfo").unwrap_or_default();
    let mut total = 0u64;
    let mut available = 0u64;

    for line in content.lines() {
        if let Some(val) = line.strip_prefix("MemTotal:") {
            total = val.trim().split_whitespace().next().and_then(|v| v.parse().ok()).unwrap_or(0);
        }
        if let Some(val) = line.strip_prefix("MemAvailable:") {
            available = val.trim().split_whitespace().next().and_then(|v| v.parse().ok()).unwrap_or(0);
        }
    }

    if total == 0 {
        return 0.0;
    }

    ((total - available) as f64 / total as f64) * 100.0
}

pub fn get_system_stats() -> SystemStats {
    SystemStats {
        cpu_percent: get_cpu_percent(),
        temperature: get_temperature(),
        memory_percent: get_memory_percent(),
    }
}
