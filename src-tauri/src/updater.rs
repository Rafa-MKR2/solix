// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::path::{Path, PathBuf};
use tauri::Emitter;
use tokio::io::AsyncWriteExt;

const GITHUB_API: &str = "https://api.github.com/repos/Rafa-MKR2/solix/releases/latest";
const BINARY_PREFIX: &str = "solix-x86_64-linux";
const CHECKSUM_FILENAME: &str = "SHA256SUMS";
const USER_AGENT: &str = "Solix/2.1.0";
const INSTALL_PATH: &str = "/usr/local/bin/solix";

#[derive(Debug, Clone, Serialize, Deserialize)]
struct GithubRelease {
    tag_name: String,
    body: Option<String>,
    html_url: Option<String>,
    assets: Vec<GithubAsset>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct GithubAsset {
    name: String,
    browser_download_url: String,
    size: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct UpdateInfo {
    pub current_version: String,
    pub latest_version: String,
    pub update_available: bool,
    pub release_url: String,
    pub release_notes: String,
    pub download_url: String,
    pub checksum_url: String,
    pub download_size: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct UpdateProgress {
    pub stage: String,
    pub percent: u8,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
#[allow(dead_code)]
pub struct UpdateResult {
    pub success: bool,
    pub message: String,
}

pub async fn check_update() -> Result<UpdateInfo, String> {
    check_update_inner(&default_http_client()).await
}

pub trait HttpClient: Send + Sync {
    fn get_json(&self, url: &str) -> impl std::future::Future<Output = Result<String, String>> + Send;
}

struct RealHttpClient;

impl HttpClient for RealHttpClient {
    async fn get_json(&self, url: &str) -> Result<String, String> {
        let client = reqwest::Client::new();
        let resp = client
            .get(url)
            .header("User-Agent", USER_AGENT)
            .header("Accept", "application/json")
            .send()
            .await
            .map_err(|e| format!("Erro ao conectar com GitHub: {}", e))?;
        resp.text()
            .await
            .map_err(|e| format!("Erro ao ler resposta: {}", e))
    }
}

pub fn default_http_client() -> impl HttpClient {
    RealHttpClient
}

pub async fn check_update_inner(http: &impl HttpClient) -> Result<UpdateInfo, String> {
    let response = http.get_json(GITHUB_API).await?;

    let release: GithubRelease =
        serde_json::from_str(&response).map_err(|e| format!("Resposta inválida do GitHub: {}", e))?;

    let tag_name = release.tag_name.trim_start_matches('v').to_string();
    let current = env!("CARGO_PKG_VERSION").to_string();

    let binary_asset = release
        .assets
        .iter()
        .find(|a| a.name.starts_with(BINARY_PREFIX) || a.name == BINARY_PREFIX);

    let checksum_asset = release
        .assets
        .iter()
        .find(|a| a.name == CHECKSUM_FILENAME);

    let (download_url, download_size) = match binary_asset {
        Some(a) => (a.browser_download_url.clone(), a.size.unwrap_or(0)),
        None => return Err("Nenhum binário compatível encontrado nesta release.".to_string()),
    };

    let checksum_url = checksum_asset
        .map(|a| a.browser_download_url.clone())
        .unwrap_or_default();

    let release_url = release
        .html_url
        .unwrap_or_else(|| format!("https://github.com/Rafa-MKR2/solix/releases/tag/{}", release.tag_name));

    let release_notes = release.body.unwrap_or_default();
    let trimmed_notes = if release_notes.len() > 500 {
        format!("{}...", &release_notes[..500])
    } else {
        release_notes
    };

    let update_available = !tag_name.is_empty() && is_newer_version(&tag_name, &current);

    Ok(UpdateInfo {
        current_version: current,
        latest_version: tag_name,
        update_available,
        release_url,
        release_notes: trimmed_notes,
        download_url,
        checksum_url,
        download_size,
    })
}

pub fn is_newer_version(latest: &str, current: &str) -> bool {
    let latest_parts = parse_semver(latest);
    let current_parts = parse_semver(current);
    for (l, c) in latest_parts.iter().zip(current_parts.iter()) {
        if l > c {
            return true;
        } else if l < c {
            return false;
        }
    }
    latest_parts.len() > current_parts.len()
}

fn parse_semver(version: &str) -> Vec<u32> {
    version
        .trim_start_matches('v')
        .split('.')
        .filter_map(|s| s.parse::<u32>().ok())
        .collect()
}

pub async fn download_release(
    url: &str,
    app: &tauri::AppHandle,
) -> Result<PathBuf, String> {
    let _ = app.emit("update-progress", UpdateProgress {
        stage: "download".into(),
        percent: 0,
        message: "Baixando atualização...".into(),
    });

    let client = reqwest::Client::new();
    let resp = client
        .get(url)
        .header("User-Agent", USER_AGENT)
        .send()
        .await
        .map_err(|e| format!("Erro ao baixar atualização: {}", e))?;

    let total = resp.content_length().unwrap_or(0);

    let tmp_dir = std::env::temp_dir();
    let dest = tmp_dir.join("solix-update");

    let mut file = tokio::fs::File::create(&dest)
        .await
        .map_err(|e| format!("Erro ao criar arquivo temporário: {}", e))?;

    let mut stream = resp.bytes_stream();
    let mut downloaded: u64 = 0;

    use futures_util::StreamExt;
    let app_clone = app.clone();
    let mut last_pct: u8 = 0;
    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("Erro durante download: {}", e))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("Erro ao escrever arquivo: {}", e))?;
        downloaded += chunk.len() as u64;

        if total > 0 {
            let pct = ((downloaded as f64 / total as f64) * 100.0) as u8;
            if pct != last_pct {
                last_pct = pct;
                let _ = app_clone.emit("update-progress", UpdateProgress {
                    stage: "download".into(),
                    percent: pct,
                    message: format!("Baixando... {}%", pct),
                });
            }
        }
    }

    file.flush()
        .await
        .map_err(|e| format!("Erro ao finalizar arquivo: {}", e))?;

    let _ = app.emit("update-progress", UpdateProgress {
        stage: "download".into(),
        percent: 100,
        message: "Download concluído.".into(),
    });

    Ok(dest)
}

pub async fn download_checksum(url: &str) -> Result<String, String> {
    if url.is_empty() {
        return Ok(String::new());
    }
    let client = reqwest::Client::new();
    let text = client
        .get(url)
        .header("User-Agent", USER_AGENT)
        .send()
        .await
        .map_err(|e| format!("Erro ao baixar arquivo de checksum: {}", e))?
        .text()
        .await
        .map_err(|e| format!("Erro ao ler checksum: {}", e))?;
    Ok(text)
}

pub fn parse_checksum(checksum_text: &str, target_filename: &str) -> Result<String, String> {
    for line in checksum_text.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 2 {
            continue;
        }
        let hash = parts[0];
        let filename = parts[1].trim_start_matches('*').trim_start_matches(' ');
        if filename == target_filename || filename.ends_with(target_filename) {
            return Ok(hash.to_string());
        }
    }
    Err("Checksum não encontrado para o arquivo alvo.".to_string())
}

