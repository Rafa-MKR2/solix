// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2

use serde::Serialize;
use std::process::Command;

use crate::password;

#[derive(Debug, Serialize)]
pub struct InstalledPackage {
    pub name: String,
    pub version: String,
    pub size: String,
    pub description: String,
}

#[derive(Debug, Serialize)]
pub struct RepoPackage {
    pub name: String,
    pub version: String,
    pub repo: String,
    pub description: String,
}

#[derive(Debug, Serialize)]
pub struct PackageHistoryEntry {
    pub timestamp: String,
    pub action: String,
    pub package_name: String,
    pub version: String,
}

fn detect_pm() -> String {
    // Detect package manager by checking which executables exist
    let pms = ["pacman", "apt", "dnf", "zypper"];
    for pm in &pms {
        if std::path::Path::new("/usr/bin/").join(pm).exists()
            || std::path::Path::new("/usr/sbin/").join(pm).exists()
        {
            return pm.to_string();
        }
    }
    // Fallback: check common locations
    for pm in &pms {
        if std::process::Command::new("which")
            .arg(pm)
            .output()
            .ok()
            .map(|o| o.status.success())
            .unwrap_or(false)
        {
            return pm.to_string();
        }
    }
    "pacman".to_string()
}

fn run_cmd(args: &[&str]) -> Option<String> {
    Command::new(args[0])
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

fn parse_pacman_qi(output: &str) -> std::collections::HashMap<String, (String, String)> {
    let mut map = std::collections::HashMap::new();
    let mut current_name = String::new();
    let mut current_desc = "—".to_string();
    let mut current_size = "—".to_string();

    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() {
            if !current_name.is_empty() {
                map.insert(current_name.clone(), (current_desc.clone(), current_size.clone()));
                current_name.clear();
                current_desc = "—".to_string();
                current_size = "—".to_string();
            }
            continue;
        }
        if let Some((key, val)) = line.split_once(':') {
            let k = key.trim();
            let v = val.trim();
            if k == "Name" { current_name = v.to_string(); }
            else if k == "Description" { current_desc = v.to_string(); }
            else if k == "Installed Size" { current_size = v.to_string(); }
        }
    }
    if !current_name.is_empty() {
        map.insert(current_name, (current_desc, current_size));
    }
    map
}

/// List all installed packages (optimized: batch subprocess calls)
pub fn list_installed() -> Vec<InstalledPackage> {
    let pm = detect_pm();

    match pm.as_str() {
        "pacman" => {
            // Batch: single pacman -Qi call for ALL packages, then look up in HashMap
            let details_map = run_cmd(&["pacman", "-Qi"])
                .map(|out| parse_pacman_qi(&out))
                .unwrap_or_default();

            if let Some(out) = run_cmd(&["pacman", "-Q", "--noconfirm"]) {
                let mut pkgs = Vec::new();
                for line in out.lines() {
                    let line = line.trim();
                    if line.is_empty() { continue; }
                    if let Some((name, version)) = line.split_once(' ') {
                        let name = name.to_string();
                        let (desc, size) = details_map.get(&name)
                            .map(|(d, s)| (d.clone(), s.clone()))
                            .unwrap_or(("—".to_string(), "—".to_string()));
                        pkgs.push(InstalledPackage {
                            name,
                            version: version.to_string(),
                            size,
                            description: desc,
                        });
                    }
                }
                return pkgs;
            }
        },
        "apt" => {
            // Single dpkg-query call with all fields
            if let Some(out) = run_cmd(&["dpkg-query", "-W", "-f", "${Package}\t${Version}\t${Installed-Size}\t${Description}\n"]) {
                let mut pkgs = Vec::new();
                for line in out.lines() {
                    let line = line.trim();
                    if line.is_empty() { continue; }
                    let parts: Vec<&str> = line.splitn(4, '\t').collect();
                    if parts.len() >= 2 {
                        let name = parts[0].to_string();
                        let version = parts[1].to_string();
                        let size = if parts.len() >= 3 {
                            let kb: u64 = parts[2].parse().unwrap_or(0);
                            if kb > 1024 { format!("{:.1} MB", kb as f64 / 1024.0) } else { format!("{} kB", kb) }
                        } else { "—".to_string() };
                        let desc = parts.get(3).unwrap_or(&"—").to_string();
                        pkgs.push(InstalledPackage { name, version, size, description: desc });
                    }
                }
                return pkgs;
            }
        },
        "dnf" | "zypper" => {
            // Single rpm query with all fields
            if let Some(out) = run_cmd(&["rpm", "-qa", "--queryformat", "%{NAME}\t%{VERSION}\t%{SIZE}\t%{SUMMARY}\n"]) {
                let mut pkgs = Vec::new();
                for line in out.lines() {
                    let line = line.trim();
                    if line.is_empty() { continue; }
                    let parts: Vec<&str> = line.splitn(4, '\t').collect();
                    if parts.len() >= 2 {
                        let name = parts[0].to_string();
                        let version = parts[1].to_string();
                        let size = if parts.len() >= 3 {
                            let bytes: u64 = parts[2].parse().unwrap_or(0);
                            if bytes > 1_048_576 { format!("{:.1} MB", bytes as f64 / 1_048_576.0) }
                            else if bytes > 1024 { format!("{:.0} KB", bytes as f64 / 1024.0) }
                            else { format!("{} B", bytes) }
                        } else { "—".to_string() };
                        let desc = parts.get(3).unwrap_or(&"—").to_string();
                        pkgs.push(InstalledPackage { name, version, size, description: desc });
                    }
                }
                return pkgs;
            }
        },
        _ => {},
    }
    vec![]
}

