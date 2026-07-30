use tauri::Emitter;
use crate::{get_cached_password, set_cached_password, updater};

#[tauri::command]
pub async fn check_app_update() -> Result<updater::UpdateInfo, String> {
    updater::check_update().await
}

#[tauri::command]
pub async fn install_update(app: tauri::AppHandle, password: Option<String>) -> Result<(), String> {
    let password = password.or_else(get_cached_password).ok_or("Senha não fornecida.")?;
    let info = updater::check_update().await?;

    if !info.update_available {
        return Err("Nenhuma atualização disponível.".to_string());
    }

    let binary_path = updater::download_release(&info.download_url, &app).await?;

    let _ = app.emit("update-progress", updater::UpdateProgress {
        stage: "verify".into(),
        percent: 0,
        message: "Verificando integridade...".into(),
    });

    if !info.checksum_url.is_empty() {
        let checksum_text = updater::download_checksum(&info.checksum_url).await?;
        let expected = updater::parse_checksum(
            &checksum_text,
            &std::path::Path::new(&info.download_url)
                .file_name()
                .map(|f| f.to_string_lossy().to_string())
                .unwrap_or_default(),
        ).map_err(|_| "Checksum não encontrado para validação.".to_string())?;
        updater::validate_checksum(&binary_path, &expected)?;
    }

    let _ = app.emit("update-progress", updater::UpdateProgress {
        stage: "install".into(),
        percent: 0,
        message: "Instalando atualização...".into(),
    });

    updater::install_update(&binary_path, &password, &app).await?;

    let _ = app.emit("update-progress", updater::UpdateProgress {
        stage: "restart".into(),
        percent: 100,
        message: "Reiniciando Solix...".into(),
    });

    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
    updater::restart_application()
        .map_err(|e| format!("Erro ao reiniciar: {}", e))?;

    Ok(())
}