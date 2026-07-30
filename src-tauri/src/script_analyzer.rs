// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2

use serde::Serialize;

/// The overall risk level of a script analysis
#[derive(Debug, Serialize, Clone)]
#[allow(dead_code)]
pub enum ScriptRisk {
    Safe,
    Medium,
    Warning,
    Danger,
}

/// Detected script type
#[derive(Debug, Serialize, Clone, PartialEq)]
pub enum ScriptType {
    Shell,
    Python,
    #[allow(dead_code)]
    Unknown,
}

/// A single parsed command from a script
#[derive(Debug, Serialize, Clone)]
pub struct ScriptCommand {
    pub line: u32,
    pub content: String,
    pub command: String,
    pub description: String,
    pub risk: String,
    pub category: String,
    pub requires_review: bool,
}

/// Complete analysis result for a script
#[derive(Debug, Serialize, Clone)]
pub struct ScriptAnalysis {
    pub summary: String,
    pub total_lines: u32,
    pub command_count: u32,
    pub script_type: String,
    pub risk_level: String,
    pub commands: Vec<ScriptCommand>,
    pub has_sudo: bool,
    pub has_install: bool,
    pub has_download_execute: bool,
    pub has_dangerous: bool,
    pub ai_explanation: Option<String>,
}

/// Local database of common commands with Portuguese descriptions
fn get_command_database() -> std::collections::HashMap<&'static str, (&'static str, &'static str, &'static str)> {
    let mut db = std::collections::HashMap::new();

    // Package Management
    db.insert("apt", ("Gerenciador de pacotes APT (Debian/Ubuntu). Instala, remove e atualiza programas.", "install", "Pacotes"));
    db.insert("apt-get", ("Gerenciador de pacotes APT (versão clássica). Baixa e instala programas.", "install", "Pacotes"));
    db.insert("dpkg", ("Instalador de pacotes .deb. Instala programas manualmente.", "install", "Pacotes"));
    db.insert("pacman", ("Gerenciador de pacotes do Arch Linux. Instala e gerencia programas.", "install", "Pacotes"));
    db.insert("yay", ("Ajudante AUR para Arch. Instala programas da comunidade.", "install", "Pacotes"));
    db.insert("paru", ("Ajudante AUR rápido para Arch. Instala programas.", "install", "Pacotes"));
    db.insert("dnf", ("Gerenciador de pacotes DNF (Fedora). Instala e gerencia programas.", "install", "Pacotes"));
    db.insert("yum", ("Gerenciador de pacotes YUM (CentOS/RHEL antigo). Instala programas.", "install", "Pacotes"));
    db.insert("zypper", ("Gerenciador de pacotes do openSUSE. Instala e gerencia programas.", "install", "Pacotes"));
    db.insert("snap", ("Gerencia pacotes Snap (universal). Instala programas em sandbox.", "install", "Pacotes"));
    db.insert("flatpak", ("Gerencia pacotes Flatpak (universal). Instala programas em sandbox.", "install", "Pacotes"));
    db.insert("pip", ("Instalador de pacotes Python. Baixa e instala bibliotecas.", "install", "Pacotes"));
    db.insert("npm", ("Gerenciador de pacotes Node.js. Instala bibliotecas JS.", "install", "Pacotes"));
    db.insert("cargo", ("Gerenciador de pacotes Rust. Compila e instala programas.", "install", "Pacotes"));
    db.insert("gem", ("Gerenciador de pacotes Ruby. Instala bibliotecas.", "install", "Pacotes"));

    // System operations
    db.insert("sudo", ("Executa comandos como administrador (root). Requer sua senha.", "sudo", "Sistema"));
    db.insert("pkexec", ("Executa comandos com privilégios admin (alt. ao sudo).", "sudo", "Sistema"));
    db.insert("doas", ("Executa comandos como admin (alternativa leve).", "sudo", "Sistema"));
    db.insert("systemctl", ("Gerencia serviços do sistema (iniciar, parar, habilitar).", "system", "Sistema"));
    db.insert("shutdown", ("Desliga o computador.", "system", "Sistema"));
    db.insert("reboot", ("Reinicia o computador.", "system", "Sistema"));
    db.insert("poweroff", ("Desliga o computador imediatamente.", "system", "Sistema"));

    // File operations
    db.insert("cp", ("Copia arquivos ou pastas.", "safe", "Arquivos"));
    db.insert("mv", ("Move ou renomeia arquivos.", "safe", "Arquivos"));
    db.insert("rm", ("Remove arquivos. CUIDADO com rm -rf!", "danger", "Arquivos"));
    db.insert("mkdir", ("Cria uma nova pasta (diretório).", "safe", "Arquivos"));
    db.insert("rmdir", ("Remove uma pasta vazia.", "safe", "Arquivos"));
    db.insert("touch", ("Cria arquivo vazio ou atualiza data.", "safe", "Arquivos"));
    db.insert("cat", ("Mostra conteúdo de arquivo ou junta arquivos.", "safe", "Arquivos"));
    db.insert("chmod", ("Altera permissões de arquivos.", "system", "Arquivos"));
    db.insert("chown", ("Altera o dono de arquivos.", "system", "Arquivos"));
    db.insert("ln", ("Cria links (atalhos) para arquivos.", "safe", "Arquivos"));
    db.insert("find", ("Procura arquivos e pastas.", "safe", "Arquivos"));
    db.insert("grep", ("Procura textos dentro de arquivos.", "safe", "Arquivos"));
    db.insert("sed", ("Edita textos (substitui palavras).", "safe", "Arquivos"));
    db.insert("awk", ("Processa texto colunas.", "safe", "Arquivos"));
    db.insert("tee", ("Salva saída em arquivo e mostra na tela.", "safe", "Arquivos"));
    db.insert("rsync", ("Sincroniza arquivos entre pastas/computadores.", "safe", "Arquivos"));

    // Download / Network
    db.insert("wget", ("Baixa arquivos da internet.", "download", "Rede"));
    db.insert("curl", ("Transfere dados da internet. Pode baixar arquivos.", "download", "Rede"));
    db.insert("ssh", ("Conecta remotamente a outro computador.", "download", "Rede"));
    db.insert("scp", ("Copia arquivos entre computadores pela rede.", "download", "Rede"));
    db.insert("ping", ("Testa se um computador está acessível na rede.", "safe", "Rede"));
    db.insert("ip", ("Mostra/configura endereços de rede.", "system", "Rede"));
    db.insert("ufw", ("Configura firewall (Ubuntu).", "system", "Rede"));

    // Git / Dev
    db.insert("git", ("Controle de versão. Baixa e gerencia projetos.", "download", "Desenvolvimento"));
    db.insert("make", ("Compila programas a partir do código.", "install", "Desenvolvimento"));
    db.insert("gcc", ("Compilador de C/C++.", "install", "Desenvolvimento"));
    db.insert("python", ("Interpretador Python.", "safe", "Desenvolvimento"));
    db.insert("python3", ("Interpretador Python 3.", "safe", "Desenvolvimento"));
    db.insert("node", ("Interpretador JavaScript.", "safe", "Desenvolvimento"));
    db.insert("docker", ("Gerencia contêineres.", "install", "Desenvolvimento"));
    db.insert("cargo", ("Gerenciador de pacotes Rust.", "install", "Desenvolvimento"));

    // Compression
    db.insert("tar", ("Empacota/extrai arquivos .tar, .tar.gz.", "safe", "Compactação"));
    db.insert("gzip", ("Comprime/descomprime arquivos .gz.", "safe", "Compactação"));
    db.insert("gunzip", ("Descomprime arquivos .gz.", "safe", "Compactação"));
    db.insert("unzip", ("Extrai arquivos .zip.", "safe", "Compactação"));
    db.insert("zip", ("Comprime arquivos .zip.", "safe", "Compactação"));
    db.insert("unrar", ("Extrai arquivos .rar.", "safe", "Compactação"));

    // Shell utilities
    db.insert("echo", ("Mostra mensagem na tela.", "safe", "Terminal"));
    db.insert("export", ("Define variável de ambiente.", "safe", "Terminal"));
    db.insert("alias", ("Cria atalho para comando.", "safe", "Terminal"));
    db.insert("source", ("Executa script no terminal atual.", "safe", "Terminal"));
    db.insert("read", ("Lê entrada do usuário pelo teclado.", "safe", "Terminal"));
    db.insert("sleep", ("Pausa o script por alguns segundos.", "safe", "Terminal"));
    db.insert("exit", ("Encerra o script.", "safe", "Terminal"));
    db.insert("clear", ("Limpa a tela do terminal.", "safe", "Terminal"));
    db.insert("which", ("Mostra onde um programa está instalado.", "safe", "Terminal"));
    db.insert("cd", ("Navega entre pastas.", "safe", "Terminal"));
    db.insert("pwd", ("Mostra caminho da pasta atual.", "safe", "Terminal"));
    db.insert("ls", ("Lista arquivos e pastas.", "safe", "Terminal"));
    db.insert("set", ("Configura opções do shell.", "safe", "Terminal"));

    // Dangerous
    db.insert("dd", ("Copia dados em baixo nível. Pode danificar discos!", "danger", "Sistema"));
    db.insert("mkfs", ("Formata disco/partição. APAGA TUDO!", "danger", "Sistema"));
    db.insert("fdisk", ("Gerencia partições. Pode danificar dados!", "danger", "Sistema"));

    // Monitor
    db.insert("ps", ("Mostra processos em execução.", "safe", "Monitoramento"));
    db.insert("top", ("Processos em tempo real por CPU.", "safe", "Monitoramento"));
    db.insert("df", ("Mostra espaço livre nos discos.", "safe", "Monitoramento"));
    db.insert("du", ("Mostra tamanho de pastas/arquivos.", "safe", "Monitoramento"));
    db.insert("free", ("Mostra uso de RAM e swap.", "safe", "Monitoramento"));
    db.insert("uname", ("Mostra info do sistema (kernel).", "safe", "Monitoramento"));
    db.insert("lscpu", ("Info detalhada do processador.", "safe", "Monitoramento"));
    db.insert("lsblk", ("Lista discos e partições.", "safe", "Monitoramento"));
    db.insert("lspci", ("Mostra dispositivos conectados.", "safe", "Monitoramento"));
    db.insert("lsusb", ("Mostra dispositivos USB.", "safe", "Monitoramento"));

    db
}

