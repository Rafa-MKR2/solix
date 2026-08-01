// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2

use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct DiskUsageItem {
    pub path: String,
    pub size: String,
}

fn sanitize_path(input: &str) -> String {
    input
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '/' || *c == '-' || *c == '_' || *c == '.')
        .collect()
}

#[tauri::command]
pub async fn open_file_manager(path: String) -> Result<(), String> {
    let dir = if path.is_empty() {
        "/".to_string()
    } else {
        path
    };
    tokio::process::Command::new("xdg-open")
        .arg(&dir)
        .output()
        .await
        .map_err(|e| format!("Erro ao abrir gerenciador de arquivos: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn analyze_disk_usage(mount_point: String) -> Result<Vec<DiskUsageItem>, String> {
    let path = sanitize_path(mount_point.trim_end_matches('/'));
    if !path.starts_with('/') {
        return Err("Caminho inválido.".to_string());
    }
    let output = tokio::process::Command::new("sh")
        .arg("-c")
        .arg(format!(
            "du -sh '{}'/* 2>/dev/null | sort -rh | head -15",
            path.replace('\'', "'\\''")
        ))
        .output()
        .await
        .map_err(|e| format!("Erro ao analisar disco: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let items: Vec<DiskUsageItem> = stdout
        .lines()
        .filter_map(|line| {
            let line = line.trim();
            if line.is_empty() {
                return None;
            }
            let parts: Vec<&str> = line.splitn(2, '\t').collect();
            if parts.len() < 2 {
                return None;
            }
            Some(DiskUsageItem {
                size: parts[0].to_string(),
                path: parts[1].to_string(),
            })
        })
        .collect();

    Ok(items)
}

#[tauri::command]
pub async fn get_partition_table(device: String) -> Result<String, String> {
    let base = device
        .trim_end_matches(|c: char| c.is_ascii_digit())
        .trim_end_matches('p');
    let output = tokio::process::Command::new("lsblk")
        .args(["-o", "NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT", base])
        .output()
        .await
        .map_err(|e| format!("Erro ao obter tabela de partições: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    if stdout.trim().is_empty() {
        return Err("Nenhuma informação de partição encontrada.".to_string());
    }
    Ok(stdout.trim().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_disk_usage_item_struct() {
        let item = DiskUsageItem {
            path: "/home".into(),
            size: "10 GB".into(),
        };
        assert_eq!(item.path, "/home");
        assert_eq!(item.size, "10 GB");
    }

    #[test]
    fn test_sanitize_path_allows_valid() {
        assert_eq!(
            sanitize_path("/usr/share/applications"),
            "/usr/share/applications"
        );
        assert_eq!(
            sanitize_path("/home/user/my-app_1.0.deb"),
            "/home/user/my-app_1.0.deb"
        );
    }

    #[test]
    fn test_sanitize_path_strips_special() {
        let result = sanitize_path("../../../etc/passwd; rm -rf /");
        assert!(!result.contains(';'));
        assert!(!result.contains(' '));
        assert!(!result.contains('$'));
        assert!(!result.contains('`'));
        assert_eq!(result, "../../../etc/passwdrm-rf/");
    }

    #[test]
    fn test_sanitize_path_empty() {
        assert_eq!(sanitize_path(""), "");
    }

    #[test]
    fn test_sanitize_path_only_special() {
        assert_eq!(sanitize_path("!@#$%^&*()"), "");
    }

    #[test]
    fn test_sanitize_path_keeps_slash() {
        assert_eq!(sanitize_path("/"), "/");
    }
}
