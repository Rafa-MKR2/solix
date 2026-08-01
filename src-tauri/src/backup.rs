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

// Only constructed in tests; reserved for future "backup-progress" events.
#[allow(dead_code)]
#[derive(Debug, Serialize)]
pub struct BackupProgress {
    pub stage: String, // "start", "tar", "done", "error"
    pub message: String,
    pub percent: u8,
    pub file_path: Option<String>,
    pub file_size: Option<String>,
}

/// Cria um backup da pasta source para o destino usando tar
/// Ponto de montagem é a pasta raiz que contém a source (ex: /home)
pub async fn create_backup(
    source: &str,
    destination: &str,
    _mount_point: &str,
) -> Result<BackupResult, String> {
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

    let date_str = String::from_utf8_lossy(&date_output.stdout)
        .trim()
        .to_string();
    let folder_name = source_path
        .file_name()
        .map(|n| n.to_string_lossy())
        .unwrap_or(std::borrow::Cow::Borrowed("backup"));

    let backup_filename = format!("solix-backup-{}-{}.tar.gz", folder_name, date_str);
    let output_path = dest_path.join(&backup_filename);

    let start = Instant::now();

    // Run tar: tar czf <output> <source>
    let source_parent = source_path.parent().unwrap_or(std::path::Path::new("/"));
    let source_base = source_path.file_name().unwrap_or(std::ffi::OsStr::new(""));

    let mut child = tokio::process::Command::new("tar")
        .args(["czf", &output_path.to_string_lossy()])
        .arg("-C")
        .arg(source_parent)
        .arg(source_base)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Erro ao iniciar tar: {}", e))?;

    let status = child
        .wait()
        .await
        .map_err(|e| format!("Erro ao aguardar tar: {}", e))?;

    let duration = start.elapsed().as_secs();

    if !status.success() {
        let stderr = child
            .wait_with_output()
            .await
            .map(|o| String::from_utf8_lossy(&o.stderr).to_string())
            .unwrap_or_else(|_| "Erro desconhecido".to_string());

        return Err(format!("Falha no backup: {}", stderr));
    }

    // Get file size
    let file_size = match tokio::fs::metadata(&output_path).await {
        Ok(m) => crate::util::format_bytes(m.len(), crate::util::FormatBase::Binary),
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

#[cfg(test)]
mod tests {
    use super::*;

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

    #[test]
    fn test_backup_result_all_fields_none() {
        let r = BackupResult {
            success: true,
            file_path: String::new(),
            file_size: String::new(),
            duration_secs: 0,
            error: None,
        };
        assert!(r.success);
        assert!(r.file_path.is_empty());
        assert!(r.file_size.is_empty());
        assert_eq!(r.duration_secs, 0);
        assert!(r.error.is_none());
    }

    #[test]
    fn test_backup_result_max_duration() {
        let r = BackupResult {
            success: true,
            file_path: "/path/to/backup.tar.gz".into(),
            file_size: "999.99 GB".into(),
            duration_secs: u64::MAX,
            error: None,
        };
        assert_eq!(r.duration_secs, u64::MAX);
        assert_eq!(r.file_size, "999.99 GB");
    }

    #[test]
    fn test_backup_result_error_with_fields() {
        let r = BackupResult {
            success: false,
            file_path: "/failed/path".into(),
            file_size: "0 B".into(),
            duration_secs: 5,
            error: Some("Disk full".into()),
        };
        assert!(!r.success);
        assert_eq!(r.file_path, "/failed/path");
        assert_eq!(r.error.as_deref(), Some("Disk full"));
        assert_eq!(r.duration_secs, 5);
    }

    #[test]
    fn test_backup_result_serializable() {
        let r = BackupResult {
            success: true,
            file_path: "/backup.tar.gz".into(),
            file_size: "10.5 MB".into(),
            duration_secs: 42,
            error: None,
        };
        let json = serde_json::to_string(&r).unwrap();
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("\"file_path\":\"/backup.tar.gz\""));
        assert!(json.contains("\"duration_secs\":42"));
    }

    #[test]
    fn test_backup_result_serializable_with_error() {
        let r = BackupResult {
            success: false,
            file_path: String::new(),
            file_size: String::new(),
            duration_secs: 0,
            error: Some("error msg".into()),
        };
        let json = serde_json::to_string(&r).unwrap();
        assert!(json.contains("\"error\":\"error msg\""));
        assert!(json.contains("\"success\":false"));
    }

    #[test]
    fn test_backup_progress_all_stages() {
        for (stage, percent) in [("start", 0), ("tar", 50), ("done", 100), ("error", 0)] {
            let p = BackupProgress {
                stage: stage.into(),
                message: String::new(),
                percent,
                file_path: None,
                file_size: None,
            };
            assert_eq!(p.stage, stage);
            assert_eq!(p.percent, percent);
        }
    }

    #[test]
    fn test_backup_progress_edge_percent() {
        let p = BackupProgress {
            stage: "start".into(),
            message: "Iniciando".into(),
            percent: 0,
            file_path: None,
            file_size: None,
        };
        assert_eq!(p.percent, 0);
        assert!(p.file_path.is_none());
        assert!(p.file_size.is_none());
    }

    #[test]
    fn test_backup_progress_full_info() {
        let p = BackupProgress {
            stage: "tar".into(),
            message: "Compactando arquivos...".into(),
            percent: 50,
            file_path: Some("/tmp/test".into()),
            file_size: Some("500 MB".into()),
        };
        assert_eq!(p.percent, 50);
        assert_eq!(p.file_path.as_deref(), Some("/tmp/test"));
        assert_eq!(p.file_size.as_deref(), Some("500 MB"));
    }

    #[test]
    fn test_backup_progress_serializable() {
        let p = BackupProgress {
            stage: "tar".into(),
            message: "processing".into(),
            percent: 75,
            file_path: Some("/f".into()),
            file_size: None,
        };
        let json = serde_json::to_string(&p).unwrap();
        assert!(json.contains("\"stage\":\"tar\""));
        assert!(json.contains("\"percent\":75"));
    }

    // ─── create_backup integration tests ───

    #[test]
    fn test_create_backup_success() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            // Create a temp source dir with a file
            let source = tempfile::tempdir().unwrap();
            std::fs::write(source.path().join("dados.txt"), b"conteudo do backup").unwrap();
            let dest = tempfile::tempdir().unwrap();

            let result = create_backup(
                source.path().to_str().unwrap(),
                dest.path().to_str().unwrap(),
                "/",
            )
            .await;

            let r = result.expect("backup should succeed");
            assert!(r.success);
            assert!(r.error.is_none());
            assert!(!r.file_path.is_empty());
            assert!(r.file_path.ends_with(".tar.gz"));
            assert!(std::path::Path::new(&r.file_path).exists());
            assert!(!r.file_size.is_empty());
        });
    }

    #[test]
    fn test_create_backup_source_not_found() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let dest = tempfile::tempdir().unwrap();
            let result = create_backup(
                "/caminho/que/nao/existe/solix",
                dest.path().to_str().unwrap(),
                "/",
            )
            .await;
            let err = result.expect_err("must fail for missing source");
            assert!(err.contains("Origem não encontrada"));
        });
    }

    #[test]
    fn test_create_backup_destination_auto_created() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let source = tempfile::tempdir().unwrap();
            std::fs::write(source.path().join("arquivo"), b"dados").unwrap();
            // Destination dir does NOT exist yet — create_backup should create it
            let base = tempfile::tempdir().unwrap();
            let dest = base.path().join("subdir/backups");

            let result =
                create_backup(source.path().to_str().unwrap(), dest.to_str().unwrap(), "/").await;

            let r = result.expect("backup should succeed");
            assert!(r.success);
            assert!(std::path::Path::new(&r.file_path).exists());
        });
    }

    #[test]
    fn test_create_backup_empty_source_file() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let source = tempfile::tempdir().unwrap();
            // Empty source dir — tar of empty dir still succeeds
            let dest = tempfile::tempdir().unwrap();

            let result = create_backup(
                source.path().to_str().unwrap(),
                dest.path().to_str().unwrap(),
                "/",
            )
            .await;

            let r = result.expect("empty dir backup should succeed");
            assert!(r.success);
            assert!(std::path::Path::new(&r.file_path).exists());
        });
    }

    #[test]
    fn test_create_backup_generated_file_name() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let source = tempfile::tempdir().unwrap();
            let folder = source
                .path()
                .file_name()
                .unwrap()
                .to_string_lossy()
                .to_string();
            let dest = tempfile::tempdir().unwrap();

            let result = create_backup(
                source.path().to_str().unwrap(),
                dest.path().to_str().unwrap(),
                "/",
            )
            .await;

            let r = result.unwrap();
            let filename = std::path::Path::new(&r.file_path)
                .file_name()
                .unwrap()
                .to_string_lossy()
                .to_string();
            assert!(filename.starts_with(&format!("solix-backup-{}", folder)));
            assert!(filename.ends_with(".tar.gz"));
        });
    }
}