fn is_download_pipe(content: &str) -> bool {
    let lower = content.to_lowercase();
    if lower.contains("curl") || lower.contains("wget") {
        if lower.contains("|")
            && (lower.contains("| bash") || lower.contains("| sh") || lower.contains("| sudo")) {
                return true;
            }
        if lower.contains("bash <(curl") || lower.contains("sh <(curl") || lower.contains("bash <(wget") {
            return true;
        }
    }
    false
}

fn is_dangerous_rm(content: &str) -> bool {
    let lower = content.to_lowercase();
    if lower.starts_with("rm")
        && (lower.contains(" /") || lower.contains(" /*")) {
            let clean = lower.replace("\\\"", "").replace("'", "");
            if clean.contains(" /") && !clean.contains(" /tmp") && !clean.contains(" /home") {
                return true;
            }
        }
    false
}

fn extract_command(line: &str) -> &str {
    let trimmed = line.trim();
    if trimmed.starts_with("#!") { return "#!/bin/bash"; }
    if trimmed.starts_with('#') { return "#"; }
    if trimmed.is_empty() { return ""; }

    if trimmed.starts_with('$') && trimmed.len() > 2 {
        let inner = &trimmed[2..].trim_start();
        return inner.split_whitespace().next().unwrap_or("");
    }

    let mut words = trimmed.split_whitespace().peekable();
    let mut cmd = words.next().unwrap_or("");

    while cmd.contains('=') && !cmd.starts_with('-') && words.peek().is_some() {
        cmd = words.next().unwrap_or("");
    }

    if cmd == ">" || cmd == "2>" || cmd == "1>" || cmd == "2>&1" {
        cmd = words.next().unwrap_or("");
    }
    if cmd == "sudo" || cmd == "pkexec" || cmd == "doas" {
        if let Some(real_cmd) = words.next() { return real_cmd; }
    }
    if cmd.ends_with(';') { cmd = &cmd[..cmd.len()-1]; }
    cmd
}

