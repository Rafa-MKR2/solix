// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2

#[tauri::command]
pub async fn create_desktop_shortcut(name: String) -> Result<String, String> {
    let home = std::env::var("HOME").map_err(|_| "HOME not found".to_string())?;

    let safe_name: String = name
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
        .collect();
    if safe_name.is_empty() {
        return Err("Invalid tool name.".to_string());
    }

    let which = tokio::process::Command::new("which")
        .arg(&safe_name)
        .output()
        .await
        .map_err(|e| format!("Error finding binary: {}", e))?;
    let exec_path = String::from_utf8_lossy(&which.stdout).trim().to_string();
    if exec_path.is_empty() {
        return Err(format!("Could not find binary for '{}'", safe_name));
    }

    let candidates = vec![
        format!("{}/Área de Trabalho", home),
        format!("{}/Desktop", home),
        format!("{}/Escritorio", home),
        home.clone(),
    ];
    let dest = candidates
        .into_iter()
        .find(|p| std::path::Path::new(p).exists())
        .unwrap_or_else(|| {
            tracing::warn!("Nenhum diretório Desktop encontrado, usando HOME como fallback");
            home
        });

    let desktop_path = format!("{}/{}.desktop", dest, safe_name);

    if std::path::Path::new(&desktop_path).exists() {
        return Ok(format!("Shortcut already exists: {}", desktop_path));
    }

    let icon = safe_name.clone();

    let content = format!(
        "[Desktop Entry]\nName={}\nExec={}\nIcon={}\nTerminal=false\nType=Application\nCategories=Utility;\n",
        safe_name, exec_path, icon
    );

    tokio::fs::write(&desktop_path, &content)
        .await
        .map_err(|e| format!("Error writing shortcut: {}", e))?;

    tokio::process::Command::new("chmod")
        .args(["+x", &desktop_path])
        .output()
        .await
        .map_err(|e| format!("Error making shortcut executable: {}", e))?;

    Ok(desktop_path)
}
