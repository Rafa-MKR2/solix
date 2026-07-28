// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2
// GitHub: https://github.com/Rafa-MKR2


use serde::Serialize;
use std::path::Path;

#[derive(Debug, Serialize)]
pub struct ExecutableStatus {
    pub name: String,
    pub available: bool,
    pub executable: Option<String>,
}

fn find_executable(name: &str) -> Option<String> {
    let path = std::env::var("PATH").unwrap_or_default();

    for dir in path.split(':') {
        if dir.is_empty() {
            continue;
        }
        let candidate = Path::new(dir).join(name);
        if candidate.is_file() {
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                if let Ok(metadata) = std::fs::metadata(&candidate) {
                    let mode = metadata.permissions().mode();
                    if mode & 0o111 != 0 {
                        return Some(candidate.to_string_lossy().to_string());
                    }
                }
            }
            #[cfg(not(unix))]
            {
                return Some(candidate.to_string_lossy().to_string());
            }
        }
    }

    None
}

pub async fn detect_executables(names: &[&str]) -> Vec<ExecutableStatus> {
    let mut results = Vec::with_capacity(names.len());

    for &name in names {
        let name_owned = name.to_string();
        let result = tokio::task::spawn_blocking(move || {
            let executable = find_executable(&name_owned);
            ExecutableStatus {
                name: name_owned,
                available: executable.is_some(),
                executable,
            }
        })
        .await;

        match result {
            Ok(status) => results.push(status),
            Err(_) => results.push(ExecutableStatus {
                name: name.to_string(),
                available: false,
                executable: None,
            }),
        }
    }

    results
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_executable_status_struct() {
        let s = ExecutableStatus {
            name: "git".into(),
            available: true,
            executable: Some("/usr/bin/git".into()),
        };
        assert_eq!(s.name, "git");
        assert!(s.available);
        assert_eq!(s.executable.unwrap(), "/usr/bin/git");
    }

    #[test]
    fn test_executable_status_not_found() {
        let s = ExecutableStatus {
            name: "nonexistent".into(),
            available: false,
            executable: None,
        };
        assert!(!s.available);
        assert!(s.executable.is_none());
    }
}

