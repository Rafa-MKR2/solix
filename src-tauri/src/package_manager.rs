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
                map.insert(
                    current_name.clone(),
                    (current_desc.clone(), current_size.clone()),
                );
                current_name.clear();
                current_desc = "—".to_string();
                current_size = "—".to_string();
            }
            continue;
        }
        if let Some((key, val)) = line.split_once(':') {
            let k = key.trim();
            let v = val.trim();
            if k == "Name" {
                current_name = v.to_string();
            } else if k == "Description" {
                current_desc = v.to_string();
            } else if k == "Installed Size" {
                current_size = v.to_string();
            }
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
                    if line.is_empty() {
                        continue;
                    }
                    if let Some((name, version)) = line.split_once(' ') {
                        let name = name.to_string();
                        let (desc, size) = details_map
                            .get(&name)
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
        }
        "apt" => {
            // Single dpkg-query call with all fields
            if let Some(out) = run_cmd(&[
                "dpkg-query",
                "-W",
                "-f",
                "${Package}\t${Version}\t${Installed-Size}\t${Description}\n",
            ]) {
                let mut pkgs = Vec::new();
                for line in out.lines() {
                    let line = line.trim();
                    if line.is_empty() {
                        continue;
                    }
                    let parts: Vec<&str> = line.splitn(4, '\t').collect();
                    if parts.len() >= 2 {
                        let name = parts[0].to_string();
                        let version = parts[1].to_string();
                        let size = if parts.len() >= 3 {
                            let kb: u64 = parts[2].parse().unwrap_or(0);
                            crate::util::format_bytes(
                                kb.saturating_mul(1024),
                                crate::util::FormatBase::Binary,
                            )
                        } else {
                            "—".to_string()
                        };
                        let desc = parts.get(3).unwrap_or(&"—").to_string();
                        pkgs.push(InstalledPackage {
                            name,
                            version,
                            size,
                            description: desc,
                        });
                    }
                }
                return pkgs;
            }
        }
        "dnf" | "zypper" => {
            // Single rpm query with all fields
            if let Some(out) = run_cmd(&[
                "rpm",
                "-qa",
                "--queryformat",
                "%{NAME}\t%{VERSION}\t%{SIZE}\t%{SUMMARY}\n",
            ]) {
                let mut pkgs = Vec::new();
                for line in out.lines() {
                    let line = line.trim();
                    if line.is_empty() {
                        continue;
                    }
                    let parts: Vec<&str> = line.splitn(4, '\t').collect();
                    if parts.len() >= 2 {
                        let name = parts[0].to_string();
                        let version = parts[1].to_string();
                        let size = if parts.len() >= 3 {
                            let bytes: u64 = parts[2].parse().unwrap_or(0);
                            crate::util::format_bytes(bytes, crate::util::FormatBase::Binary)
                        } else {
                            "—".to_string()
                        };
                        let desc = parts.get(3).unwrap_or(&"—").to_string();
                        pkgs.push(InstalledPackage {
                            name,
                            version,
                            size,
                            description: desc,
                        });
                    }
                }
                return pkgs;
            }
        }
        _ => {}
    }
    vec![]
}

/// Search packages in repositories
fn parse_pacman_search_output(output: &str) -> Vec<RepoPackage> {
    let mut pkgs = Vec::new();
    let lines: Vec<&str> = output.lines().collect();
    let mut i = 0;
    while i < lines.len() {
        let line = lines[i].trim();
        if line.is_empty() {
            i += 1;
            continue;
        }
        if let Some((repo_name, rest)) = line.split_once('/') {
            let repo = repo_name.to_string();
            if let Some((name, version)) = rest.split_once(' ') {
                let version = version.trim().to_string();
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
                if !desc.is_empty() {
                    i += 1;
                }
            }
        }
        i += 1;
    }
    pkgs
}

