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

    #[test]
    fn test_executable_status_available_true() {
        let s = ExecutableStatus {
            name: "test".into(),
            available: true,
            executable: Some("/usr/bin/test".into()),
        };
        assert!(s.available);
    }

    #[test]
    fn test_executable_status_available_false() {
        let s = ExecutableStatus {
            name: "test".into(),
            available: false,
            executable: None,
        };
        assert!(!s.available);
    }

    #[test]
    fn test_executable_status_all_fields() {
        let fields = ExecutableStatus {
            name: "rustc".into(),
            available: true,
            executable: Some("/usr/bin/rustc".into()),
        };
        assert_eq!(fields.name, "rustc");
        assert!(fields.available);
        assert_eq!(fields.executable, Some("/usr/bin/rustc".into()));
    }

    #[test]
    fn test_executable_status_debug_trait() {
        let s = ExecutableStatus {
            name: "test".into(),
            available: true,
            executable: Some("/bin/test".into()),
        };
        let debug_str = format!("{:?}", s);
        assert!(debug_str.contains("test"));
        assert!(debug_str.contains("true"));
        assert!(debug_str.contains("/bin/test"));
    }

    #[test]
    fn test_executable_status_serialize() {
        let s = ExecutableStatus {
            name: "curl".into(),
            available: true,
            executable: Some("/usr/bin/curl".into()),
        };
        let json = serde_json::to_string(&s).expect("serialization failed");
        assert!(json.contains("\"name\":\"curl\""));
        assert!(json.contains("\"available\":true"));
        assert!(json.contains("\"executable\":\"/usr/bin/curl\""));
    }

    #[test]
    fn test_executable_status_edge_cases() {
        let s = ExecutableStatus {
            name: String::new(),
            available: false,
            executable: None,
        };
        assert!(s.name.is_empty());
        assert!(!s.available);
        assert!(s.executable.is_none());

        let s = ExecutableStatus {
            name: "with spaces".into(),
            available: true,
            executable: Some("/usr/bin/with spaces".into()),
        };
        assert_eq!(s.name, "with spaces");
        assert_eq!(s.executable, Some("/usr/bin/with spaces".into()));
    }

    #[test]
    fn test_executable_status_various_combinations() {
        let cases = vec![
            ("a", true, Some("/bin/a")),
            ("b", false, None),
            ("", true, Some("")),
            ("long-name-123", false, None),
        ];
        for (name, available, executable) in cases {
            let s = ExecutableStatus {
                name: name.into(),
                available,
                executable: executable.map(|s| s.into()),
            };
            assert_eq!(s.name, name);
            assert_eq!(s.available, available);
            assert_eq!(s.executable, executable.map(|s| s.into()));
        }
    }

    #[test]
    fn test_find_executable_nonexistent() {
        let result = find_executable("this-command-should-not-exist-xyz-123");
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_detect_executables_empty() {
        let result = detect_executables(&[]).await;
        assert!(result.is_empty());
        assert_eq!(result.len(), 0);
    }

    #[tokio::test]
    async fn test_detect_executables_empty_string() {
        let result = detect_executables(&[""]).await;
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].name, "");
        assert!(!result[0].available);
        assert!(result[0].executable.is_none());
    }

    #[tokio::test]
    async fn test_detect_executables_nonexistent() {
        let result = detect_executables(&["cmd-nonexistent-xyz-abc"]).await;
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].name, "cmd-nonexistent-xyz-abc");
        assert!(!result[0].available);
        assert!(result[0].executable.is_none());
    }

    #[tokio::test]
    async fn test_detect_executables_known_exists() {
        let result = detect_executables(&["sh"]).await;
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].name, "sh");
        assert!(result[0].available);
        assert!(result[0].executable.is_some());
    }

    #[tokio::test]
    async fn test_detect_executables_multiple_nonexistent() {
        let names = &[
            "aaa-nonexistent-111",
            "bbb-nonexistent-222",
            "ccc-nonexistent-333",
        ];
        let result = detect_executables(names).await;
        assert_eq!(result.len(), 3);
        for status in &result {
            assert!(!status.available);
            assert!(status.executable.is_none());
        }
    }

    #[tokio::test]
    async fn test_detect_executables_mixed() {
        let result = detect_executables(&["sh", "this-will-not-exist-999"]).await;
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].name, "sh");
        assert!(result[0].available);
        assert_eq!(result[1].name, "this-will-not-exist-999");
        assert!(!result[1].available);
        assert!(result[1].executable.is_none());
    }

    #[test]
    fn test_find_executable_empty_name() {
        let result = find_executable("");
        assert!(result.is_none());
    }
}
