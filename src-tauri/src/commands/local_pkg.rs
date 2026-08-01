use crate::package_installer;

#[tauri::command]
pub async fn inspect_local_package(
    path: String,
) -> Result<package_installer::LocalPackageInfo, String> {
    let info = tokio::task::spawn_blocking(move || package_installer::inspect_package(&path))
        .await
        .map_err(|_| "Erro ao inspecionar pacote".to_string())??;
    Ok(info)
}

#[tauri::command]
pub async fn inspect_package_data(
    data: String,
    file_name: String,
) -> Result<package_installer::LocalPackageInfo, String> {
    let info = tokio::task::spawn_blocking(move || {
        package_installer::inspect_package_data(&data, &file_name)
    })
    .await
    .map_err(|_| "Erro ao inspecionar pacote".to_string())??;
    Ok(info)
}

#[tauri::command]
pub async fn install_local_package(
    path: String,
    password: Option<String>,
) -> Result<crate::install::InstallResult, String> {
    let pwd = password
        .or_else(crate::get_cached_password)
        .ok_or("Senha não fornecida.")?;
    let result = package_installer::install_local_package(&path, &pwd).await?;
    Ok(result)
}

#[tauri::command]
pub async fn install_package_data(
    data: String,
    file_name: String,
    password: Option<String>,
) -> Result<crate::install::InstallResult, String> {
    let pwd = password
        .or_else(crate::get_cached_password)
        .ok_or("Senha não fornecida.")?;
    let result = package_installer::install_package_data(&data, &file_name, &pwd).await?;
    Ok(result)
}
