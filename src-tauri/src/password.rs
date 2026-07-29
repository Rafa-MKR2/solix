// SPDX-License-Identifier: MIT

use tokio::io::AsyncWriteExt;

/// Envia a senha para o stdin do processo via pipe e fecha a entrada.
pub async fn pipe_password(child: &mut tokio::process::Child, password: &str) -> Result<(), String> {
    if let Some(mut stdin) = child.stdin.take() {
        let input = format!("{}\n", password);
        stdin.write_all(input.as_bytes()).await.map_err(|e| format!("Erro ao enviar senha: {}", e))?;
        stdin.shutdown().await.map_err(|e| format!("Erro ao fechar entrada: {}", e))?;
    }
    Ok(())
}

/// Cria um processo `sudo -S echo ok` e verifica se a senha está correta.
pub async fn verify_password(password: &str) -> Result<(), String> {
    let mut child = tokio::process::Command::new("sh")
        .arg("-c")
        .arg("sudo -S echo ok")
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Erro ao executar sudo: {}", e))?;

    pipe_password(&mut child, password).await?;

    let output = child.wait_with_output().await.map_err(|e| format!("Erro ao aguardar sudo: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(stderr.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pipe_password_no_stdin() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let mut child = tokio::process::Command::new("echo")
                .arg("ok")
                .stdout(std::process::Stdio::null())
                .spawn()
                .unwrap();
            let result = pipe_password(&mut child, "test").await;
            assert!(result.is_ok());
            let _ = child.wait().await;
        });
    }
}
