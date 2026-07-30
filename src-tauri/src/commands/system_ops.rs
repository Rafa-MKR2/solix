use crate::system_ops;

#[tauri::command]
pub async fn enable_zram(app: tauri::AppHandle, password: Option<String>) -> Result<crate::install::InstallResult, String> {
    let pwd = password.or_else(crate::get_cached_password).ok_or("Senha não fornecida.")?;
    system_ops::enable_zram(&pwd, Some(&app)).await
}

#[tauri::command]
pub async fn cleanup_system(app: tauri::AppHandle, password: Option<String>) -> Result<crate::install::InstallResult, String> {
    let pwd = password.or_else(crate::get_cached_password).ok_or("Senha não fornecida.")?;
    system_ops::cleanup_system(&pwd, Some(&app)).await
}

#[tauri::command]
pub async fn get_battery() -> Result<crate::system_ops::BatteryInfo, String> {
    let info = tokio::task::spawn_blocking(crate::system_ops::get_battery_info)
        .await
        .map_err(|_| "Erro ao carregar informações da bateria".to_string())?;
    Ok(info)
}