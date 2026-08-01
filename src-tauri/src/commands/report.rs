// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2

#[tauri::command]
pub async fn save_report_to_desktop(content: String) -> Result<String, String> {
    let home = std::env::var("HOME").map_err(|_| "Variável HOME não encontrada".to_string())?;
    let candidates = vec![
        format!("{}/Área de Trabalho", home),
        format!("{}/Desktop", home),
        format!("{}/Escritorio", home),
        home.clone(),
    ];
    let dest = candidates
        .into_iter()
        .find(|p| std::path::Path::new(p).exists())
        .unwrap_or(home.clone());

    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| "Erro ao obter tempo".to_string())?
        .as_secs();
    let filename = format!("{}/solix-report-{}.txt", dest, secs);

    tokio::fs::write(&filename, &content)
        .await
        .map_err(|e| format!("Erro ao salvar arquivo: {}", e))?;

    Ok(filename)
}