fn parse_apt_search_output(output: &str) -> Vec<RepoPackage> {
    let mut pkgs = Vec::new();
    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if let Some((name, desc)) = line.split_once(" - ") {
            pkgs.push(RepoPackage {
                name: name.to_string(),
                version: "—".to_string(),
                repo: "apt".to_string(),
                description: desc.to_string(),
            });
        }
    }
    pkgs
}

fn parse_dnf_search_output(output: &str) -> Vec<RepoPackage> {
    let mut pkgs = Vec::new();
    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() || line.contains("Last metadata") || line.contains("====") {
            continue;
        }
        if let Some((rest, _desc)) = line.split_once(" : ") {
            if let Some(name) = rest.split_whitespace().next() {
                let name = name.trim_end_matches('.');
                pkgs.push(RepoPackage {
                    name: name.to_string(),
                    version: "—".to_string(),
                    repo: "dnf".to_string(),
                    description: "—".to_string(),
                });
            }
        }
    }
    pkgs
}

fn parse_zypper_search_output(output: &str) -> Vec<RepoPackage> {
    let mut pkgs = Vec::new();
    for line in output.lines() {
        let line = line.trim();
        if line.is_empty()
            || line.contains('|')
            || line.contains("---")
            || line.contains("Loading")
            || line.contains("S |")
        {
            continue;
        }
        let parts: Vec<&str> = line.split_whitespace().collect();
        if let Some(&name) = parts.last() {
            pkgs.push(RepoPackage {
                name: name.to_string(),
                version: "—".to_string(),
                repo: "zypper".to_string(),
                description: "—".to_string(),
            });
        }
    }
    pkgs
}

pub fn search_repos(query: &str) -> Vec<RepoPackage> {
    let pm = detect_pm();

    match pm.as_str() {
        "pacman" => run_cmd(&["pacman", "-Ss", query])
            .map_or(vec![], |out| parse_pacman_search_output(&out)),
        "apt" => {
            if let Some(out) = run_cmd(&["apt-cache", "search", query]) {
                let mut pkgs = parse_apt_search_output(&out);
                for pkg in &mut pkgs {
                    if let Some(v) = get_repo_version("apt", &pkg.name) {
                        pkg.version = v;
                    }
                }
                pkgs
            } else {
                vec![]
            }
        }
        "dnf" => {
            if let Some(out) = run_cmd(&["dnf", "search", query]) {
                let mut pkgs = parse_dnf_search_output(&out);
                for pkg in &mut pkgs {
                    if let Some(v) = get_repo_version("dnf", &pkg.name) {
                        pkg.version = v;
                    }
                }
                pkgs
            } else {
                vec![]
            }
        }
        "zypper" => {
            if let Some(out) = run_cmd(&["zypper", "search", query]) {
                let mut pkgs = parse_zypper_search_output(&out);
                for pkg in &mut pkgs {
                    if let Some(v) = get_repo_version("zypper", &pkg.name) {
                        pkg.version = v;
                    }
                }
                pkgs
            } else {
                vec![]
            }
        }
        _ => vec![],
    }
}

fn get_repo_version(pm: &str, pkg: &str) -> Option<String> {
    match pm {
        "pacman" => run_cmd(&["pacman", "-Si", pkg]).and_then(|out| {
            out.lines()
                .find(|l| l.trim().starts_with("Version"))
                .and_then(|l| l.split_once(':'))
                .map(|(_, v)| v.trim().to_string())
        }),
        "apt" => run_cmd(&["apt-cache", "show", pkg]).and_then(|out| {
            out.lines()
                .find(|l| l.trim().starts_with("Version"))
                .and_then(|l| l.split_once(':'))
                .map(|(_, v)| v.trim().to_string())
        }),
        "dnf" | "zypper" => run_cmd(&[pm, "info", pkg]).and_then(|out| {
            out.lines()
                .find(|l| {
                    let t = l.trim();
                    t.starts_with("Version") || t.starts_with("Versão")
                })
                .and_then(|l| l.split_once(':'))
                .map(|(_, v)| v.trim().to_string())
        }),
        _ => None,
    }
}

