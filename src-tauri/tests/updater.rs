// SPDX-License-Identifier: MIT
// Testes de integração do fluxo de auto-update (sem rede):
// semver, parsing de SHA256SUMS e validação de checksum.
use sha2::{Digest, Sha256};
use solix_lib::updater::{is_newer_version, parse_checksum, validate_checksum};
use std::path::Path;
use tempfile::NamedTempFile;

#[test]
fn semver_comparison_public_api() {
    assert!(is_newer_version("2.3.0", "2.2.0"));
    assert!(is_newer_version("3.0.0", "2.9.9"));
    assert!(!is_newer_version("2.2.0", "2.2.0"));
    assert!(!is_newer_version("2.1.0", "2.2.0"));
    assert!(is_newer_version("v2.3.0", "v2.2.0"));
}

#[test]
fn parse_checksum_finds_target() {
    let text = "abc123def456  solix-x86_64-linux\n789ghi  another-file.txt\n";
    let result = parse_checksum(text, "solix-x86_64-linux").unwrap();
    assert_eq!(result, "abc123def456");
}

#[test]
fn parse_checksum_handles_star_prefix() {
    let text = "abc123def456  *solix-x86_64-linux\n";
    let result = parse_checksum(text, "solix-x86_64-linux").unwrap();
    assert_eq!(result, "abc123def456");
}

#[test]
fn parse_checksum_missing_returns_error() {
    let text = "abc123  another-file.txt";
    assert!(parse_checksum(text, "solix-x86_64-linux").is_err());
}

#[test]
fn validate_checksum_ok_and_fail() {
    let tmp = NamedTempFile::new().unwrap();
    std::fs::write(tmp.path(), b"integration-test-data").unwrap();

    // Hash correto -> ok
    let mut hasher = Sha256::new();
    hasher.update(b"integration-test-data");
    let correct = hex::encode(hasher.finalize());
    assert!(validate_checksum(tmp.path(), &correct).is_ok());

    // Hash errado -> erro
    assert!(validate_checksum(tmp.path(), &"0".repeat(64)).is_err());

    // Arquivo inexistente -> erro
    assert!(validate_checksum(Path::new("/nonexistent/file"), &correct).is_err());
}
