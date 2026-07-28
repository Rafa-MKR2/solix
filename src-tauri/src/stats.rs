// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2
// GitHub: https://github.com/Rafa-MKR2


use serde::Serialize;
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};

static PREV_CPU: Mutex<Option<CpuTimes>> = Mutex::new(None);

#[derive(Debug, Clone, Copy)]
struct CpuTimes {
    total: u64,
    idle: u64,
}

#[derive(Debug, Serialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_percent: f64,
    pub mem_percent: f64,
    pub mem_kb: u64,
    pub state: String,
    pub user: String,
    pub cmd: String,
}

#[derive(Debug, Clone, Copy)]
struct ProcessCpuSample {
    total_time: u64,
    system_total: u64,
}

fn prev_proc_cpu() -> &'static Mutex<HashMap<u32, ProcessCpuSample>> {
    static PREV: OnceLock<Mutex<HashMap<u32, ProcessCpuSample>>> = OnceLock::new();
    PREV.get_or_init(|| Mutex::new(HashMap::new()))
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
    let mut prev = match PREV_CPU.lock() {
        Ok(guard) => guard,
        Err(poisoned) => poisoned.into_inner(),
    };

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

fn get_total_mem_kb() -> u64 {
    let content = std::fs::read_to_string("/proc/meminfo").unwrap_or_default();
    for line in content.lines() {
        if let Some(val) = line.strip_prefix("MemTotal:") {
            return val.trim().split_whitespace().next().and_then(|v| v.parse().ok()).unwrap_or(1);
        }
    }
    1
}

fn read_system_cpu_total() -> u64 {
    if let Some(times) = read_cpu_times() {
        times.total
    } else {
        0
    }
}

fn read_proc_stat(pid: u32) -> Option<(u64, char, String, u64)> {
    let stat_path = format!("/proc/{}/stat", pid);
    let content = std::fs::read_to_string(&stat_path).ok()?;
    let comm_end = content.rfind(')')?;
    let rest = content[comm_end + 2..].trim().to_string();
    let fields: Vec<&str> = rest.split_whitespace().collect();
    if fields.len() < 22 {
        return None;
    }
    let state = fields[0].chars().next().unwrap_or('?');
    let utime: u64 = fields[11].parse().unwrap_or(0);
    let stime: u64 = fields[12].parse().unwrap_or(0);
    let total_time = utime + stime;
    let comm = content[content.find('(').unwrap_or(0) + 1..comm_end].to_string();
    let rss_pages: u64 = fields[21].parse().unwrap_or(0);
    let rss_kb = rss_pages * 4;
    Some((total_time, state, comm, rss_kb))
}

fn get_process_user(pid: u32) -> String {
    let status_path = format!("/proc/{}/status", pid);
    if let Ok(content) = std::fs::read_to_string(&status_path) {
        for line in content.lines() {
            if let Some(val) = line.strip_prefix("Uid:") {
                let uid_str = val.trim().split_whitespace().next().unwrap_or("0");
                if let Ok(uid) = uid_str.parse::<u32>() {
                    return get_username_for_uid(uid);
                }
            }
        }
    }
    "?".to_string()
}

static UID_CACHE: Mutex<Option<HashMap<u32, String>>> = Mutex::new(None);

fn get_username_for_uid(uid: u32) -> String {
    if uid == 0 {
        return "root".to_string();
    }
    let mut cache = match UID_CACHE.lock() {
        Ok(g) => g,
        Err(p) => p.into_inner(),
    };
    if let Some(ref map) = *cache {
        if let Some(name) = map.get(&uid) {
            return name.clone();
        }
    } else {
        *cache = Some(HashMap::new());
    }
    if let Ok(content) = std::fs::read_to_string("/etc/passwd") {
        for line in content.lines() {
            let parts: Vec<&str> = line.split(':').collect();
            if parts.len() >= 3 {
                if let Ok(u) = parts[2].parse::<u32>() {
                    if let Some(ref mut map) = *cache {
                        map.insert(u, parts[0].to_string());
                    }
                    if u == uid {
                        return parts[0].to_string();
                    }
                }
            }
        }
    }
    uid.to_string()
}

pub fn get_processes() -> Vec<ProcessInfo> {
    let total_mem_kb = get_total_mem_kb();
    let system_total = read_system_cpu_total();
    let mut result = Vec::new();

    let mut prev_map = match prev_proc_cpu().lock() {
        Ok(g) => g,
        Err(p) => p.into_inner(),
    };

    let dir = match std::fs::read_dir("/proc") {
        Ok(d) => d,
        Err(_) => return result,
    };

    for entry in dir.flatten() {
        let name = entry.file_name();
        let name_str = name.to_string_lossy();
        let pid: u32 = match name_str.parse() {
            Ok(p) => p,
            Err(_) => continue,
        };
        let sample = match read_proc_stat(pid) {
            Some(s) => s,
            None => continue,
        };
        let (total_time, state_raw, comm, rss_kb) = sample;

        let state = match state_raw {
            'R' => "Exec".to_string(),
            'S' => "Sleep".to_string(),
            'D' => "Disk".to_string(),
            'Z' => "Zomb".to_string(),
            'T' | 't' => "Stop".to_string(),
            'I' => "Idle".to_string(),
            _ => state_raw.to_string(),
        };

        let user = get_process_user(pid);

        let cpu_pct = if let Some(prev) = prev_map.get(&pid) {
            let time_delta = total_time.saturating_sub(prev.total_time);
            let sys_delta = system_total.saturating_sub(prev.system_total);
            if sys_delta > 0 {
                (time_delta as f64 / sys_delta as f64) * 100.0
            } else {
                0.0
            }
        } else {
            0.0
        };

        prev_map.insert(pid, ProcessCpuSample { total_time, system_total });

        let mem_pct = if total_mem_kb > 0 {
            (rss_kb as f64 / total_mem_kb as f64) * 100.0
        } else {
            0.0
        };

        result.push(ProcessInfo {
            pid,
            name: comm.clone(),
            cpu_percent: (cpu_pct * 10.0).round() / 10.0,
            mem_percent: (mem_pct * 10.0).round() / 10.0,
            mem_kb: rss_kb,
            state,
            user,
            cmd: comm,
        });
    }

    result.sort_by(|a, b| b.cpu_percent.partial_cmp(&a.cpu_percent).unwrap_or(std::cmp::Ordering::Equal));
    result.truncate(60);
    result
}
