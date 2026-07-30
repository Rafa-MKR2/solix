use crate::script_analyzer;

#[tauri::command]
pub async fn analyze_script(content: String) -> Result<script_analyzer::ScriptAnalysis, String> {
    let analysis = tokio::task::spawn_blocking(move || {
        script_analyzer::analyze_script(&content)
    })
    .await
    .map_err(|_| "Erro ao analisar script".to_string())?;
    Ok(analysis)
}