pub fn validate_checksum(file_path: &Path, expected_hex: &str) -> Result<(), String> {
    if expected_hex.is_empty() {
        return Err("Nenhum checksum disponível para validação.".to_string());
    }
    let data = std::fs::read(file_path)
        .map_err(|e| format!("Erro ao ler arquivo para validação: {}", e))?;
    let mut hasher = Sha256::new();
    hasher.update(&data);
    let calculated = hex::encode(hasher.finalize());
    if calculated != expected_hex.to_lowercase() {
        return Err(format!(
            "Checksum inválido.\nEsperado: {}\nCalculado: {}",
            expected_hex, calculated
        ));
    }
    Ok(())
}

pub async fn install_update(
    binary_path: &Path,
    password: &str,
    app: &tauri::AppHandle,
) -> Result<(), String> {
    let _ = app.emit("update-progress", UpdateProgress {
        stage: "install".into(),
        percent: 0,
        message: "Instalando atualização...".into(),
    });

    crate::password::verify_password(password).await?;

    let install_cmd = format!(
        "cp '{}' '{}' && chmod +x '{}'",
        binary_path.display(),
        INSTALL_PATH,
        INSTALL_PATH,
    );

    let result = crate::install::run_command(password, "update-install", &install_cmd).await;

    if !result.success {
        let err = result.error.unwrap_or_else(|| "Erro desconhecido".to_string());
        return Err(format!("Falha ao instalar atualização: {}", err));
    }

    let _ = app.emit("update-progress", UpdateProgress {
        stage: "install".into(),
        percent: 100,
        message: "Atualização instalada.".into(),
    });

    Ok(())
}

