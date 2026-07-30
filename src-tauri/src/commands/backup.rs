use crate::backup;

#[tauri::command]
pub async fn create_backup(source: String, destination: String, mount_point: String) -> Result<backup::BackupResult, String> {
    backup::create_backup(&source, &destination, &mount_point).await
}