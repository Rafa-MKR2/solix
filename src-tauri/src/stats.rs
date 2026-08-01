// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2
// GitHub: https://github.com/Rafa-MKR2

use serde::Serialize;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};

/// Flag compartilhada que indica se uma operação de instalação/remoção/atualização
/// está em andamento. Quando ativa, as consultas do HomeStats (pacman -Q, -Qu)
/// são puladas para evitar conflitos com o pacman.
static OPERATION_IN_PROGRESS: AtomicBool = AtomicBool::new(false);

pub fn set_operation_in_progress(val: bool) {
    OPERATION_IN_PROGRESS.store(val, Ordering::SeqCst);
}

pub fn is_operation_in_progress() -> bool {
    OPERATION_IN_PROGRESS.load(Ordering::SeqCst)
}

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
    let values: Vec<u64> = parts[1..].iter().filter_map(|s| s.parse().ok()).collect();
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
            if type_str.trim() == "x86_pkg_temp"
                || type_str.trim() == "cpu-thermal"
                || type_str.trim() == "acpitz"
            {
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
            total = val
                .split_whitespace()
                .next()
                .and_then(|v| v.parse().ok())
                .unwrap_or(0);
        }
        if let Some(val) = line.strip_prefix("MemAvailable:") {
            available = val
                .split_whitespace()
                .next()
                .and_then(|v| v.parse().ok())
                .unwrap_or(0);
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
            return val
                .split_whitespace()
                .next()
                .and_then(|v| v.parse().ok())
                .unwrap_or(1);
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
    parse_proc_stat_line(&content)
}

