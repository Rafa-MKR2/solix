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

/// Registra erros do frontend (console.error/window.onerror) no log do Rust
/// (tracing). Erros do webview não vão para stdout por padrão — este hook
/// garante que falhas (ex.: upload) apareçam em /tmp/solix-app.log.
#[tauri::command]
pub fn log_frontend_error(message: String) {
    tracing::warn!("[frontend] {}", message);
}
