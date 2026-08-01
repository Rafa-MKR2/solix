// SPDX-License-Identifier: MIT
// Testes de integração da detecção de distribuição.
// `detect_linux_distribution` lê /etc/os-release do sistema real.
// O Solix é um app Linux-only, então o teste roda apenas em Linux.
#[cfg(target_os = "linux")]
use solix_lib::distribution::detect_linux_distribution;

#[cfg(target_os = "linux")]
#[tokio::test]
async fn detects_distribution_on_real_system() {
    let distro = detect_linux_distribution().await;
    assert!(distro.is_some(), "/etc/os-release deve existir no Linux");

    let d = distro.unwrap();
    assert!(!d.id.is_empty(), "ID da distribuição não pode ser vazio");
    assert!(
        !d.package_manager.is_empty(),
        "gerenciador de pacotes não pode ser vazio"
    );
    assert!(!d.family.is_empty(), "família não pode ser vazia");
}
