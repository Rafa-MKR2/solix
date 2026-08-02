use crate::script_analyzer;

#[tauri::command]
pub async fn analyze_script(content: String) -> Result<script_analyzer::ScriptAnalysis, String> {
    let analysis = tokio::task::spawn_blocking(move || script_analyzer::analyze_script(&content))
        .await
        .map_err(|_| "Erro ao analisar script".to_string())?;
    Ok(analysis)
}

/// Lê um arquivo de script do disco (caminho absoluto vindo do diálogo nativo
/// ou do evento `tauri://drag-drop`) e o analisa.
#[tauri::command]
pub async fn analyze_script_file(path: String) -> Result<script_analyzer::ScriptAnalysis, String> {
    // Lê como bytes e converte com perda (lossy): aceita scripts em
    // Latin-1/ISO-8859-1 (comum em arquivos legados), que falhariam com
    // read_to_string por conter bytes UTF-8 inválidos.
    let bytes = tokio::fs::read(&path)
        .await
        .map_err(|e| format!("Erro ao ler arquivo: {}", e))?;
    let content = String::from_utf8_lossy(&bytes).into_owned();
    let analysis = tokio::task::spawn_blocking(move || script_analyzer::analyze_script(&content))
        .await
        .map_err(|_| "Erro ao analisar script".to_string())?;
    Ok(analysis)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn analyze_script_file_reads_temp_file_and_analyzes() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("test.sh");
        std::fs::write(&path, "#!/bin/bash\nsudo apt update\nls -la\n").expect("write");

        let analysis = analyze_script_file(path.to_string_lossy().into_owned())
            .await
            .expect("análise deve funcionar");

        assert_eq!(analysis.script_type, "shell");
        assert!(analysis.has_sudo, "sudo deve ser sinalizado");
        assert!(analysis.command_count >= 2);
    }

    #[tokio::test]
    async fn analyze_script_file_latin1_encoding_does_not_fail() {
        // Script em Latin-1/ISO-8859-1 (acentos): read_to_string falharia com
        // erro de UTF-8 inválido — deve ser aceito via from_utf8_lossy.
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("latin1.sh");
        // 'á' em Latin-1 (0xE1) — byte inválido em UTF-8 isolado.
        std::fs::write(&path, b"#!/bin/bash\necho 'Ol\xE1 mundo'\n").expect("write");

        let analysis = analyze_script_file(path.to_string_lossy().into_owned())
            .await
            .expect("análise deve funcionar mesmo com encoding Latin-1");

        assert!(analysis.command_count >= 1);
    }

    #[tokio::test]
    async fn analyze_script_file_python_temp_file() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("test.py");
        std::fs::write(&path, "#!/usr/bin/env python3\nimport os\nprint('oi')\n").expect("write");

        let analysis = analyze_script_file(path.to_string_lossy().into_owned())
            .await
            .expect("análise deve funcionar");

        assert_eq!(analysis.script_type, "python");
        assert!(analysis.command_count >= 1);
    }

    #[tokio::test]
    async fn analyze_script_file_missing_file_returns_error() {
        // Caminho dentro de um tempdir vazio — garante que o arquivo não existe.
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("nao_existe.sh");
        let result = analyze_script_file(path.to_string_lossy().into_owned()).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Erro ao ler arquivo"));
    }
}
