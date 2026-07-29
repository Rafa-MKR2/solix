// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2
// GitHub: https://github.com/Rafa-MKR2

//! Módulo para inspeção e instalação de pacotes .deb e .rpm.
//! Extrai metadados, verifica compatibilidade com a distro e
//! executa a instalação com proteções para o usuário leigo.

use serde::Serialize;
use std::path::Path;

#[derive(Debug, Serialize)]
pub struct LocalPackageInfo {
    pub file_name: String,
    pub file_size: String,
    pub package_name: String,
    pub version: String,
    pub description: String,
    pub architecture: String,
    pub dependencies: Vec<String>,
    pub package_type: String,       // "deb" ou "rpm"
    pub compatible: bool,           // compatível com a distro atual?
    pub compat_message: String,     // mensagem explicativa
}

/// Obtém a arquitetura do sistema
fn get_system_arch() -> String {
    std::process::Command::new("uname")
        .arg("-m")
        .output()
        .ok()
        .and_then(|o| {
            String::from_utf8(o.stdout)
                .ok()
                .map(|s| s.trim().to_string())
        })
        .unwrap_or_else(|| "desconhecida".to_string())
}

/// Verifica se a distro atual é compatível com o tipo de pacote
fn check_distro_compat(pkg_type: &str) -> (bool, String) {
    // Detecta a distro lendo /etc/os-release
    let os_release = std::fs::read_to_string("/etc/os-release").unwrap_or_default();
    let id = os_release
        .lines()
        .find_map(|l| l.strip_prefix("ID="))
        .map(|v| v.trim().trim_matches('"').to_lowercase())
        .unwrap_or_default();
    let id_like = os_release
        .lines()
        .find_map(|l| l.strip_prefix("ID_LIKE="))
        .map(|v| v.trim().trim_matches('"').to_lowercase())
        .unwrap_or_default();

    match pkg_type {
        "deb" => {
            let deb_family = ["ubuntu", "debian", "linuxmint", "pop", "elementary", "zorin", "kali"];
            let is_deb = deb_family.contains(&id.as_str())
                || deb_family.contains(&id_like.as_str())
                || id_like.contains("debian");
            if is_deb {
                (true, "✅ Compatível com sua distribuição (Debian/Ubuntu)".into())
            } else {
                (false, "❌ Pacote .deb não é compatível com sua distribuição. Recomendamos usar o formato nativo da sua distro.".into())
            }
        }
        "rpm" => {
            let rpm_family = ["fedora", "rhel", "centos", "rocky", "almalinux", "opensuse", "suse"];
            let is_rpm = rpm_family.contains(&id.as_str())
                || rpm_family.contains(&id_like.as_str())
                || id_like.contains("fedora")
                || id_like.contains("rhel")
                || id_like.contains("suse");
            if is_rpm {
                (true, "✅ Compatível com sua distribuição (Fedora/RHEL/openSUSE)".into())
            } else {
                (false, "❌ Pacote .rpm não é compatível com sua distribuição. Recomendamos usar o formato nativo da sua distro.".into())
            }
        }
        _ => (false, "❌ Tipo de pacote desconhecido.".into()),
    }
}

/// Obtém o tamanho do arquivo em formato legível
fn format_file_size(path: &str) -> String {
    let len = std::fs::metadata(path).ok().map(|m| m.len()).unwrap_or(0);
    if len > 1_000_000_000 {
        format!("{:.1} GB", len as f64 / 1_000_000_000.0)
    } else if len > 1_000_000 {
        format!("{:.1} MB", len as f64 / 1_000_000.0)
    } else if len > 1_000 {
        format!("{:.0} KB", len as f64 / 1_000.0)
    } else {
        format!("{} bytes", len)
    }
}

/// Extrai o nome do arquivo do path
fn extract_filename(path: &str) -> String {
    Path::new(path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string())
}