fn detect_script_type(content: &str) -> ScriptType {
    let first_line = content.lines().next().unwrap_or("").trim();
    if first_line.starts_with("#!") {
        if first_line.contains("python") || first_line.contains("python3") {
            return ScriptType::Python;
        }
        if first_line.contains("bash") || first_line.contains("sh") || first_line.contains("zsh") || first_line.contains("dash") {
            return ScriptType::Shell;
        }
    }
    for line in content.lines().take(10) {
        let t = line.trim();
        if t.starts_with("import ") || t.starts_with("from ") { return ScriptType::Python; }
        if t.starts_with("def ") || t.starts_with("class ") { return ScriptType::Python; }
    }
    ScriptType::Shell
}

fn analyze_python_line(line: &str, line_no: u32) -> Option<ScriptCommand> {
    let trimmed = line.trim();
    if trimmed.is_empty() || trimmed.starts_with('#') { return None; }

    let cmd = |command: &str, desc: &str, risk: &str, cat: &str, review: bool| -> Option<ScriptCommand> {
        Some(ScriptCommand {
            line: line_no, content: trimmed.to_string(), command: command.to_string(),
            description: desc.to_string(), risk: risk.to_string(),
            category: cat.to_string(), requires_review: review,
        })
    };

    if trimmed.contains("os.system(") || trimmed.contains("os.popen(") {
        return cmd("os.system", "Executa comando no terminal. PERIGOSO se for de fonte externa!", "danger", "Sistema", true);
    }
    if trimmed.contains("subprocess.") && (trimmed.contains(".call") || trimmed.contains(".run") || trimmed.contains(".Popen") || trimmed.contains(".check_output")) {
        return cmd("subprocess", "Executa comandos no terminal pelo Python.", "sudo", "Sistema", true);
    }
    if trimmed.contains("eval(") && !trimmed.starts_with('#') {
        return cmd("eval", "⚠️ PERIGOSO! Executa código dinâmico. Risco de segurança!", "danger", "Python", true);
    }
    if trimmed.contains("exec(") && !trimmed.starts_with('#') {
        return cmd("exec", "⚠️ PERIGOSO! Executa código arbitrário. Risco de segurança!", "danger", "Python", true);
    }
    if trimmed.contains("open(") && !trimmed.starts_with('#') {
        return cmd("open", "Abre arquivos para leitura/escrita.", "system", "Arquivos", false);
    }
    if trimmed.contains("requests.") || trimmed.contains("urlopen") || trimmed.contains("urllib.request") {
        return cmd("requests", "Faz requisições HTTP. Baixa/envia dados pela internet.", "download", "Rede", false);
    }

    if trimmed.starts_with("import ") || trimmed.starts_with("from ") {
        let import_name = if let Some(stripped) = trimmed.strip_prefix("import ") { stripped } else { &trimmed[5..] };
        let lib = import_name.split_whitespace().next().unwrap_or("").split('.').next().unwrap_or("");
        let (desc, risk): (&str, &str) = match lib {
            "os" => ("Funções do sistema (arquivos, comandos).", "system"),
            "sys" => ("Funções do interpretador Python.", "safe"),
            "subprocess" => ("Executa comandos no terminal.", "system"),
            "requests" | "urllib" => ("Faz requisições HTTP (internet).", "download"),
            "shutil" => ("Copia/move/apaga arquivos.", "system"),
            "socket" => ("Conexões de rede.", "download"),
            "pickle" | "ctypes" => ("⚠️ PERIGOSO com dados não confiáveis!", "danger"),
            _ => ("Biblioteca Python padrão.", "safe"),
        };
        return cmd(&format!("import {}", lib), desc, risk, "Python", risk == "danger");
    }

    if trimmed.starts_with("def ") || trimmed.starts_with("class ") {
        let kind = if trimmed.starts_with("def ") { "função" } else { "classe" };
        let name = trimmed[4..].split(['(', ':', ' ']).next().unwrap_or("");
        return cmd(&format!("{} {}", if trimmed.starts_with("def ") { "def" } else { "class" }, name),
            &format!("Define {} '{}'.", kind, name), "safe", "Python", false);
    }
    if trimmed.starts_with("print(") {
        return cmd("print", "Mostra mensagem na tela.", "safe", "Python", false);
    }
    if trimmed.starts_with("input(") {
        return cmd("input", "Pede entrada do usuário.", "safe", "Python", false);
    }
    if matches!(trimmed.split_whitespace().next().unwrap_or(""), "for" | "while" | "if" | "elif" | "else:" | "try:" | "except" | "with" | "return" | "raise" | "pass" | "break" | "continue") {
        let kw = trimmed.split_whitespace().next().unwrap_or("");
        return cmd(kw, "Palavra-chave de controle do Python.", "safe", "Python", false);
    }
    if trimmed.contains('=') && !trimmed.starts_with(' ') {
        let var_name = trimmed.split('=').next().unwrap_or("").trim();
        if !var_name.is_empty() && !var_name.contains(' ') && !var_name.starts_with('_') {
            return cmd(var_name, "Atribui valor a variável.", "safe", "Python", false);
        }
    }
    None
}