pub fn restart_application() -> Result<(), String> {
    let exe = std::env::current_exe()
        .map_err(|e| format!("Erro ao obter caminho do executável: {}", e))?;

    let _ = std::process::Command::new("sh")
        .arg("-c")
        .arg(format!("sleep 1 && exec '{}' 2>/dev/null &", exe.display()))
        .spawn();

    std::process::exit(0);
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;
    use std::collections::HashMap;
    use tempfile::NamedTempFile;

    struct MockHttpClient {
        responses: Mutex<HashMap<String, String>>,
    }

    impl MockHttpClient {
        fn new(responses: HashMap<String, String>) -> Self {
            Self {
                responses: Mutex::new(responses),
            }
        }
    }

    impl HttpClient for MockHttpClient {
        async fn get_json(&self, url: &str) -> Result<String, String> {
            let map = self.responses.lock().unwrap();
            map.get(url)
                .cloned()
                .ok_or_else(|| format!("Mock: no response configured for {}", url))
        }
    }

    fn make_valid_release_json(tag: &str, body: &str, has_binary: bool) -> String {
        let binary_asset = if has_binary {
            format!(
                r#"{{
                    "name": "solix-x86_64-linux",
                    "browser_download_url": "https://github.com/Rafa-MKR2/solix/releases/download/{0}/solix-x86_64-linux",
                    "size": 12345678
                }}"#,
                tag
            )
        } else {
            r#"{
                "name": "some-other-file.txt",
                "browser_download_url": "https://example.com/file.txt",
                "size": 100
            }"#
            .to_string()
        };

        let checksum_asset = format!(
            r#"{{
                "name": "SHA256SUMS",
                "browser_download_url": "https://github.com/Rafa-MKR2/solix/releases/download/{0}/SHA256SUMS",
                "size": 100
            }}"#,
            tag
        );

        format!(
            r#"{{
                "tag_name": "{}",
                "body": "{}",
                "html_url": "https://github.com/Rafa-MKR2/solix/releases/tag/{}",
                "assets": [{}, {}]
            }}"#,
            tag, body, tag, binary_asset, checksum_asset
        )
    }

    fn make_release_no_binary(tag: &str) -> String {
        format!(
            r#"{{
                "tag_name": "{}",
                "body": "Some release",
                "assets": []
            }}"#,
            tag
        )
    }

    fn make_invalid_json() -> String {
        "not valid json".to_string()
    }

    // ─── check_update_inner tests ───

    #[tokio::test]
    async fn test_check_update_newer_version() {
        let current = env!("CARGO_PKG_VERSION");
        let next = format!("{}.1", current);
        let json = make_valid_release_json(&format!("v{}", next), "Bug fixes", true);
        let url = GITHUB_API.to_string();
        let mut responses = HashMap::new();
        responses.insert(url, json);
        let http = MockHttpClient::new(responses);
        let info = check_update_inner(&http).await.unwrap();
        assert!(info.update_available);
        assert_eq!(info.latest_version, next);
        assert!(!info.download_url.is_empty());
        assert!(!info.checksum_url.is_empty());
    }

    #[tokio::test]
    async fn test_check_update_same_version() {
        let current = env!("CARGO_PKG_VERSION");
        let json = make_valid_release_json(&format!("v{}", current), "Same", true);
        let mut responses = HashMap::new();
        responses.insert(GITHUB_API.to_string(), json);
        let http = MockHttpClient::new(responses);
        let info = check_update_inner(&http).await.unwrap();
        assert!(!info.update_available);
    }

    #[tokio::test]
    async fn test_check_update_older_version() {
        let json = make_valid_release_json("v1.0.0", "Older", true);
        let mut responses = HashMap::new();
        responses.insert(GITHUB_API.to_string(), json);
        let http = MockHttpClient::new(responses);
        let info = check_update_inner(&http).await.unwrap();
        assert!(!info.update_available);
    }

    #[tokio::test]
    async fn test_check_update_no_binary_asset() {
        let json = make_release_no_binary("v99.0.0");
        let mut responses = HashMap::new();
        responses.insert(GITHUB_API.to_string(), json);
        let http = MockHttpClient::new(responses);
        let result = check_update_inner(&http).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Nenhum binário compatível"));
    }

    #[tokio::test]
    async fn test_check_update_invalid_json() {
        let mut responses = HashMap::new();
        responses.insert(GITHUB_API.to_string(), make_invalid_json());
        let http = MockHttpClient::new(responses);
        let result = check_update_inner(&http).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Resposta inválida"));
    }

    #[tokio::test]
    async fn test_check_update_no_internet() {
        let http = MockHttpClient::new(HashMap::new());
        let result = check_update_inner(&http).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_check_update_incomplete_response() {
        // Missing body, html_url
        let json = r#"{
            "tag_name": "v2.0.0",
            "assets": [{
                "name": "solix-x86_64-linux",
                "browser_download_url": "https://example.com/solix",
                "size": 100
            }]
        }"#.to_string();
        let mut responses = HashMap::new();
        responses.insert(GITHUB_API.to_string(), json);
        let http = MockHttpClient::new(responses);
        let info = check_update_inner(&http).await.unwrap();
        assert!(!info.release_url.is_empty());
        assert!(info.release_notes.is_empty());
    }

    // ─── is_newer_version tests ───

    #[test]
    fn test_is_newer_version_major() {
        assert!(is_newer_version("3.0.0", "2.0.0"));
    }

    #[test]
    fn test_is_newer_version_minor() {
        assert!(is_newer_version("2.1.0", "2.0.0"));
    }

    #[test]
    fn test_is_newer_version_patch() {
        assert!(is_newer_version("2.0.1", "2.0.0"));
    }

    #[test]
    fn test_is_newer_version_equal() {
        assert!(!is_newer_version("2.0.1", "2.0.1"));
    }

    #[test]
    fn test_is_newer_version_older() {
        assert!(!is_newer_version("1.9.9", "2.0.0"));
    }

    #[test]
    fn test_is_newer_version_with_v_prefix() {
        assert!(is_newer_version("v2.0.0", "v1.0.0"));
    }

    // ─── parse_semver tests ───

    #[test]
    fn test_parse_semver_empty() {
        assert_eq!(parse_semver(""), [] as [u32; 0]);
    }

    #[test]
    fn test_parse_semver_normal() {
        assert_eq!(parse_semver("2.0.1"), vec![2, 0, 1]);
    }

    #[test]
    fn test_parse_semver_with_v() {
        assert_eq!(parse_semver("v2.0.0"), vec![2, 0, 0]);
    }

    #[test]
    fn test_parse_semver_non_numeric() {
        assert_eq!(parse_semver("1.0.0-beta"), vec![1, 0]);
    }

    // ─── parse_checksum tests ───

    #[test]
    fn test_parse_checksum_found() {
        let text = "abc123def456  solix-x86_64-linux\n789ghi  another-file.txt";
        let result = parse_checksum(text, "solix-x86_64-linux");
        assert_eq!(result.unwrap(), "abc123def456");
    }

    #[test]
    fn test_parse_checksum_with_star() {
        let text = "abc123def456  *solix-x86_64-linux\n";
        let result = parse_checksum(text, "solix-x86_64-linux");
        assert_eq!(result.unwrap(), "abc123def456");
    }

    #[test]
    fn test_parse_checksum_not_found() {
        let text = "abc123  another-file.txt";
        let result = parse_checksum(text, "solix-x86_64-linux");
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_checksum_empty_lines_skipped() {
        let text = "\n\nabc123  solix-x86_64-linux\n\n";
        let result = parse_checksum(text, "solix-x86_64-linux");
        assert_eq!(result.unwrap(), "abc123");
    }

    #[test]
    fn test_parse_checksum_comment_skipped() {
        let text = "# this is a comment\nabc123  solix-x86_64-linux";
        let result = parse_checksum(text, "solix-x86_64-linux");
        assert_eq!(result.unwrap(), "abc123");
    }

    #[test]
    fn test_parse_checksum_empty_text() {
        let result = parse_checksum("", "solix");
        assert!(result.is_err());
    }

    // ─── validate_checksum tests ───

    #[test]
    fn test_validate_checksum_valid() {
        let tmp = NamedTempFile::new().unwrap();
        std::fs::write(tmp.path(), b"test data").unwrap();
        let mut hasher = Sha256::new();
        hasher.update(b"test data");
        let expected = hex::encode(hasher.finalize());
        let result = validate_checksum(tmp.path(), &expected);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_checksum_invalid() {
        let tmp = NamedTempFile::new().unwrap();
        std::fs::write(tmp.path(), b"test data").unwrap();
        let result = validate_checksum(tmp.path(), "0000000000000000000000000000000000000000000000000000000000000000");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Checksum inválido"));
    }

    #[test]
    fn test_validate_checksum_empty_expected() {
        let tmp = NamedTempFile::new().unwrap();
        std::fs::write(tmp.path(), b"test data").unwrap();
        let result = validate_checksum(tmp.path(), "");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_checksum_file_not_found() {
        let result = validate_checksum(Path::new("/nonexistent/file"), "abc");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_checksum_case_insensitive() {
        let tmp = NamedTempFile::new().unwrap();
        std::fs::write(tmp.path(), b"test data").unwrap();
        let mut hasher = Sha256::new();
        hasher.update(b"test data");
        let expected = hex::encode(hasher.finalize());
        // Upper case
        let result = validate_checksum(tmp.path(), &expected.to_uppercase());
        assert!(result.is_ok());
    }

    // ─── InstallResult check ───
    #[test]
    fn test_update_result_struct() {
        let r = UpdateResult {
            success: true,
            message: "ok".into(),
        };
        assert!(r.success);
    }

    #[test]
    fn test_update_progress_struct() {
        let p = UpdateProgress {
            stage: "download".into(),
            percent: 50,
            message: "downloading".into(),
        };
        assert_eq!(p.stage, "download");
        assert_eq!(p.percent, 50);
    }
}