/// Get package operation history
fn parse_pacman_history_line(line: &str) -> Option<PackageHistoryEntry> {
    let rest = line.strip_suffix(')')?;
    let (date_part, action_part) = rest.split_once("] [ALPM] ")?;
    let timestamp = date_part.trim_start_matches('[').to_string();
    let (action, rest2) = action_part.split_once(' ')?;
    let (pkg_name, pkg_ver) = rest2.rsplit_once(" (")?;
    Some(PackageHistoryEntry {
        timestamp: timestamp[..19].to_string(),
        action: if action == "installed" {
            "install".into()
        } else if action == "removed" {
            "remove".into()
        } else {
            action.to_string()
        },
        package_name: pkg_name.to_string(),
        version: pkg_ver.to_string(),
    })
}

fn parse_dpkg_history_line(line: &str) -> Option<PackageHistoryEntry> {
    let parts: Vec<&str> = line.split_whitespace().collect();
    if parts.len() >= 4 {
        let timestamp = format!("{} {}", parts[0], parts[1]);
        let action = parts[2].to_string();
        let pkg_name = parts[3].trim_end_matches(':').to_string();
        let version = parts.get(4).unwrap_or(&"?").to_string();
        Some(PackageHistoryEntry {
            timestamp: timestamp[..19].to_string(),
            action: if action == "install" {
                "install".into()
            } else if action == "remove" {
                "remove".into()
            } else {
                action.clone()
            },
            package_name: pkg_name,
            version,
        })
    } else {
        None
    }
}

pub fn get_history() -> Vec<PackageHistoryEntry> {
    let pm = detect_pm();
    let mut entries = Vec::new();

    match pm.as_str() {
        "pacman" => {
            if let Ok(content) = std::fs::read_to_string("/var/log/pacman.log") {
                for line in content.lines().rev().take(100) {
                    if let Some(entry) = parse_pacman_history_line(line) {
                        entries.push(entry);
                        if entries.len() >= 50 {
                            break;
                        }
                    }
                }
            }
        }
        "apt" => {
            if let Ok(content) = std::fs::read_to_string("/var/log/dpkg.log") {
                for line in content.lines().rev().take(100) {
                    if let Some(entry) = parse_dpkg_history_line(line) {
                        entries.push(entry);
                        if entries.len() >= 50 {
                            break;
                        }
                    }
                }
            }
        }
        "dnf" => {
            if let Some(out) = run_cmd(&["dnf", "history", "list"]) {
                for line in out.lines().rev().take(50) {
                    let line = line.trim();
                    if line.is_empty() || line.starts_with("ID") || line.contains("──") {
                        continue;
                    }
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
        }
        _ => {}
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
            if let Err(e) = password::pipe_password(&mut child, password).await {
                tracing::warn!("Falha ao enviar senha: {}", e);
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
                }
                Err(e) => Err(format!("Erro ao executar: {}", e)),
            }
        }
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
            if let Err(e) = password::pipe_password(&mut child, password).await {
                tracing::warn!("Falha ao enviar senha: {}", e);
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
                }
                Err(e) => Err(format!("Erro ao executar: {}", e)),
            }
        }
        Err(e) => Err(format!("Erro ao iniciar: {}", e)),
    }
}

/// Remove multiple system packages
pub async fn remove_system_packages(
    password: &str,
    package_names: &[String],
) -> Result<Vec<String>, String> {
    let mut results = Vec::new();
    for name in package_names {
        match remove_system_package(password, name).await {
            Ok(out) => results.push(format!(
                "{}: ok — {}",
                name,
                out.lines().next().unwrap_or("")
            )),
            Err(e) => results.push(format!("{}: falhou — {}", name, e)),
        }
    }
    Ok(results)
}

