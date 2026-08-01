// SPDX-License-Identifier: MIT

use tokio::io::AsyncWriteExt;

/// Envia a senha para o stdin do processo via pipe e fecha a entrada.
pub async fn pipe_password(
    child: &mut tokio::process::Child,
    password: &str,
) -> Result<(), String> {
    if let Some(mut stdin) = child.stdin.take() {
        let input = format!("{}\n", password);
        stdin
            .write_all(input.as_bytes())
            .await
            .map_err(|e| format!("Erro ao enviar senha: {}", e))?;
        stdin
            .shutdown()
            .await
            .map_err(|e| format!("Erro ao fechar entrada: {}", e))?;
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

    let output = child
        .wait_with_output()
        .await
        .map_err(|e| format!("Erro ao aguardar sudo: {}", e))?;

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

    #[test]
    fn test_pipe_password_sends_password_to_stdin() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let mut child = tokio::process::Command::new("sh")
                .arg("-c")
                .arg("IFS= read -r line && printf '%s' \"$line\"")
                .stdin(std::process::Stdio::piped())
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::null())
                .spawn()
                .unwrap();
            let result = pipe_password(&mut child, "senha123").await;
            assert!(result.is_ok());
            let output = child.wait_with_output().await.unwrap();
            assert!(output.status.success());
            assert_eq!(String::from_utf8_lossy(&output.stdout), "senha123");
        });
    }

    #[test]
    fn test_pipe_password_empty_password_sends_newline() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let mut child = tokio::process::Command::new("sh")
                .arg("-c")
                .arg("IFS= read -r line && printf 'len=%s' \"${#line}\"")
                .stdin(std::process::Stdio::piped())
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::null())
                .spawn()
                .unwrap();
            let result = pipe_password(&mut child, "").await;
            assert!(result.is_ok());
            let output = child.wait_with_output().await.unwrap();
            assert!(output.status.success());
            // Empty password still terminates the line with \n, so read
            // receives an empty line.
            assert_eq!(String::from_utf8_lossy(&output.stdout), "len=0");
        });
    }

    #[test]
    fn test_pipe_password_multiline_password_single_line() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let mut child = tokio::process::Command::new("sh")
                .arg("-c")
                .arg("IFS= read -r line && printf '%s' \"$line\"")
                .stdin(std::process::Stdio::piped())
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::null())
                .spawn()
                .unwrap();
            // Password containing newline is sent as-is; the trailing \n
            // terminates the read. Only the first line is consumed.
            let result = pipe_password(&mut child, "abc\ndef").await;
            assert!(result.is_ok());
            let output = child.wait_with_output().await.unwrap();
            assert!(output.status.success());
            assert_eq!(String::from_utf8_lossy(&output.stdout), "abc");
        });
    }

    #[test]
    fn test_verify_password_wrong_password_errors() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            // An invalid password must never be accepted. If sudo is missing,
            // spawning fails and we also get an Err. This mirrors the
            // convention used in system_ops.rs for wrong-password tests.
            let result = verify_password("senha-absolutamente-incorreta-123").await;
            assert!(result.is_err());
        });
    }
}