/// Extrai o conteúdo do arquivo `control` de um pacote .deb usando `ar` + `tar` via pipe
fn extract_deb_control(path: &str) -> Result<String, String> {
    // Tenta control.tar.gz (formato clássico)
    let out = std::process::Command::new("sh")
        .arg("-c")
        .arg(format!("ar p '{}' control.tar.gz 2>/dev/null | tar xz -O ./control 2>/dev/null", path))
        .output()
        .map_err(|_| "Erro ao extrair pacote. Verifique se 'ar' está instalado (binutils).".to_string())?;

    if !out.status.success() || out.stdout.is_empty() {
        // Tenta control.tar.xz (debs mais recentes)
        let out = std::process::Command::new("sh")
            .arg("-c")
            .arg(format!("ar p '{}' control.tar.xz 2>/dev/null | tar xJ -O ./control 2>/dev/null", path))
            .output()
            .map_err(|_| "Erro ao extrair pacote.".to_string())?;

        if out.stdout.is_empty() {
            return Err("Não foi possível ler o pacote .deb. O arquivo pode estar corrompido.".into());
        }
        return Ok(String::from_utf8_lossy(&out.stdout).to_string());
    }

    Ok(String::from_utf8_lossy(&out.stdout).to_string())
}

/// Extrai o valor de um campo do arquivo de controle .deb
fn parse_control_field<'a>(content: &'a str, field: &str) -> Option<&'a str> {
    let prefix = format!("{}: ", field);
    let prefix_no_space = format!("{}:", field);
    content
        .lines()
        .find_map(|line| {
            line.strip_prefix(&prefix)
                .or_else(|| line.strip_prefix(&prefix_no_space))
                .map(|v| v.trim())
        })
}

/// Inspeciona um pacote .deb usando `ar` + `tar` (não precisa de dpkg-deb)
fn inspect_deb(path: &str) -> Result<LocalPackageInfo, String> {
    if !Path::new(path).exists() {
        return Err("Arquivo não encontrado.".into());
    }

    // Extrai o arquivo de controle
    let control = extract_deb_control(path)?;

    // Extrai campos
    let package_name = parse_control_field(&control, "Package")
        .unwrap_or("desconhecido")
        .to_string();

    let version = parse_control_field(&control, "Version")
        .unwrap_or("desconhecida")
        .to_string();

    let description = parse_control_field(&control, "Description")
        .unwrap_or("Sem descrição")
        .to_string();

    let architecture = parse_control_field(&control, "Architecture")
        .unwrap_or("desconhecida")
        .to_string();

    // Extrai dependências
    let dependencies: Vec<String> = control
        .lines()
        .filter_map(|l| {
            let stripped = l.strip_prefix("Depends: ").or_else(|| l.strip_prefix("Depends:"))?;
            Some(stripped.trim().to_string())
        })
        .next()
        .map(|deps| {
            deps.split(',')
                .map(|d| d.split('(').next().unwrap_or(d).trim().to_string())
                .filter(|d| !d.is_empty())
                .collect()
        })
        .unwrap_or_default();

    // Verifica compatibilidade de arquitetura
    let sys_arch = get_system_arch();
    let arch_ok = architecture == "all"
        || architecture == sys_arch
        || (architecture == "amd64" && sys_arch == "x86_64")
        || (architecture == "x86_64" && sys_arch == "amd64");

    let (distro_ok, compat_msg) = check_distro_compat("deb");

    let compatible = distro_ok && arch_ok;
    let compat_message = if !arch_ok && distro_ok {
        format!("⚠️ Arquitetura do pacote ({architecture}) diferente da sua ({sys_arch}). Pode não funcionar corretamente.")
    } else {
        compat_msg
    };

    Ok(LocalPackageInfo {
        file_name: extract_filename(path),
        file_size: format_file_size(path),
        package_name,
        version,
        description,
        architecture,
        dependencies,
        package_type: "deb".into(),
        compatible,
        compat_message,
    })
}

fn run_rpm_qpi(path: &str) -> Result<String, String> {
    std::process::Command::new("rpm")
        .args(["-qpi", path])
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
        .map_err(|e| format!("Erro ao executar rpm: {}", e))
}

