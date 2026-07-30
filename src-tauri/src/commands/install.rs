use crate::{get_cached_password, set_cached_password, install, password};

#[tauri::command]
pub async fn get_install_command(tool_name: String) -> Result<install::InstallCommandResult, String> {
    install::get_install_command(&tool_name).await
}

#[tauri::command]
pub async fn set_password(password: String) -> Result<(), String> {
    password::verify_password(&password).await?;
    set_cached_password(password);
    Ok(())
}

#[tauri::command]
pub async fn clear_password() -> Result<(), String> {
    crate::clear_cached_password();
    Ok(())
}

#[tauri::command]
pub async fn install_tools(app: tauri::AppHandle, tool_names: Vec<String>, password: Option<String>) -> Result<Vec<install::InstallResult>, String> {
    let pwd = password.or_else(get_cached_password).ok_or("Senha não fornecida. Use set_password primeiro.")?;
    install::install_tools(&tool_names, &pwd, Some(&app)).await
}

#[tauri::command]
pub async fn remove_tools(app: tauri::AppHandle, tool_names: Vec<String>, password: Option<String>) -> Result<Vec<install::InstallResult>, String> {
    let pwd = password.or_else(get_cached_password).ok_or("Senha não fornecida.")?;
    install::remove_tools(&tool_names, &pwd, Some(&app)).await
}

#[tauri::command]
pub async fn update_system(app: tauri::AppHandle, password: Option<String>) -> Result<install::InstallResult, String> {
    let pwd = password.or_else(get_cached_password).ok_or("Senha não fornecida.")?;
    install::update_system(&pwd, Some(&app)).await
}

#[tauri::command]
pub async fn check_pm_lock() -> Result<install::PmLockInfo, String> {
    let info = tokio::task::spawn_blocking(|| {
        install::check_pm_lock_sync()
    })
    .await
    .map_err(|_| "Erro ao verificar lock".to_string())?;
    Ok(info)
}

#[tauri::command]
pub async fn cancel_operation() -> Result<(), String> {
    install::cancel_operation_inner().await;
    Ok(())
}