fn generate_summary(commands: &[ScriptCommand], has_download_execute: bool, has_dangerous: bool) -> String {
    if commands.is_empty() { return "Script vazio ou com apenas comentários.".to_string(); }

    let cat_set: std::collections::HashSet<&str> = commands.iter().map(|c| c.category.as_str()).collect();
    let categories: Vec<&str> = cat_set.into_iter().collect();

    let install_count = commands.iter().filter(|c| c.risk == "install" || (c.risk == "sudo" && c.category == "Pacotes")).count();
    let sudo_count = commands.iter().filter(|c| c.risk == "sudo" || c.content.contains("sudo ")).count();
    let download_count = commands.iter().filter(|c| c.risk == "download").count();

    let mut parts: Vec<String> = Vec::new();
    parts.push(format!("{} comandos encontrados", commands.len()));

    if install_count > 0 { parts.push(format!("instala {} pacote(s)", install_count)); }
    if download_count > 0 { parts.push(format!("baixa {} arquivo(s) da internet", download_count)); }
    if sudo_count > 0 { parts.push(format!("requer senha {} vez(es)", sudo_count)); }
    if has_download_execute { parts.push("⚠️ baixa e executa código da internet".to_string()); }
    if has_dangerous { parts.push("☠️ contém operações de ALTO RISCO".to_string()); }
    if !categories.is_empty() { parts.push(format!("categorias: {}", categories.join(", "))); }

    parts.join(". ")
}