fn run_rpm_qp_r(path: &str) -> Result<String, String> {
    std::process::Command::new("rpm")
        .args(["-qpR", path])
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
        .map_err(|e| format!("Erro ao executar rpm: {}", e))
}

fn parse_rpm_field(output: &str, field: &str) -> Option<String> {
    output
        .lines()
        .find_map(|l| {
            if l.to_uppercase().starts_with(&field.to_uppercase()) {
                l.splitn(2, ':').nth(1).map(|v| v.trim().to_string())
            } else {
                None
            }
        })
}

/// Inspeciona um pacote .rpm — tenta `rpm`, fallback `rpm2cpio`, fallback amigável
fn inspect_rpm(path: &str) -> Result<LocalPackageInfo, String> {
    if !Path::new(path).exists() {
        return Err("Arquivo não encontrado.".into());
    }

    // Verifica compatibilidade da distro primeiro (antes de tentar ferramentas)
    let (distro_ok, compat_msg) = check_distro_compat("rpm");

    // Tenta usar rpm
    if Path::new("/usr/bin/rpm").exists() {
        let stdout = run_rpm_qpi(path)?;
        let deps_stdout = run_rpm_qp_r(path).unwrap_or_default();

        let package_name = parse_rpm_field(&stdout, "Name").unwrap_or_else(|| "desconhecido".to_string());
        let version = parse_rpm_field(&stdout, "Version").unwrap_or_else(|| "desconhecida".to_string());
        let description = parse_rpm_field(&stdout, "Description").unwrap_or_else(|| "Sem descrição".to_string());
        let architecture = parse_rpm_field(&stdout, "Architecture").unwrap_or_else(|| "desconhecida".to_string());

        let dependencies: Vec<String> = deps_stdout
            .lines()
            .map(|l| l.split_whitespace().next().unwrap_or(l).to_string())
            .filter(|d| !d.is_empty() && !d.starts_with("rpmlib") && !d.starts_with("config"))
            .take(20)
            .collect();

        let sys_arch = get_system_arch();
        let arch_ok = architecture == "noarch"
            || architecture == sys_arch
            || (architecture == "x86_64" && sys_arch == "amd64")
            || (architecture == "amd64" && sys_arch == "x86_64");

        let compatible = distro_ok && arch_ok;
        let compat_message = if !arch_ok && distro_ok {
            format!("⚠️ Arquitetura do pacote ({architecture}) diferente da sua ({sys_arch}). Pode não funcionar corretamente.")
        } else {
            compat_msg
        };

        return Ok(LocalPackageInfo {
            file_name: extract_filename(path),
            file_size: format_file_size(path),
            package_name,
            version,
            description,
            architecture,
            dependencies,
            package_type: "rpm".into(),
            compatible,
            compat_message,
        });
    }

    // Fallback: tenta rpm2cpio + cpio (pelo menos valida o arquivo)
    if Path::new("/usr/bin/rpm2cpio").exists() {
        let out = std::process::Command::new("sh")
            .arg("-c")
            .arg(format!("rpm2cpio '{}' 2>/dev/null | cpio -t --quiet 2>/dev/null | head -1", path))
            .output()
            .map_err(|_| "Erro ao validar pacote .rpm.".to_string())?;

        if !out.stdout.is_empty() {
            // Conseguiu ler o rpm, mas sem metadados — retorna info parcial
            return Ok(LocalPackageInfo {
                file_name: extract_filename(path),
                file_size: format_file_size(path),
                package_name: extract_filename(path),
                version: "—".into(),
                description: "Pacote .rpm válido. Instale 'rpm' para ver informações completas.".into(),
                architecture: "—".into(),
                dependencies: vec![],
                package_type: "rpm".into(),
                compatible: distro_ok,
                compat_message: compat_msg,
            });
        }
    }

    // Nenhuma ferramenta disponível
    Err(
        if distro_ok {
            "Para inspecionar pacotes .rpm, instale o 'rpm' (gerenciador de pacotes RPM).\n\nComando: sudo dnf install rpm\nou: sudo zypper install rpm".into()
        } else {
            format!("{}\n\n⚠️ Dica: Sua distribuição não usa pacotes .rpm. Considere usar o formato nativo.", compat_msg)
        }
    )
}

