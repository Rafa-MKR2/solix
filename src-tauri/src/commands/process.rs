use crate::stats;

#[tauri::command]
pub async fn kill_process(name: String) -> Result<String, String> {
    let allowed = ["pamac", "pamac-manager", "discover", "kpackagekit"];
    if !allowed.contains(&name.as_str()) {
        return Err("Processo não permitido.".to_string());
    }
    let output = tokio::process::Command::new("sh")
        .arg("-c")
        .arg(format!(
            "pkill -f '{}' 2>/dev/null; echo done",
            name.replace('\'', "'\\''")
        ))
        .output()
        .await
        .map_err(|e| format!("Falha ao executar: {}", e))?;
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
pub async fn remove_lock_files() -> Result<String, String> {
    let output = tokio::process::Command::new("sh")
        .arg("-c")
        .arg("rm -f /var/lib/pacman/db.lck /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock 2>/dev/null; echo done")
        .output()
        .await
        .map_err(|e| format!("Falha ao remover lock: {}", e))?;
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
pub async fn run_simple_command(command: String) -> Result<String, String> {
    let allowed_commands = [
        "pkill -f pamac 2>/dev/null; pkill -f pamac-manager 2>/dev/null; echo done",
        "pkill -f discover 2>/dev/null; echo done",
        "pkill -f kpackagekit 2>/dev/null; echo done",
    ];
    if allowed_commands.contains(&command.as_str()) {
        let output = tokio::process::Command::new("sh")
            .arg("-c")
            .arg(&command)
            .output()
            .await
            .map_err(|e| format!("Falha ao executar comando: {}", e))?;
        return Ok(String::from_utf8_lossy(&output.stdout).to_string());
    }
    Err("Comando não permitido.".to_string())
}

#[tauri::command]
pub async fn get_processes() -> Result<Vec<stats::ProcessInfo>, String> {
    let list = tokio::task::spawn_blocking(stats::get_processes)
        .await
        .map_err(|_| "Erro ao carregar lista de processos".to_string())?;
    Ok(list)
}