fn analyze_shell_script(content: &str) -> (Vec<ScriptCommand>, bool, bool, bool, bool) {
    let db = get_command_database();
    let mut commands = Vec::new();
    let mut has_sudo = false;
    let mut has_install = false;
    let mut has_download_execute = false;
    let mut has_dangerous = false;

    for (i, line) in content.lines().enumerate() {
        let line_no = (i + 1) as u32;
        let t = line.trim();
        if t.is_empty() { continue; }
        if t == "#" || t.starts_with("# ") { continue; }
        if t.starts_with("#!") {
            commands.push(ScriptCommand {
                line: line_no, content: t.to_string(), command: "#!/bin/bash".to_string(),
                description: "Define interpretador Bash para o script.".to_string(),
                risk: "safe".to_string(), category: "Terminal".to_string(), requires_review: false,
            });
            continue;
        }
        if t.starts_with('#') { continue; }

        let cmd = extract_command(line);
        let cmd_lower = cmd.to_lowercase();
        if cmd.is_empty() || line.trim().ends_with('\\') { continue; }
        if matches!(cmd, "then" | "else" | "fi" | "do" | "done" | "in") {
            commands.push(ScriptCommand {
                line: line_no, content: t.to_string(), command: cmd.to_string(),
                description: format!("Controle Bash ({})", cmd),
                risk: "safe".to_string(), category: "Terminal".to_string(), requires_review: false,
            });
            continue;
        }

        if is_download_pipe(t) {
            has_download_execute = true;
            commands.push(ScriptCommand {
                line: line_no, content: t.to_string(), command: cmd.to_string(),
                description: "⚠️ Baixa e EXECUTA código da internet!".to_string(), risk: "danger".to_string(),
                category: "Rede".to_string(), requires_review: true,
            });
            continue;
        }
        if is_dangerous_rm(t) {
            has_dangerous = true;
            commands.push(ScriptCommand {
                line: line_no, content: t.to_string(), command: cmd.to_string(),
                description: "⚠️ Remove arquivos do sistema!".to_string(), risk: "danger".to_string(),
                category: "Arquivos".to_string(), requires_review: true,
            });
            continue;
        }

        // Detect if line uses sudo/pkexec/doas (extract_command strips the prefix)
        let has_sudo_prefix = t.starts_with("sudo ") || t.starts_with("pkexec ") || t.starts_with("doas ");
        if has_sudo_prefix {
            has_sudo = true;
        }
        if let Some((desc, risk, category)) = db.get(cmd_lower.as_str()) {
            if *risk == "install" { has_install = true; }
            if *risk == "danger" { has_dangerous = true; }
            let erisk = if has_sudo_prefix { "sudo" } else { risk };
            commands.push(ScriptCommand {
                line: line_no, content: t.to_string(), command: cmd.to_string(),
                description: desc.to_string(), risk: erisk.to_string(),
                category: category.to_string(), requires_review: *risk == "danger" || has_sudo_prefix,
            });
        } else {
            commands.push(ScriptCommand {
                line: line_no, content: t.to_string(), command: cmd.to_string(),
                description: format!("Comando '{}' não reconhecido.", cmd),
                risk: if has_sudo_prefix { "sudo".to_string() } else { "safe".to_string() },
                category: "Desconhecido".to_string(), requires_review: true,
            });
        }
    }
    (commands, has_sudo, has_install, has_download_execute, has_dangerous)
}