/// Ponto de entrada: inspeciona qualquer tipo de pacote suportado
pub fn inspect_package(path: &str) -> Result<LocalPackageInfo, String> {
    let lower = path.to_lowercase();
    if lower.ends_with(".deb") {
        inspect_deb(path)
    } else if lower.ends_with(".rpm") {
        inspect_rpm(path)
    } else {
        Err("Formato não suportado. Selecione um arquivo .deb ou .rpm.".into())
    }
}

fn decode_base64(data: &str) -> Result<Vec<u8>, String> {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let data = data.trim();
    let mut bytes = Vec::new();
    let mut buffer = 0u32;
    let mut bits = 0;
    for ch in data.chars() {
        if ch == '=' { break; }
        if let Some(pos) = CHARS.iter().position(|&c| c as char == ch) {
            buffer = (buffer << 6) | pos as u32;
            bits += 6;
            if bits >= 8 {
                bits -= 8;
                bytes.push((buffer >> bits) as u8);
                buffer &= (1 << bits) - 1;
            }
        }
    }
    Ok(bytes)
}

fn save_tmp_package(data: &str, file_name: &str) -> Result<String, String> {
    use std::io::Write;
    let decoded = decode_base64(data)?;
    // Sanitiza nome do arquivo para evitar path traversal
    let safe_name: String = file_name
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' })
        .collect();
    let tmp_path = format!("/tmp/solix-{}", safe_name);
    let mut file = std::fs::File::create(&tmp_path)
        .map_err(|e| format!("Erro ao salvar arquivo temporário: {}", e))?;
    file.write_all(&decoded)
        .map_err(|e| format!("Erro ao escrever arquivo: {}", e))?;
    Ok(tmp_path)
}

/// Salva dados base64 em arquivo temporário e inspeciona
pub fn inspect_package_data(data: &str, file_name: &str) -> Result<LocalPackageInfo, String> {
    let tmp_path = save_tmp_package(data, file_name)?;
    let result = inspect_package(&tmp_path);
    let _ = std::fs::remove_file(&tmp_path);
    result
}

/// Salva dados base64 e instala
pub async fn install_package_data(
    data: &str,
    file_name: &str,
    password: &str,
) -> Result<crate::install::InstallResult, String> {
    let tmp_path = save_tmp_package(data, file_name)?;
    let result = install_local_package(&tmp_path, password).await;
    let _ = std::fs::remove_file(&tmp_path);
    result
}

/// Instala um pacote local usando o gerenciador apropriado
pub async fn install_local_package(
    path: &str,
    password: &str,
) -> Result<crate::install::InstallResult, String> {
    let lower = path.to_lowercase();
    let (pkg_type, install_cmd) = if lower.ends_with(".deb") {
        ("deb", format!("sudo -S dpkg -i '{}'", path))
    } else if lower.ends_with(".rpm") {
        ("rpm", format!("sudo -S rpm -i '{}'", path))
    } else {
        return Err("Formato não suportado.".into());
    };

    // Verifica compatibilidade antes de instalar
    let info = inspect_package(path)?;
    if !info.compatible {
        return Err(format!(
            "Instalação bloqueada: {}",
            info.compat_message
        ));
    }

    // Executa a instalação usando o sistema existente de run_command
    let result = crate::install::run_command(password, &info.package_name, &install_cmd).await;

    // Se falhou com dependências, tenta corrigir automaticamente
    if !result.success && pkg_type == "deb" {
        let fix_cmd = "sudo -S apt install -f -y".to_string();
        let fix_result = crate::install::run_command(password, "fix-dependencies", &fix_cmd).await;
        if fix_result.success {
            // Tenta instalar novamente
            return Ok(crate::install::run_command(password, &info.package_name, &install_cmd).await);
        }
    }

    Ok(result)
}
