// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2

#[tauri::command]
pub async fn open_url(url: String) -> Result<(), String> {
    tokio::process::Command::new("/usr/bin/xdg-open")
        .arg(&url)
        .spawn()
        .map_err(|e| format!("Erro ao abrir URL: {}", e))?;
    Ok(())
}