/// Search packages in repositories
pub fn search_repos(query: &str) -> Vec<RepoPackage> {
    let pm = detect_pm();

    match pm.as_str() {
        "pacman" => {
            if let Some(out) = run_cmd(&["pacman", "-Ss", query]) {
                let mut pkgs = Vec::new();
                let lines: Vec<&str> = out.lines().collect();
                let mut i = 0;
                while i < lines.len() {
                    let line = lines[i].trim();
                    if line.is_empty() { i += 1; continue; }
                    // First line: "repo/name version"
                    let _ = line.strip_suffix(' ');
                    if let Some((repo_name, rest)) = line.split_once('/') {
                        let repo = repo_name.to_string();
                        if let Some((name, version)) = rest.split_once(' ') {
                            let version = version.trim().to_string();
                            // Second line is description (if not empty)
                            let desc = if i + 1 < lines.len() {
                                lines[i + 1].trim().to_string()
                            } else {
                                String::new()
                            };
                            pkgs.push(RepoPackage {
                                name: name.to_string(),
                                version,
                                repo,
                                description: desc.clone(),
                            });
                            // Skip the description line
                            if !desc.is_empty() { i += 1; }
                        }
                    }
                    i += 1;
                }
                return pkgs;
            }
        },
        "apt" => {
            if let Some(out) = run_cmd(&["apt-cache", "search", query]) {
                let mut pkgs = Vec::new();
                for line in out.lines() {
                    let line = line.trim();
                    if line.is_empty() { continue; }
                    // Format: "name - description"
                    if let Some((name, desc)) = line.split_once(" - ") {
                        // Get version from apt-cache show
                        let version = get_repo_version("apt", name).unwrap_or_else(|| "—".to_string());
                        pkgs.push(RepoPackage {
                            name: name.to_string(),
                            version,
                            repo: "apt".to_string(),
                            description: desc.to_string(),
                        });
                    }
                }
                return pkgs;
            }
        },
        "dnf" => {
            if let Some(out) = run_cmd(&["dnf", "search", query]) {
                let mut pkgs = Vec::new();
                for line in out.lines() {
                    let line = line.trim();
                    if line.is_empty() || line.contains("Last metadata") || line.contains("====") {
                        continue;
                    }
                    if let Some((rest, _desc)) = line.split_once(" : ") {
                        if let Some(name) = rest.split_whitespace().next() {
                            let name = name.trim_end_matches('.');
                            let version = get_repo_version("dnf", name).unwrap_or_else(|| "—".to_string());
                            pkgs.push(RepoPackage {
                                name: name.to_string(),
                                version,
                                repo: "dnf".to_string(),
                                description: "—".to_string(),
                            });
                        }
                    }
                }
                return pkgs;
            }
        },
        "zypper" => {
            if let Some(out) = run_cmd(&["zypper", "search", query]) {
                let mut pkgs = Vec::new();
                for line in out.lines() {
                    let line = line.trim();
                    if line.is_empty() || line.contains('|') || line.contains("---") || line.contains("Loading") || line.contains("S |") {
                        continue;
                    }
                    // Last column is name
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if let Some(&name) = parts.last() {
                        let version = get_repo_version("zypper", name).unwrap_or_else(|| "—".to_string());
                        pkgs.push(RepoPackage {
                            name: name.to_string(),
                            version,
                            repo: "zypper".to_string(),
                            description: "—".to_string(),
                        });
                    }
                }
                return pkgs;
            }
        },
        _ => {},
    }
    vec![]
}

