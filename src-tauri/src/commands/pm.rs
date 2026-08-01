use crate::package_manager;

#[tauri::command]
pub async fn list_installed_packages() -> Result<Vec<package_manager::InstalledPackage>, String> {
    let pkgs = tokio::task::spawn_blocking(package_manager::list_installed)
        .await
        .map_err(|_| "Erro ao listar pacotes".to_string())?;
    Ok(pkgs)
}

#[tauri::command]
pub async fn search_repo_packages(
    query: String,
) -> Result<Vec<package_manager::RepoPackage>, String> {
    let pkgs = tokio::task::spawn_blocking(move || package_manager::search_repos(&query))
        .await
        .map_err(|_| "Erro ao buscar pacotes".to_string())?;
    Ok(pkgs)
}

#[tauri::command]
pub async fn get_package_history() -> Result<Vec<package_manager::PackageHistoryEntry>, String> {
    let entries = tokio::task::spawn_blocking(package_manager::get_history)
        .await
        .map_err(|_| "Erro ao carregar histórico".to_string())?;
    Ok(entries)
}

#[tauri::command]
pub async fn remove_system_packages(
    package_names: Vec<String>,
    password: Option<String>,
) -> Result<Vec<String>, String> {
    let pwd = password
        .or_else(crate::get_cached_password)
        .ok_or("Senha não fornecida.")?;
    package_manager::remove_system_packages(&pwd, &package_names).await
}

#[tauri::command]
pub async fn install_repo_packages(
    package_names: Vec<String>,
    password: Option<String>,
) -> Result<Vec<String>, String> {
    let pwd = password
        .or_else(crate::get_cached_password)
        .ok_or("Senha não fornecida.")?;
    package_manager::install_repo_packages(&pwd, &package_names).await
}