fn parse_proc_stat_line(content: &str) -> Option<(u64, char, String, u64)> {
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
                let uid_str = val.split_whitespace().next().unwrap_or("0");
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

#[derive(Debug, Serialize)]
pub struct HomeStats {
    pub packages_installed: u64,
    pub packages_formatted: String,
    pub updates_available: u64,
    pub updates_formatted: String,
    pub load_average: String,
    pub swap_used: String,
    pub swap_total: String,
    pub swap_percent: f64,
    pub services_active: u64,
}

fn run_cmd(args: &[&str]) -> Option<String> {
    std::process::Command::new(args[0])
        .args(&args[1..])
        .output()
        .ok()
        .and_then(|o| {
            if o.status.success() {
                String::from_utf8(o.stdout).ok()
            } else {
                None
            }
        })
}

fn fmt_package_count(count: u64) -> String {
    if count >= 1000 {
        format!("{:.1}k", count as f64 / 1000.0)
    } else {
        count.to_string()
    }
}

fn count_packages() -> (u64, String) {
    if is_operation_in_progress() {
        return (0, "—".to_string());
    }

    if let Some(out) = run_cmd(&["timeout", "15", "pacman", "-Q", "--noconfirm"]) {
        let count = out.lines().filter(|l| !l.is_empty()).count() as u64;
        return (count, fmt_package_count(count));
    }
    if let Some(out) = run_cmd(&["dpkg", "--list"]) {
        let count = out.lines().filter(|l| l.starts_with("ii")).count() as u64;
        return (count, fmt_package_count(count));
    }
    if let Some(out) = run_cmd(&["rpm", "-qa"]) {
        let count = out.lines().filter(|l| !l.is_empty()).count() as u64;
        return (count, fmt_package_count(count));
    }
    (0, "—".to_string())
}

fn count_updates() -> (u64, String) {
    // Se uma operação estiver em andamento, pula a consulta
    if is_operation_in_progress() {
        return (0, "—".to_string());
    }

    // Arch — com timeout de 15s
    if let Some(out) = run_cmd(&["timeout", "15", "pacman", "-Qu", "--noconfirm"]) {
        let count = out
            .lines()
            .filter(|l| !l.is_empty() && !l.contains("There is nothing to do"))
            .count() as u64;
        return (
            count,
            if count == 0 {
                "Em dia".into()
            } else {
                format!("{}", count)
            },
        );
    }
    // Debian/Ubuntu
    if let Ok(out) = std::process::Command::new("timeout")
        .args(["15", "apt", "list", "--upgradable"])
        .output()
    {
        let text = String::from_utf8_lossy(&out.stdout);
        let count = text
            .lines()
            .filter(|l| !l.is_empty() && !l.contains("Listando") && !l.starts_with("Listing"))
            .count() as u64;
        return (
            count,
            if count == 0 {
                "Em dia".into()
            } else {
                format!("{}", count)
            },
        );
    }
    // Fedora — com timeout de 30s (dnf pode ser mais lento)
    if let Ok(out) = std::process::Command::new("timeout")
        .args(["30", "dnf", "check-update", "-q"])
        .output()
    {
        let text = String::from_utf8_lossy(&out.stdout);
        let count = text
            .lines()
            .filter(|l| !l.is_empty() && !l.starts_with("Last metadata"))
            .count() as u64;
        return (
            count,
            if count == 0 {
                "Em dia".into()
            } else {
                format!("{}", count)
            },
        );
    }
    (0, "—".to_string())
}

fn get_load_average() -> String {
    std::fs::read_to_string("/proc/loadavg")
        .ok()
        .and_then(|s| {
            let parts: Vec<&str> = s.split_whitespace().take(3).collect();
            if parts.len() == 3 {
                Some(parts.join("  "))
            } else {
                None
            }
        })
        .unwrap_or_else(|| "—".to_string())
}

fn fmt_kb(kb: u64) -> String {
    if kb > 1_048_576 {
        format!("{:.1} GB", kb as f64 / 1_048_576.0)
    } else if kb > 1024 {
        format!("{:.0} MB", kb as f64 / 1024.0)
    } else {
        format!("{} KB", kb)
    }
}

fn get_swap_info() -> (String, String, f64) {
    let content = std::fs::read_to_string("/proc/meminfo").unwrap_or_default();
    let mut total_kb = 0u64;
    let mut free_kb = 0u64;
    for line in content.lines() {
        if let Some(v) = line.strip_prefix("SwapTotal:") {
            total_kb = v
                .split_whitespace()
                .next()
                .and_then(|s| s.parse().ok())
                .unwrap_or(0);
        }
        if let Some(v) = line.strip_prefix("SwapFree:") {
            free_kb = v
                .split_whitespace()
                .next()
                .and_then(|s| s.parse().ok())
                .unwrap_or(0);
        }
    }
    let used_kb = total_kb.saturating_sub(free_kb);
    let pct = if total_kb > 0 {
        (used_kb as f64 / total_kb as f64) * 100.0
    } else {
        0.0
    };
    (fmt_kb(used_kb), fmt_kb(total_kb), pct)
}

fn count_services() -> u64 {
    run_cmd(&[
        "systemctl",
        "list-units",
        "--type=service",
        "--state=running",
        "--no-legend",
        "--no-pager",
    ])
    .map(|s| s.lines().filter(|l| !l.is_empty()).count() as u64)
    .unwrap_or(0)
}

pub fn get_home_stats() -> HomeStats {
    let (pkg_count, pkg_fmt) = count_packages();
    let (upd_count, upd_fmt) = count_updates();
    let (swap_used, swap_total, swap_pct) = get_swap_info();

    HomeStats {
        packages_installed: pkg_count,
        packages_formatted: pkg_fmt,
        updates_available: upd_count,
        updates_formatted: upd_fmt,
        load_average: get_load_average(),
        swap_used,
        swap_total,
        swap_percent: (swap_pct * 10.0).round() / 10.0,
        services_active: count_services(),
    }
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

        let state = map_state(state_raw);

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

        prev_map.insert(
            pid,
            ProcessCpuSample {
                total_time,
                system_total,
            },
        );

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

    result.sort_by(|a, b| {
        b.cpu_percent
            .partial_cmp(&a.cpu_percent)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    result.truncate(60);
    result
}

fn map_state(c: char) -> String {
    match c {
        'R' => "Exec".to_string(),
        'S' => "Sleep".to_string(),
        'D' => "Disk".to_string(),
        'Z' => "Zomb".to_string(),
        'T' | 't' => "Stop".to_string(),
        'I' => "Idle".to_string(),
        _ => c.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_username_for_uid_root() {
        assert_eq!(get_username_for_uid(0), "root");
    }

    #[test]
    fn test_state_mapping() {
        let cases = [
            ('R', "Exec"),
            ('S', "Sleep"),
            ('D', "Disk"),
            ('Z', "Zomb"),
            ('T', "Stop"),
            ('t', "Stop"),
            ('I', "Idle"),
            ('X', "X"),
        ];
        for (ch, expected) in &cases {
            let state = map_state(*ch);
            assert_eq!(state, *expected, "State mapping for '{}' failed", ch);
        }
    }

    #[test]
    fn test_get_system_stats_struct() {
        let s = SystemStats {
            cpu_percent: 42.5,
            temperature: 68.0,
            memory_percent: 55.0,
        };
        assert!((s.cpu_percent - 42.5).abs() < 0.01);
        assert!((s.temperature - 68.0).abs() < 0.01);
        assert!((s.memory_percent - 55.0).abs() < 0.01);
    }

    #[test]
    fn test_process_info_struct() {
        let p = ProcessInfo {
            pid: 1234,
            name: "test".into(),
            cpu_percent: 10.5,
            mem_percent: 2.5,
            mem_kb: 10240,
            state: "Sleep".into(),
            user: "user".into(),
            cmd: "/usr/bin/test".into(),
        };
        assert_eq!(p.pid, 1234);
        assert_eq!(p.name, "test");
        assert_eq!(p.state, "Sleep");
    }

    #[test]
    fn test_home_stats_struct() {
        let h = HomeStats {
            packages_installed: 1500,
            packages_formatted: "1.5k".into(),
            updates_available: 5,
            updates_formatted: "5".into(),
            load_average: "0.50 0.40 0.30".into(),
            swap_used: "500 MB".into(),
            swap_total: "2.0 GB".into(),
            swap_percent: 24.5,
            services_active: 42,
        };
        assert_eq!(h.packages_installed, 1500);
        assert_eq!(h.packages_formatted, "1.5k");
        assert_eq!(h.updates_available, 5);
        assert_eq!(h.updates_formatted, "5");
        assert_eq!(h.load_average, "0.50 0.40 0.30");
        assert_eq!(h.swap_used, "500 MB");
        assert_eq!(h.swap_total, "2.0 GB");
        assert!((h.swap_percent - 24.5).abs() < 0.01);
        assert_eq!(h.services_active, 42);
    }

    #[test]
    fn test_process_info_complete() {
        let p = ProcessInfo {
            pid: 9999,
            name: "firefox".into(),
            cpu_percent: 15.3,
            mem_percent: 8.1,
            mem_kb: 65536,
            state: "Exec".into(),
            user: "alice".into(),
            cmd: "/usr/lib/firefox/firefox".into(),
        };
        assert_eq!(p.pid, 9999);
        assert_eq!(p.name, "firefox");
        assert!((p.cpu_percent - 15.3).abs() < 0.01);
        assert!((p.mem_percent - 8.1).abs() < 0.01);
        assert_eq!(p.mem_kb, 65536);
        assert_eq!(p.state, "Exec");
        assert_eq!(p.user, "alice");
        assert_eq!(p.cmd, "/usr/lib/firefox/firefox");
    }

    #[test]
    fn test_state_mapping_all() {
        let cases = [
            ('R', "Exec"),
            ('S', "Sleep"),
            ('D', "Disk"),
            ('Z', "Zomb"),
            ('T', "Stop"),
            ('t', "Stop"),
            ('X', "X"),
            ('I', "Idle"),
            ('P', "P"),
        ];
        for (ch, expected) in &cases {
            let state = map_state(*ch);
            assert_eq!(state, *expected, "State mapping for '{}' failed", ch);
        }
    }

    #[test]
    fn test_state_mapping_unknown() {
        assert_eq!(map_state('?'), "?");
    }

    #[test]
    fn test_get_username_for_uid_invalid() {
        let name = get_username_for_uid(99999);
        assert_eq!(name, "99999");
    }

    #[test]
    fn test_process_info_edge_cases() {
        let p = ProcessInfo {
            pid: 0,
            name: String::new(),
            cpu_percent: 0.0,
            mem_percent: 0.0,
            mem_kb: 0,
            state: "Zomb".into(),
            user: "root".into(),
            cmd: String::new(),
        };
        assert_eq!(p.pid, 0);
        assert!(p.name.is_empty());
        assert!((p.cpu_percent - 0.0).abs() < 0.01);
        assert!((p.mem_percent - 0.0).abs() < 0.01);
        assert_eq!(p.mem_kb, 0);
        assert_eq!(p.state, "Zomb");
        assert_eq!(p.user, "root");
        assert!(p.cmd.is_empty());
    }

    #[test]
    fn test_fmt_kb_kb() {
        assert_eq!(fmt_kb(0), "0 KB");
        assert_eq!(fmt_kb(1), "1 KB");
        assert_eq!(fmt_kb(1024), "1024 KB");
    }

    #[test]
    fn test_fmt_kb_mb() {
        assert_eq!(fmt_kb(1025), "1 MB");
        assert_eq!(fmt_kb(2048), "2 MB");
        assert_eq!(fmt_kb(1_048_576), "1024 MB");
    }

    #[test]
    fn test_fmt_kb_gb() {
        assert_eq!(fmt_kb(1_048_577), "1.0 GB");
        assert_eq!(fmt_kb(2_097_152), "2.0 GB");
    }

    #[test]
    fn test_fmt_package_count_under_1000() {
        assert_eq!(fmt_package_count(0), "0");
        assert_eq!(fmt_package_count(1), "1");
        assert_eq!(fmt_package_count(999), "999");
    }

    #[test]
    fn test_fmt_package_count_over_1000() {
        assert_eq!(fmt_package_count(1000), "1.0k");
        assert_eq!(fmt_package_count(1500), "1.5k");
        assert_eq!(fmt_package_count(99999), "100.0k");
    }

    #[test]
    fn test_parse_proc_stat_line_normal() {
        // Simulated content: pid (comm) state ...
        // pid=1234, comm=(bash), state=R
        // Format: pid (comm) state ppid pgrp session tty_nr tpgid flags minflt cminflt majflt cmajflt utime stime cutime cstime priority nice num_threads itrealvalue starttime vsize rss rsslim
        let content = "1234 (bash) R 1233 1233 1233 34816 2036 4194308 12345 6789 0 0 100 50 0 0 20 0 1 0 123456 12345678 1234 0";
        let (total_time, state, comm, rss_kb) = parse_proc_stat_line(content).unwrap();
        assert_eq!(total_time, 150);
        assert_eq!(state, 'R');
        assert_eq!(comm, "bash");
        assert_eq!(rss_kb, 4936);
    }

    #[test]
    fn test_parse_proc_stat_line_no_close_paren() {
        assert!(parse_proc_stat_line("1234 (bash R").is_none());
    }

    #[test]
    fn test_parse_proc_stat_line_too_few_fields() {
        let content = "1 (init) S 0 0 0 0 0 0 0 0 0 0";
        assert!(parse_proc_stat_line(content).is_none());
    }

    #[test]
    fn test_parse_proc_stat_line_comm_with_parens() {
        let content =
            "42 (foo(bar)baz) S 0 0 0 0 0 0 0 0 0 0 100 50 0 0 20 0 1 0 0 99999999 42 0 0 0";
        let (total_time, state, comm, rss_kb) = parse_proc_stat_line(content).unwrap();
        assert_eq!(total_time, 150);
        assert_eq!(state, 'S');
        assert_eq!(comm, "foo(bar)baz");
        assert_eq!(rss_kb, 168);
    }

    // ─── set_operation_in_progress / is_operation_in_progress ───

    #[test]
    fn test_operation_in_progress_default() {
        assert!(!is_operation_in_progress());
    }

    #[test]
    fn test_operation_in_progress_set_true() {
        set_operation_in_progress(true);
        assert!(is_operation_in_progress());
        set_operation_in_progress(false);
    }

    #[test]
    fn test_operation_in_progress_toggle() {
        set_operation_in_progress(true);
        assert!(is_operation_in_progress());
        set_operation_in_progress(false);
        assert!(!is_operation_in_progress());
    }

    // ─── fmt_kb edge cases ───

    #[test]
    fn test_fmt_kb_exact_boundaries() {
        assert_eq!(fmt_kb(1024), "1024 KB");
        assert_eq!(fmt_kb(1025), "1 MB");
        assert_eq!(fmt_kb(1_048_576), "1024 MB");
        assert_eq!(fmt_kb(1_048_577), "1.0 GB");
    }

    // ─── fmt_package_count edge cases ───

    #[test]
    fn test_fmt_package_count_exact_1000() {
        assert_eq!(fmt_package_count(1000), "1.0k");
    }

    #[test]
    fn test_fmt_package_count_large() {
        assert_eq!(fmt_package_count(1_234_567), "1234.6k");
    }

    // ─── map_state edge cases ───

    #[test]
    fn test_map_state_all_variants() {
        assert_eq!(map_state('R'), "Exec");
        assert_eq!(map_state('S'), "Sleep");
        assert_eq!(map_state('D'), "Disk");
        assert_eq!(map_state('Z'), "Zomb");
        assert_eq!(map_state('T'), "Stop");
        assert_eq!(map_state('t'), "Stop");
        assert_eq!(map_state('I'), "Idle");
        assert_eq!(map_state('W'), "W");
        assert_eq!(map_state('P'), "P");
        assert_eq!(map_state('?'), "?");
    }

    // ─── get_swap_info parsing ───

    #[test]
    fn test_get_swap_info_zero_total() {
        // When no meminfo, swap should be zero
        let (used, _total, pct) = get_swap_info();
        // This reads from /proc/meminfo so results vary, just ensure it returns
        assert!(!used.is_empty() || used == "0 KB");
        assert!(pct >= 0.0);
    }

    // ─── get_load_average ───

    #[test]
    fn test_get_load_average_format() {
        let la = get_load_average();
        // Should return either "—" or "x.xx y.yy z.zz" format
        if la != "—" {
            let parts: Vec<&str> = la.split_whitespace().collect();
            assert_eq!(parts.len(), 3);
        }
    }

    // ─── get_system_stats struct ───

    #[test]
    fn test_system_stats_default() {
        let s = SystemStats {
            cpu_percent: 0.0,
            temperature: 0.0,
            memory_percent: 0.0,
        };
        assert!((s.cpu_percent - 0.0).abs() < 0.01);
        assert!((s.temperature - 0.0).abs() < 0.01);
        assert!((s.memory_percent - 0.0).abs() < 0.01);
    }

    #[test]
    fn test_system_stats_max_values() {
        let s = SystemStats {
            cpu_percent: 100.0,
            temperature: 100.0,
            memory_percent: 100.0,
        };
        assert!((s.cpu_percent - 100.0).abs() < 0.01);
        assert!((s.memory_percent - 100.0).abs() < 0.01);
    }

    // ─── HomeStats default ───

    #[test]
    fn test_home_stats_default() {
        let h = HomeStats {
            packages_installed: 0,
            packages_formatted: "0".into(),
            updates_available: 0,
            updates_formatted: "—".into(),
            load_average: "—".into(),
            swap_used: "0 KB".into(),
            swap_total: "0 KB".into(),
            swap_percent: 0.0,
            services_active: 0,
        };
        assert_eq!(h.packages_installed, 0);
        assert_eq!(h.updates_available, 0);
        assert_eq!(h.services_active, 0);
    }

    // ─── ProcessInfo edge cases ───

    #[test]
    fn test_process_info_max_values() {
        let p = ProcessInfo {
            pid: u32::MAX,
            name: "max".into(),
            cpu_percent: 100.0,
            mem_percent: 100.0,
            mem_kb: u64::MAX,
            state: "Exec".into(),
            user: "root".into(),
            cmd: "/bin/max".into(),
        };
        assert_eq!(p.pid, u32::MAX);
        assert!((p.cpu_percent - 100.0).abs() < 0.01);
        assert_eq!(p.mem_kb, u64::MAX);
    }

    #[test]
    fn test_process_info_zero_values() {
        let p = ProcessInfo {
            pid: 0,
            name: String::new(),
            cpu_percent: 0.0,
            mem_percent: 0.0,
            mem_kb: 0,
            state: String::new(),
            user: String::new(),
            cmd: String::new(),
        };
        assert_eq!(p.pid, 0);
        assert!(p.name.is_empty());
        assert!((p.cpu_percent - 0.0).abs() < 0.01);
        assert_eq!(p.mem_kb, 0);
        assert!(p.state.is_empty());
        assert!(p.user.is_empty());
    }

    // ─── read_proc_stat error handling ───

    #[test]
    fn test_read_proc_stat_nonexistent() {
        // PID 99999999 should not exist
        let result = read_proc_stat(99999999);
        assert!(result.is_none());
    }

    // ─── get_process_user ───

    #[test]
    fn test_get_process_user_nonexistent() {
        let user = get_process_user(99999999);
        assert_eq!(user, "?");
    }

    // ─── get_temperature ───

    #[test]
    fn test_get_temperature_no_thermal() {
        // Should return 0.0 gracefully even without thermal zones
        let temp = get_temperature();
        assert!(temp >= 0.0);
    }

    // ─── get_memory_percent ───

    #[test]
    fn test_get_memory_percent_range() {
        let pct = get_memory_percent();
        assert!(pct >= 0.0 && pct <= 100.0);
    }
}