fn get_repo_version(pm: &str, pkg: &str) -> Option<String> {
    match pm {
        "pacman" => {
            run_cmd(&["pacman", "-Si", pkg]).and_then(|out| {
                out.lines()
                    .find(|l| l.trim().starts_with("Version"))
                    .and_then(|l| l.split_once(':'))
                    .map(|(_, v)| v.trim().to_string())
            })
        },
        "apt" => {
            run_cmd(&["apt-cache", "show", pkg]).and_then(|out| {
                out.lines()
                    .find(|l| l.trim().starts_with("Version"))
                    .and_then(|l| l.split_once(':'))
                    .map(|(_, v)| v.trim().to_string())
            })
        },
        "dnf" | "zypper" => {
            run_cmd(&[pm, "info", pkg]).and_then(|out| {
                out.lines()
                    .find(|l| {
                        let t = l.trim();
                        t.starts_with("Version") || t.starts_with("Versão")
                    })
                    .and_then(|l| l.split_once(':'))
                    .map(|(_, v)| v.trim().to_string())
            })
        },
        _ => None,
    }
}

/// Get package operation history
pub fn get_history() -> Vec<PackageHistoryEntry> {
    let pm = detect_pm();
    let mut entries = Vec::new();

    match pm.as_str() {
        "pacman" => {
            if let Ok(content) = std::fs::read_to_string("/var/log/pacman.log") {
                for line in content.lines().rev().take(100) {
                    // Format: "[2025-07-29T12:00:00-0300] [ALPM] installed firefox (123.0)"
                    if let Some(rest) = line.strip_suffix(')') {
                        if let Some((date_part, action_part)) = rest.split_once("] [ALPM] ") {
                            let timestamp = date_part.trim_start_matches('[').to_string();
                            if let Some((action, rest2)) = action_part.split_once(' ') {
                                let action = action.to_string();
                                if let Some((pkg_name, pkg_ver)) = rest2.rsplit_once(" (") {
                                    entries.push(PackageHistoryEntry {
                                        timestamp: timestamp[..19].to_string(),
                                        action: if action == "installed" { "install".into() }
                                                else if action == "removed" { "remove".into() }
                                                else { action.clone() },
                                        package_name: pkg_name.to_string(),
                                        version: pkg_ver.to_string(),
                                    });
                                }
                            }
                        }
                    }
                    if entries.len() >= 50 { break; }
                }
            }
        },
        "apt" => {
            if let Ok(content) = std::fs::read_to_string("/var/log/dpkg.log") {
                for line in content.lines().rev().take(100) {
                    // Format: "2025-07-29 12:00:00 install firefox <version>"
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 4 {
                        let timestamp = format!("{} {}", parts[0], parts[1]);
                        let action = parts[2].to_string();
                        let pkg_name = parts[3].trim_end_matches(':').to_string();
                        let version = parts.get(4).unwrap_or(&"?").to_string();
                        entries.push(PackageHistoryEntry {
                            timestamp: timestamp[..19].to_string(),
                            action: if action == "install" { "install".into() }
                                    else if action == "remove" { "remove".into() }
                                    else { action.clone() },
                            package_name: pkg_name,
                            version,
                        });
                    }
                    if entries.len() >= 50 { break; }
                }
            }
        },
        "dnf" => {
            if let Some(out) = run_cmd(&["dnf", "history", "list"]) {
                for line in out.lines().rev().take(50) {
                    let line = line.trim();
                    if line.is_empty() || line.starts_with("ID") || line.contains("──") {
                        continue;
                    }
                    // Try to extract: "ID | action | time"
                    let parts: Vec<&str> = line.split('|').collect();
                    if parts.len() >= 3 {
                        let action = parts[1].trim().to_string();
                        entries.push(PackageHistoryEntry {
                            timestamp: parts[2].trim().to_string(),
                            action,
                            package_name: String::new(),
                            version: String::new(),
                        });
                    }
                }
            }
        },
        _ => {},
    }

    entries
}