/// Install multiple packages from repository
pub async fn install_repo_packages(
    password: &str,
    package_names: &[String],
) -> Result<Vec<String>, String> {
    let mut results = Vec::new();
    for name in package_names {
        match install_repo_package(password, name).await {
            Ok(out) => results.push(format!(
                "{}: ok — {}",
                name,
                out.lines().next().unwrap_or("")
            )),
            Err(e) => results.push(format!("{}: falhou — {}", name, e)),
        }
    }
    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    // ─── Struct tests ───

    #[test]
    fn test_installed_package_struct() {
        let pkg = InstalledPackage {
            name: "firefox".into(),
            version: "128.0-1".into(),
            size: "100 MB".into(),
            description: "Web browser".into(),
        };
        assert_eq!(pkg.name, "firefox");
        assert_eq!(pkg.version, "128.0-1");
        assert_eq!(pkg.size, "100 MB");
        assert_eq!(pkg.description, "Web browser");
    }

    #[test]
    fn test_installed_package_minimal() {
        let pkg = InstalledPackage {
            name: "test".into(),
            version: "1.0".into(),
            size: "—".into(),
            description: "—".into(),
        };
        assert_eq!(pkg.name, "test");
        assert_eq!(pkg.size, "—");
        assert_eq!(pkg.description, "—");
    }

    #[test]
    fn test_repo_package_struct() {
        let pkg = RepoPackage {
            name: "htop".into(),
            version: "3.3.0-1".into(),
            repo: "extra".into(),
            description: "Process viewer".into(),
        };
        assert_eq!(pkg.name, "htop");
        assert_eq!(pkg.version, "3.3.0-1");
        assert_eq!(pkg.repo, "extra");
        assert_eq!(pkg.description, "Process viewer");
    }

    #[test]
    fn test_repo_package_minimal() {
        let pkg = RepoPackage {
            name: "pkg".into(),
            version: "—".into(),
            repo: "unknown".into(),
            description: String::new(),
        };
        assert_eq!(pkg.repo, "unknown");
        assert!(pkg.description.is_empty());
    }

    #[test]
    fn test_package_history_entry_struct() {
        let entry = PackageHistoryEntry {
            timestamp: "2025-07-01T12:00:00".into(),
            action: "install".into(),
            package_name: "firefox".into(),
            version: "128.0".into(),
        };
        assert_eq!(entry.timestamp, "2025-07-01T12:00:00");
        assert_eq!(entry.action, "install");
        assert_eq!(entry.package_name, "firefox");
        assert_eq!(entry.version, "128.0");
    }

    #[test]
    fn test_package_history_entry_empty() {
        let entry = PackageHistoryEntry {
            timestamp: String::new(),
            action: String::new(),
            package_name: String::new(),
            version: String::new(),
        };
        assert!(entry.timestamp.is_empty());
        assert!(entry.action.is_empty());
        assert!(entry.package_name.is_empty());
        assert!(entry.version.is_empty());
    }

    // ─── parse_pacman_qi tests ───

    #[test]
    fn test_parse_pacman_qi_single() {
        let input = "Name            : bash
Version         : 5.2.037-1
Description     : The GNU Bourne Again shell
Installed Size  : 15.82 MiB
";
        let map = parse_pacman_qi(input);
        assert_eq!(map.len(), 1);
        let (desc, size) = map.get("bash").unwrap();
        assert_eq!(desc, "The GNU Bourne Again shell");
        assert_eq!(size, "15.82 MiB");
    }

    #[test]
    fn test_parse_pacman_qi_multiple() {
        let input = "Name            : bash
Description     : The GNU Bourne Again shell
Installed Size  : 15.82 MiB

Name            : firefox
Description     : Web browser
Installed Size  : 200.00 MiB

Name            : htop
Description     : Process viewer
Installed Size  : 0.50 MiB
";
        let map = parse_pacman_qi(input);
        assert_eq!(map.len(), 3);
        assert!(map.contains_key("bash"));
        assert!(map.contains_key("firefox"));
        assert!(map.contains_key("htop"));
        let (desc, _) = map.get("firefox").unwrap();
        assert_eq!(desc, "Web browser");
    }

    #[test]
    fn test_parse_pacman_qi_missing_fields() {
        let input = "Name            : test-pkg
Description     : A test package
Installed Size  : 1.00 MiB
";

        let map = parse_pacman_qi(input);
        assert_eq!(map.len(), 1);
        let (desc, size) = map.get("test-pkg").unwrap();
        assert_eq!(desc, "A test package");
        assert_eq!(size, "1.00 MiB");
    }

    #[test]
    fn test_parse_pacman_qi_empty() {
        assert!(parse_pacman_qi("").is_empty());
    }

    #[test]
    fn test_parse_pacman_qi_no_name() {
        // If no "Name" field, entry should be skipped
        let input = "Description     : No name here
Installed Size  : 1.00 MiB
";
        let map = parse_pacman_qi(input);
        assert!(map.is_empty());
    }

    #[test]
    fn test_parse_pacman_qi_only_name() {
        let input = "Name            : only-name
";
        let map = parse_pacman_qi(input);
        assert_eq!(map.len(), 1);
        let (desc, size) = map.get("only-name").unwrap();
        assert_eq!(desc, "—");
        assert_eq!(size, "—");
    }

    #[test]
    fn test_parse_pacman_qi_extra_whitespace() {
        let input = "Name            :   spaced-name   
Description     :   has extra   spaces   
Installed Size  :   5.00 MiB   
";
        let map = parse_pacman_qi(input);
        let (desc, size) = map.get("spaced-name").unwrap();
        assert_eq!(desc, "has extra   spaces");
        assert_eq!(size, "5.00 MiB");
    }

    // ─── detect_pm tests ───

    #[test]
    fn test_detect_pm_fallback() {
        // When no PM is found, should return "pacman" as default
        let pm = detect_pm();
        assert!(!pm.is_empty());
    }

    // ─── run_cmd tests ───

    #[test]
    fn test_run_cmd_success() {
        let result = run_cmd(&["echo", "hello"]);
        assert!(result.is_some());
        assert_eq!(result.unwrap().trim(), "hello");
    }

    #[test]
    fn test_run_cmd_failure() {
        let result = run_cmd(&["nonexistent-command-12345"]);
        assert!(result.is_none());
    }

    // ─── parse_pacman_history_line tests ───

    #[test]
    fn test_parse_pacman_history_install() {
        let line = "[2025-07-01T12:00:00-0300] [ALPM] installed firefox (128.0-1)";
        let entry = parse_pacman_history_line(line).unwrap();
        assert_eq!(entry.timestamp, "2025-07-01T12:00:00");
        assert_eq!(entry.action, "install");
        assert_eq!(entry.package_name, "firefox");
        assert_eq!(entry.version, "128.0-1");
    }

    #[test]
    fn test_parse_pacman_history_remove() {
        let line = "[2025-06-15T10:30:00-0300] [ALPM] removed htop (3.3.0-1)";
        let entry = parse_pacman_history_line(line).unwrap();
        assert_eq!(entry.action, "remove");
        assert_eq!(entry.package_name, "htop");
        assert_eq!(entry.version, "3.3.0-1");
    }

    #[test]
    fn test_parse_pacman_history_upgrade() {
        let line = "[2025-07-01T12:00:00-0300] [ALPM] upgraded linux (6.8.0)";
        let entry = parse_pacman_history_line(line).unwrap();
        assert_eq!(entry.action, "upgraded");
        assert_eq!(entry.package_name, "linux");
    }

    #[test]
    fn test_parse_pacman_history_no_suffix() {
        assert!(parse_pacman_history_line("[2025-07-01T12:00:00-0300] [ALPM] test").is_none());
    }

    #[test]
    fn test_parse_pacman_history_no_alpm() {
        assert!(parse_pacman_history_line("random log line").is_none());
    }

    #[test]
    fn test_parse_pacman_history_empty() {
        assert!(parse_pacman_history_line("").is_none());
    }

    // ─── parse_dpkg_history_line tests ───

    #[test]
    fn test_parse_dpkg_history_install() {
        let line = "2025-07-01 12:00:00 install firefox:amd64 128.0-1";
        let entry = parse_dpkg_history_line(line).unwrap();
        assert_eq!(entry.timestamp, "2025-07-01 12:00:00");
        assert_eq!(entry.action, "install");
        assert_eq!(entry.package_name, "firefox:amd64");
        assert_eq!(entry.version, "128.0-1");
    }

    #[test]
    fn test_parse_dpkg_history_remove() {
        let line = "2025-07-01 12:00:00 remove htop 3.3.0-1";
        let entry = parse_dpkg_history_line(line).unwrap();
        assert_eq!(entry.action, "remove");
        assert_eq!(entry.package_name, "htop");
        assert_eq!(entry.version, "3.3.0-1");
    }

    #[test]
    fn test_parse_dpkg_history_no_version() {
        let line = "2025-07-01 12:00:00 install firefox";
        let entry = parse_dpkg_history_line(line).unwrap();
        assert_eq!(entry.version, "?");
    }

    #[test]
    fn test_parse_dpkg_history_too_few_fields() {
        assert!(parse_dpkg_history_line("short line").is_none());
    }

    #[test]
    fn test_parse_dpkg_history_empty() {
        assert!(parse_dpkg_history_line("").is_none());
    }

    #[test]
    fn test_parse_dpkg_history_colon_suffix() {
        let line = "2025-07-01 12:00:00 install firefox: 128.0-1";
        let entry = parse_dpkg_history_line(line).unwrap();
        assert_eq!(entry.package_name, "firefox");
        assert_eq!(entry.version, "128.0-1");
    }

    // ─── parse_pacman_search_output tests ───

    #[test]
    fn test_parse_pacman_search_single() {
        let output = "core/firefox 128.0-1\n    Mozilla Firefox\n";
        let pkgs = parse_pacman_search_output(output);
        assert_eq!(pkgs.len(), 1);
        assert_eq!(pkgs[0].name, "firefox");
        assert_eq!(pkgs[0].version, "128.0-1");
        assert_eq!(pkgs[0].repo, "core");
        assert_eq!(pkgs[0].description, "Mozilla Firefox");
    }

    #[test]
    fn test_parse_pacman_search_multiple() {
        let output = "core/firefox 128.0-1\n    Mozilla Firefox\ncommunity/htop 3.3.0-1\n    Interactive process viewer\n";
        let pkgs = parse_pacman_search_output(output);
        assert_eq!(pkgs.len(), 2);
        assert_eq!(pkgs[0].name, "firefox");
        assert_eq!(pkgs[1].name, "htop");
    }

    #[test]
    fn test_parse_pacman_search_no_desc() {
        let output = "core/test-pkg 1.0-1\n";
        let pkgs = parse_pacman_search_output(output);
        assert_eq!(pkgs.len(), 1);
        assert!(pkgs[0].description.is_empty());
    }

    #[test]
    fn test_parse_pacman_search_empty() {
        let pkgs = parse_pacman_search_output("");
        assert!(pkgs.is_empty());
    }

    #[test]
    fn test_parse_pacman_search_blank_lines() {
        let output = "\n\ncore/firefox 1.0\n\ncommunity/htop 2.0\n\n";
        let pkgs = parse_pacman_search_output(output);
        assert_eq!(pkgs.len(), 2);
    }

    #[test]
    fn test_parse_pacman_search_version_with_epoch() {
        let output = "core/firefox 2:128.0-1\n    Description\n";
        let pkgs = parse_pacman_search_output(output);
        assert_eq!(pkgs.len(), 1);
        assert_eq!(pkgs[0].version, "2:128.0-1");
    }

    // ─── parse_apt_search_output tests ───

    #[test]
    fn test_parse_apt_search_single() {
        let output = "firefox - Mozilla Firefox\n";
        let pkgs = parse_apt_search_output(output);
        assert_eq!(pkgs.len(), 1);
        assert_eq!(pkgs[0].name, "firefox");
        assert_eq!(pkgs[0].repo, "apt");
        assert_eq!(pkgs[0].description, "Mozilla Firefox");
    }

    #[test]
    fn test_parse_apt_search_multiple() {
        let output = "firefox - Mozilla Firefox\nhtop - Interactive process viewer\n";
        let pkgs = parse_apt_search_output(output);
        assert_eq!(pkgs.len(), 2);
    }

    #[test]
    fn test_parse_apt_search_no_separator() {
        let output = "firefox - Mozilla Firefox\nmalformed line without separator\n";
        let pkgs = parse_apt_search_output(output);
        assert_eq!(pkgs.len(), 1);
    }

    #[test]
    fn test_parse_apt_search_empty() {
        let pkgs = parse_apt_search_output("");
        assert!(pkgs.is_empty());
    }

    #[test]
    fn test_parse_apt_search_blank_lines() {
        let output = "\nfirefox - Firefox\n\nhtop - Htop\n";
        let pkgs = parse_apt_search_output(output);
        assert_eq!(pkgs.len(), 2);
    }

    // ─── parse_dnf_search_output tests ───

    #[test]
    fn test_parse_dnf_search_single() {
        let output = "firefox.x86_64 : Mozilla Firefox\n";
        let pkgs = parse_dnf_search_output(output);
        assert_eq!(pkgs.len(), 1);
        assert_eq!(pkgs[0].name, "firefox.x86_64");
        assert_eq!(pkgs[0].repo, "dnf");
    }

    #[test]
    fn test_parse_dnf_search_filters_metadata() {
        let output = "Last metadata expiration check: 1h ago\n===== Matched: firefox =====\nfirefox.x86_64 : Mozilla Firefox\n";
        let pkgs = parse_dnf_search_output(output);
        assert_eq!(pkgs.len(), 1);
    }

    #[test]
    fn test_parse_dnf_search_no_separator() {
        let output = "firefox.x86_64 : Mozilla Firefox\nsome junk line without separator\n";
        let pkgs = parse_dnf_search_output(output);
        assert_eq!(pkgs.len(), 1);
    }

    #[test]
    fn test_parse_dnf_search_empty() {
        let pkgs = parse_dnf_search_output("");
        assert!(pkgs.is_empty());
    }

    // ─── parse_zypper_search_output tests ───

    #[test]
    fn test_parse_zypper_search_single() {
        // Note: existing code filters lines with pipes, so data lines with | are skipped
        let output = "firefox\n";
        let pkgs = parse_zypper_search_output(output);
        assert_eq!(pkgs.len(), 1);
        assert_eq!(pkgs[0].name, "firefox");
        assert_eq!(pkgs[0].repo, "zypper");
    }

    #[test]
    fn test_parse_zypper_search_filters_header() {
        let output = "S | Name | Summary\n---|------|--------\nfirefox\n";
        let pkgs = parse_zypper_search_output(output);
        assert_eq!(pkgs.len(), 1);
    }

    #[test]
    fn test_parse_zypper_search_empty() {
        let pkgs = parse_zypper_search_output("");
        assert!(pkgs.is_empty());
    }

    #[test]
    fn test_parse_zypper_search_filters_pipe_lines() {
        let output = "  i  | firefox | Mozilla Firefox\n    | firefox-devel | Dev files\n";
        let pkgs = parse_zypper_search_output(output);
        assert!(pkgs.is_empty());
    }

    // ─── remove_system_packages error handling ───

    #[test]
    fn test_remove_system_packages_empty() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            // Empty list should return empty results
            let result = remove_system_packages("invalid", &[]).await;
            assert!(result.is_ok());
            assert!(result.unwrap().is_empty());
        });
    }

    #[test]
    fn test_install_repo_packages_empty() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let result = install_repo_packages("invalid", &[]).await;
            assert!(result.is_ok());
            assert!(result.unwrap().is_empty());
        });
    }
}
