// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2
// GitHub: https://github.com/Rafa-MKR2

//! Módulo de backup usando tar (disponível em qualquer distribuição Linux)
//! 100% cross-distro — sem dependências externas

use serde::Serialize;
use std::time::Instant;

#[derive(Debug, Serialize)]
pub struct BackupResult {
    pub success: bool,
    pub file_path: String,
    pub file_size: String,
    pub duration_secs: u64,
    pub error: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Serialize)]
pub struct BackupProgress {
    pub stage: String,     // "start", "tar", "done", "error"
    pub message: String,
    pub percent: u8,
    pub file_path: Option<String>,
    pub file_size: Option<String>,
}

/// Cria um backup da pasta source para o destino usando tar
/// Ponto de montagem é a pasta raiz que contém a source (ex: /home)
pub async fn create_backup(source: &str, destination: &str, _mount_point: &str) -> Result<BackupResult, String> {
    // Validate paths
    let source_path = std::path::Path::new(source);
    let dest_path = std::path::Path::new(destination);

    if !source_path.exists() {
        return Err(format!("Origem não encontrada: {}", source));
    }

    // Create destination if it doesn't exist
    tokio::fs::create_dir_all(dest_path)
        .await
        .map_err(|e| format!("Erro ao criar destino: {}", e))?;

    // Check if destination is writable
    let test_file = dest_path.join(".solix_write_test");
    tokio::fs::write(&test_file, b"test")
        .await
        .map_err(|_| format!("Sem permissão de escrita em: {}", destination))?;
    let _ = tokio::fs::remove_file(&test_file).await;

    // Generate date string using /bin/date (coreutils — always available)
    let date_output = tokio::process::Command::new("date")
        .args(["+%Y-%m-%d_%H-%M-%S"])
        .output()
        .await
        .map_err(|_| "Erro ao obter data".to_string())?;

    let date_str = String::from_utf8_lossy(&date_output.stdout).trim().to_string();
    let folder_name = source_path
        .file_name()
        .map(|n| n.to_string_lossy())
        .unwrap_or(std::borrow::Cow::Borrowed("backup"));

    let backup_filename = format!("solix-backup-{}-{}.tar.gz", folder_name, date_str);
    let output_path = dest_path.join(&backup_filename);

    let start = Instant::now();

    // Run tar: tar czf <output> <source>
    let source_parent = source_path.parent().unwrap_or(std::path::Path::new("/"));
    let source_base = source_path
        .file_name()
        .unwrap_or(std::ffi::OsStr::new(""));

    let mut child = tokio::process::Command::new("tar")
        .args(["czf", &output_path.to_string_lossy()])
        .arg("-C")
        .arg(source_parent)
        .arg(source_base)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Erro ao iniciar tar: {}", e))?;

    let status = child.wait().await
        .map_err(|e| format!("Erro ao aguardar tar: {}", e))?;

    let duration = start.elapsed().as_secs();

    if !status.success() {
        let stderr = child.wait_with_output().await
            .map(|o| String::from_utf8_lossy(&o.stderr).to_string())
            .unwrap_or_else(|_| "Erro desconhecido".to_string());

        return Err(format!("Falha no backup: {}", stderr));
    }

    // Get file size
    let file_size = match tokio::fs::metadata(&output_path).await {
        Ok(m) => format_bytes(m.len()),
        Err(_) => "desconhecido".to_string(),
    };

    Ok(BackupResult {
        success: true,
        file_path: output_path.to_string_lossy().to_string(),
        file_size,
        duration_secs: duration,
        error: None,
    })
}

fn format_bytes(bytes: u64) -> String {
    if bytes >= 1_073_741_824 {
        format!("{:.2} GB", bytes as f64 / 1_073_741_824.0)
    } else if bytes >= 1_048_576 {
        format!("{:.1} MB", bytes as f64 / 1_048_576.0)
    } else if bytes >= 1024 {
        format!("{:.0} KB", bytes as f64 / 1024.0)
    } else {
        format!("{} B", bytes)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_bytes_bytes() {
        assert_eq!(format_bytes(500), "500 B");
    }

    #[test]
    fn test_format_bytes_kb() {
        assert_eq!(format_bytes(2048), "2 KB");
    }

    #[test]
    fn test_format_bytes_mb() {
        assert_eq!(format_bytes(1_048_576), "1.0 MB");
    }

    #[test]
    fn test_format_bytes_gb() {
        assert_eq!(format_bytes(2_147_483_648), "2.00 GB");
    }

    #[test]
    fn test_format_bytes_zero() {
        assert_eq!(format_bytes(0), "0 B");
    }

    #[test]
    fn test_format_bytes_edge() {
        assert_eq!(format_bytes(1023), "1023 B");
        assert_eq!(format_bytes(1024), "1 KB");
    }

    #[test]
    fn test_backup_result_struct() {
        let r = BackupResult {
            success: true,
            file_path: "/backup/test.tar.gz".into(),
            file_size: "1.5 MB".into(),
            duration_secs: 30,
            error: None,
        };
        assert!(r.success);
        assert_eq!(r.file_size, "1.5 MB");
        assert_eq!(r.duration_secs, 30);
    }

    #[test]
    fn test_backup_result_error() {
        let r = BackupResult {
            success: false,
            file_path: String::new(),
            file_size: String::new(),
            duration_secs: 0,
            error: Some("Permission denied".into()),
        };
        assert!(!r.success);
        assert_eq!(r.error.unwrap(), "Permission denied");
    }

    #[test]
    fn test_backup_progress_struct() {
        let p = BackupProgress {
            stage: "done".into(),
            message: "Backup concluído".into(),
            percent: 100,
            file_path: Some("/backup/test.tar.gz".into()),
            file_size: Some("2.1 MB".into()),
        };
        assert_eq!(p.stage, "done");
        assert_eq!(p.percent, 100);
        assert!(p.file_path.is_some());
    }
}