/// Remove a system package
pub async fn remove_system_package(password: &str, package_name: &str) -> Result<String, String> {
    password::verify_password(password).await?;

    let pm = detect_pm();
    let remove_cmd = match pm.as_str() {
        "pacman" => format!("sudo -S pacman -R --noconfirm {}", package_name),
        "apt" => format!("sudo -S apt remove -y {}", package_name),
        "dnf" => format!("sudo -S dnf remove -y {}", package_name),
        "zypper" => format!("sudo -S zypper remove -y {}", package_name),
        _ => return Err("Gerenciador de pacotes não suportado".to_string()),
    };

    let output = tokio::process::Command::new("sh")
        .arg("-c")
        .arg(&remove_cmd)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn();

    match output {
        Ok(mut child) => {
            // Pipe password
            if let Some(stdin) = child.stdin.as_mut() {
                use tokio::io::AsyncWriteExt;
                let _ = stdin.write_all(format!("{}\n", password).as_bytes()).await;
            }
            let result = child.wait_with_output().await;
            match result {
                Ok(out) => {
                    let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                    let stderr = String::from_utf8_lossy(&out.stderr).to_string();
                    if out.status.success() {
                        Ok(stdout)
                    } else {
                        Err(stderr)
                    }
                },
                Err(e) => Err(format!("Erro ao executar: {}", e)),
            }
        },
        Err(e) => Err(format!("Erro ao iniciar: {}", e)),
    }
}

/// Install a package from repository
pub async fn install_repo_package(password: &str, package_name: &str) -> Result<String, String> {
    password::verify_password(password).await?;

    let pm = detect_pm();
    let install_cmd = match pm.as_str() {
        "pacman" => format!("sudo -S pacman -S --noconfirm {}", package_name),
        "apt" => format!("sudo -S apt install -y {}", package_name),
        "dnf" => format!("sudo -S dnf install -y {}", package_name),
        "zypper" => format!("sudo -S zypper install -y {}", package_name),
        _ => return Err("Gerenciador de pacotes não suportado".to_string()),
    };

    let output = tokio::process::Command::new("sh")
        .arg("-c")
        .arg(&install_cmd)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn();

    match output {
        Ok(mut child) => {
            if let Some(stdin) = child.stdin.as_mut() {
                use tokio::io::AsyncWriteExt;
                let _ = stdin.write_all(format!("{}\n", password).as_bytes()).await;
            }
            let result = child.wait_with_output().await;
            match result {
                Ok(out) => {
                    let stdout = String::from_utf8_lossy(&out.stdout).to_string();
                    let stderr = String::from_utf8_lossy(&out.stderr).to_string();
                    if out.status.success() {
                        Ok(stdout)
                    } else {
                        Err(stderr)
                    }
                },
                Err(e) => Err(format!("Erro ao executar: {}", e)),
            }
        },
        Err(e) => Err(format!("Erro ao iniciar: {}", e)),
    }
}

/// Remove multiple system packages
pub async fn remove_system_packages(password: &str, package_names: &[String]) -> Result<Vec<String>, String> {
    let mut results = Vec::new();
    for name in package_names {
        match remove_system_package(password, name).await {
            Ok(out) => results.push(format!("{}: ok — {}", name, out.lines().next().unwrap_or(""))),
            Err(e) => results.push(format!("{}: falhou — {}", name, e)),
        }
    }
    Ok(results)
}

/// Install multiple packages from repository
pub async fn install_repo_packages(password: &str, package_names: &[String]) -> Result<Vec<String>, String> {
    let mut results = Vec::new();
    for name in package_names {
        match install_repo_package(password, name).await {
            Ok(out) => results.push(format!("{}: ok — {}", name, out.lines().next().unwrap_or(""))),
            Err(e) => results.push(format!("{}: falhou — {}", name, e)),
        }
    }
    Ok(results)
}
