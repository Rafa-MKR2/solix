use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct DiskUsageItem {
    pub path: String,
    pub size: String,
}

#[derive(Debug, Serialize)]
pub struct SmartAttribute {
    pub id: u8,
    pub name: String,
    pub value: u8,
    pub worst: u8,
    pub threshold: u8,
    pub raw: String,
    pub status: String,
}

#[derive(Debug, Serialize)]
pub struct SmartCommandInfo {
    pub command: String,
    pub description: String,
}

#[derive(Debug, Serialize)]
pub struct SmartInfo {
    pub device: String,
    pub device_model: String,
    pub health: String,
    pub temperature: String,
    pub power_on_hours: String,
    pub attributes: Vec<SmartAttribute>,
    pub smart_available: bool,
    pub error_message: String,
    pub commands_used: Vec<SmartCommandInfo>,
}

fn sanitize_path(input: &str) -> String {
    input.chars().filter(|c| c.is_alphanumeric() || *c == '/' || *c == '-' || *c == '_' || *c == '.').collect()
}

#[tauri::command]
pub async fn open_file_manager(path: String) -> Result<(), String> {
    let dir = if path.is_empty() { "/".to_string() } else { path };
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

async fn run_sudo_smartctl(args: &[&str], device_path: &str, password: &Option<String>) -> Result<std::process::Output, String> {
    let full_cmd = format!("sudo -S smartctl {} {}", args.join(" "), device_path);
    if let Some(pwd) = password {
        let mut child = tokio::process::Command::new("sh")
            .arg("-c")
            .arg(&full_cmd)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Erro ao executar smartctl: {}", e))?;
        let _ = crate::password::pipe_password(&mut child, pwd).await;
        let output = child.wait_with_output().await.map_err(|e| format!("Erro smartctl: {}", e))?;
        Ok(output)
    } else {
        tokio::process::Command::new("sudo")
            .args(["-n", "smartctl"])
            .args(args)
            .arg(device_path)
            .output()
            .await
            .map_err(|e| format!("Erro smartctl: {}", e))
    }
}

#[tauri::command]
pub async fn get_disk_smart_info(device: String, password: Option<String>) -> Result<SmartInfo, String> {
    let pwd = password.or_else(crate::get_cached_password);
    let device_path = format!("/dev/{}", device.trim());

    let commands_used = vec![
        SmartCommandInfo {
            command: format!("smartctl -H {}", device_path),
            description: "Verifica o status geral de saúde do disco usando S.M.A.R.T. (Self-Monitoring, Analysis and Reporting Technology). Retorna PASSED se o disco está saudável ou FAILED se detectou problemas críticos.".to_string(),
        },
        SmartCommandInfo {
            command: format!("smartctl -A {}", device_path),
            description: "Lista todos os atributos S.M.A.R.T. do disco. Cada atributo monitora um aspecto específico da saúde: setores realocados, temperatura, horas de uso, erros de leitura, etc.".to_string(),
        },
    ];

    let which = tokio::process::Command::new("sh")
        .arg("-c")
        .arg("which smartctl 2>/dev/null || echo ''")
        .output()
        .await
        .map_err(|e| format!("Erro ao verificar smartctl: {}", e))?;
    let smartctl_path = String::from_utf8_lossy(&which.stdout).trim().to_string();

    if smartctl_path.is_empty() {
        return Ok(SmartInfo {
            device: device.clone(),
            device_model: String::new(),
            health: "NOT_AVAILABLE".into(),
            temperature: String::new(),
            power_on_hours: String::new(),
            attributes: vec![],
            smart_available: false,
            error_message: "smartctl não está instalado. Instale o pacote 'smartmontools' para habilitar o monitoramento S.M.A.R.T.".to_string(),
            commands_used,
        });
    }

    let info_output = run_sudo_smartctl(&["-i"], &device_path, &pwd).await?;
    let info_text = String::from_utf8_lossy(&info_output.stdout);
    let _info_stderr = String::from_utf8_lossy(&info_output.stderr);

    if info_text.contains("Unknown USB bridge") || info_text.contains("device lacks SMART capability") {
        return Ok(SmartInfo {
            device: device.clone(),
            device_model: String::new(),
            health: "UNSUPPORTED".into(),
            temperature: String::new(),
            power_on_hours: String::new(),
            attributes: vec![],
            smart_available: false,
            error_message: "Este dispositivo não suporta S.M.A.R.T. ou é uma unidade USB externa não compatível.".to_string(),
            commands_used,
        });
    }

    let device_model = info_text.lines()
        .find(|l| l.contains("Device Model") || l.contains("Product") || l.contains("Model Number") || l.contains("Model Family"))
        .and_then(|l| l.split(':').nth(1))
        .map(|s| s.trim().to_string())
        .unwrap_or_default();

    let health_output = run_sudo_smartctl(&["-H"], &device_path, &pwd).await?;
    let health_text = String::from_utf8_lossy(&health_output.stdout);

    let health = if health_text.contains("PASSED") {
        "PASSED".to_string()
    } else if health_text.contains("FAILED") || health_text.contains("FAILING") {
        "FAILED".to_string()
    } else {
        "UNKNOWN".to_string()
    };

    let attr_output = run_sudo_smartctl(&["-A"], &device_path, &pwd).await?;
    let attr_text = String::from_utf8_lossy(&attr_output.stdout);

    let temperature = attr_text.lines()
        .find(|l| l.contains("Temperature_Celsius") || l.contains("Airflow_Temperature_Cel") || l.contains("Temp") || l.contains("Temperature"))
        .and_then(|l| {
            let parts: Vec<&str> = l.split_whitespace().collect();
            parts.get(9).map(|v| format!("{}°C", v))
        })
        .unwrap_or_default();

    let power_on_hours = attr_text.lines()
        .find(|l| l.contains("Power_On_Hours") || l.contains("Power_On_Minutes") || l.contains("Power_On"))
        .and_then(|l| {
            let parts: Vec<&str> = l.split_whitespace().collect();
            parts.get(9).map(|v| format!("{}h", v))
        })
        .unwrap_or_default();

    let attributes: Vec<SmartAttribute> = attr_text.lines()
        .filter(|l| {
            l.trim().starts_with(|c: char| c.is_ascii_digit())
            && l.split_whitespace().count() >= 10
        })
        .filter_map(|l| {
            let parts: Vec<&str> = l.split_whitespace().collect();
            if parts.len() < 10 { return None; }

            let id = parts[0].parse::<u8>().ok()?;
            let name = parts[1].to_string();
            let value = parts[2].parse::<u8>().ok()?;
            let worst = parts[3].parse::<u8>().ok()?;
            let threshold = parts[4].parse::<u8>().ok().unwrap_or(0);
            let raw = parts[9..].join(" ");

            let status = if value <= threshold && threshold > 0 {
                "bad"
            } else if value < 100 && value > threshold {
                "warn"
            } else {
                "good"
            };

            Some(SmartAttribute {
                id,
                name,
                value,
                worst,
                threshold,
                raw,
                status: status.to_string(),
            })
        })
        .collect();

    Ok(SmartInfo {
        device: device.clone(),
        device_model,
        health,
        temperature,
        power_on_hours,
        attributes,
        smart_available: true,
        error_message: String::new(),
        commands_used,
    })
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
        assert_eq!(sanitize_path("/usr/share/applications"), "/usr/share/applications");
        assert_eq!(sanitize_path("/home/user/my-app_1.0.deb"), "/home/user/my-app_1.0.deb");
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

    #[test]
    fn test_smart_attribute_struct() {
        let attr = SmartAttribute {
            id: 5,
            name: "Reallocated_Sector_Ct".into(),
            value: 100,
            worst: 100,
            threshold: 10,
            raw: "0".into(),
            status: "ok".into(),
        };
        assert_eq!(attr.id, 5);
        assert_eq!(attr.name, "Reallocated_Sector_Ct");
        assert_eq!(attr.status, "ok");
    }

    #[test]
    fn test_smart_command_info_struct() {
        let cmd = SmartCommandInfo {
            command: "smartctl -a /dev/sda".into(),
            description: "Full info".into(),
        };
        assert_eq!(cmd.command, "smartctl -a /dev/sda");
    }

    #[test]
    fn test_smart_info_struct() {
        let info = SmartInfo {
            device: "/dev/sda".into(),
            device_model: "Samsung SSD 860".into(),
            health: "PASSED".into(),
            temperature: "30°C".into(),
            power_on_hours: "1000h".into(),
            attributes: vec![],
            smart_available: true,
            error_message: String::new(),
            commands_used: vec![],
        };
        assert_eq!(info.device, "/dev/sda");
        assert!(info.smart_available);
        assert!(info.error_message.is_empty());
    }
}