pub fn analyze_script(content: &str) -> ScriptAnalysis {
    let script_type = detect_script_type(content);
    let total_lines = content.lines().count() as u32;
    let mut commands = Vec::new();
    let mut has_sudo = false;
    let mut has_install = false;
    let mut has_download_execute = false;
    let mut has_dangerous = false;

    match script_type {
        ScriptType::Python => {
            for (i, line) in content.lines().enumerate() {
                if let Some(c) = analyze_python_line(line, (i + 1) as u32) {
                    match c.risk.as_str() {
                        "danger" => { has_dangerous = true; has_download_execute = has_download_execute || c.category == "Rede"; }
                        "sudo" | "system" => has_sudo = true,
                        "download" => has_download_execute = true,
                        _ => {}
                    }
                    commands.push(c);
                }
            }
        }
        ScriptType::Shell => {
            let r = analyze_shell_script(content);
            commands = r.0; has_sudo = r.1; has_install = r.2; has_download_execute = r.3; has_dangerous = r.4;
        }
        ScriptType::Unknown => {}
    }

    let risk_level = if has_dangerous { "danger" }
        else if has_download_execute { "warning" }
        else if has_install || has_sudo { "medium" }
        else { "safe" };

    ScriptAnalysis {
        summary: generate_summary(&commands, has_download_execute, has_dangerous),
        total_lines, command_count: commands.len() as u32,
        script_type: format!("{:?}", script_type).to_lowercase(),
        risk_level: risk_level.to_string(),
        commands, has_sudo, has_install, has_download_execute, has_dangerous,
        ai_explanation: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_analyze_shell_simple() {
        let r = analyze_script("#!/bin/bash\necho hi\nls -la\npwd\n");
        assert_eq!(r.script_type, "shell");
        assert_eq!(r.command_count, 4);
        assert_eq!(r.risk_level, "safe");
    }

    #[test]
    fn test_analyze_shell_sudo() {
        let r = analyze_script("#!/bin/bash\nsudo apt update\nsudo apt install firefox\n");
        assert!(r.has_sudo);
        assert!(r.has_install);
        assert_eq!(r.script_type, "shell");
    }

    #[test]
    fn test_analyze_shell_download_pipe() {
        let r = analyze_script("#!/bin/bash\ncurl -sSL https://example.com | bash\n");
        assert!(r.has_download_execute);
        assert_eq!(r.risk_level, "warning");
    }

    #[test]
    fn test_analyze_shell_dangerous_rm() {
        let r = analyze_script("#!/bin/bash\nrm -rf /var/log\n");
        assert!(r.has_dangerous);
        assert_eq!(r.risk_level, "danger");
    }

    #[test]
    fn test_analyze_shell_empty() {
        let r = analyze_script("");
        assert_eq!(r.command_count, 0);
    }

    #[test]
    fn test_analyze_shell_comments_only() {
        let r = analyze_script("# comment\n# another\n");
        assert_eq!(r.command_count, 0);
    }

    #[test]
    fn test_analyze_shell_install() {
        let r = analyze_script("#!/bin/bash\napt install -y vim git\n");
        assert!(r.has_install);
    }

    #[test]
    fn test_analyze_shell_summary() {
        let r = analyze_script("sudo apt install firefox\nsudo apt install vlc\n");
        assert!(r.summary.contains("instala"));
    }

    #[test]
    fn test_analyze_shell_complex() {
        let r = analyze_script("#!/bin/bash\nset -e\necho 'test'\nsudo apt update\nsudo apt install -y build-essential git\nwget http://example.com/tool.tar.gz\ntar xzf tool.tar.gz\ncd tool\n./configure\nmake\nsudo make install\necho 'Done'\n");
        assert_eq!(r.risk_level, "medium");
        assert!(r.has_sudo);
        assert!(r.has_install);
        assert!(r.command_count > 5);
    }

    #[test]
    fn test_analyze_python_simple() {
        let r = analyze_script("#!/usr/bin/python3\nimport os\nimport sys\nprint('Hello')\n");
        assert_eq!(r.script_type, "python");
        assert!(r.command_count > 0);
    }

    #[test]
    fn test_analyze_python_dangerous() {
        let r = analyze_script("import os\nos.system('rm -rf /')\n");
        assert_eq!(r.script_type, "python");
        assert!(r.has_dangerous);
        assert_eq!(r.risk_level, "danger");
    }

    #[test]
    fn test_analyze_python_eval() {
        let r = analyze_script("import sys\neval('1+1')\n");
        assert!(r.has_dangerous);
    }

    #[test]
    fn test_detect_type() {
        assert_eq!(detect_script_type("#!/bin/bash\n"), ScriptType::Shell);
        assert_eq!(detect_script_type("#!/usr/bin/python3\n"), ScriptType::Python);
        assert_eq!(detect_script_type("import os\n"), ScriptType::Python);
    }

    #[test]
    fn test_download_pipe() {
        assert!(is_download_pipe("curl https://ex.com | bash"));
        assert!(is_download_pipe("bash <(curl https://ex.com)"));
        assert!(!is_download_pipe("curl -o file.sh https://ex.com"));
    }

    #[test]
    fn test_unknown_command() {
        let r = analyze_script("random_tool_123 --version\n");
        assert_eq!(r.command_count, 1);
        assert!(r.commands[0].description.contains("não reconhecido"));
    }

    #[test]
    fn test_known_db() {
        let db = get_command_database();
        assert!(db.contains_key("apt"));
        assert!(db.contains_key("python"));
    }
}
