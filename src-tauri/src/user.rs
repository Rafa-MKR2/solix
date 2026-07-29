// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2
// GitHub: https://github.com/Rafa-MKR2


use serde::Serialize;
use std::path::Path;
use crate::util::base64_encode;

#[derive(Debug, Serialize)]
pub struct UserInfo {
    pub username: String,
    pub full_name: String,
    pub is_admin: bool,
    pub avatar_base64: Option<String>,
    pub shell: String,
    pub home_dir: String,
}

pub fn parse_passwd_line(line: &str) -> Option<(String, String, String, String, String)> {
    let parts: Vec<&str> = line.split(':').collect();
    if parts.len() >= 7 {
        let gecos = parts[4].trim();
        let full_name = gecos.split(',').next().unwrap_or(gecos).to_string();
        let shell = Path::new(parts[6])
            .file_name()
            .map(|f| f.to_string_lossy().to_string())
            .unwrap_or_else(|| parts[6].to_string());
        Some((
            parts[0].to_string(),
            full_name,
            parts[5].to_string(),
            shell,
            parts[2].to_string(),
        ))
    } else {
        None
    }
}

fn get_username() -> String {
    std::env::var("USER")
        .or_else(|_| std::env::var("LOGNAME"))
        .unwrap_or_else(|_| "unknown".to_string())
}

fn find_passwd_entry(username: &str) -> Option<(String, String, String, String, String)> {
    let content = std::fs::read_to_string("/etc/passwd").ok()?;
    for line in content.lines() {
        if line.starts_with(&format!("{}:", username)) {
            return parse_passwd_line(line);
        }
    }
    None
}

fn get_full_name(username: &str) -> String {
    if let Some((_, name, _, _, _)) = find_passwd_entry(username) {
        if !name.is_empty() {
            return name;
        }
    }
    username.to_string()
}

fn get_home_dir(username: &str) -> String {
    if let Some((_, _, home, _, _)) = find_passwd_entry(username) {
        return home;
    }
    format!("/home/{}", username)
}

fn get_shell(username: &str) -> String {
    if let Some((_, _, _, shell, _)) = find_passwd_entry(username) {
        return shell;
    }
    "—".to_string()
}

fn is_admin(username: &str) -> bool {
    // Check sudo group
    if let Ok(content) = std::fs::read_to_string("/etc/group") {
        for line in content.lines() {
            let parts: Vec<&str> = line.split(':').collect();
            if parts.len() > 3 {
                let group_name = parts[0];
                if group_name == "sudo" || group_name == "wheel" || group_name == "admin" {
                    let members = parts[3].trim();
                    if members.contains(username) {
                        return true;
                    }
                }
            }
        }
    }

    // Check if UID is 0 (root)
    if let Some((_, _, _, _, uid)) = find_passwd_entry(username) {
        return uid == "0";
    }

    false
}

fn get_avatar_base64(username: &str) -> Option<String> {
    let home = get_home_dir(username);
    let candidates = vec![
        format!("/var/lib/AccountsService/icons/{}", username),
        format!("{}/.face", home),
        format!("{}/.face.icon", home),
        format!("{}/.cache/avatar.png", home),
    ];

    for path in &candidates {
        if Path::new(path).exists() {
            if let Ok(data) = std::fs::read(path) {
                // Only process small images (under 1MB)
                if data.len() < 1_048_576 {
                    // Detect image type from magic bytes
                    let mime = if data.len() > 4 {
                        if data[..4] == [0x89, 0x50, 0x4E, 0x47] {
                            Some("image/png")
                        } else if data[0] == 0xFF && data[1] == 0xD8 {
                            Some("image/jpeg")
                        } else {
                            None
                        }
                    } else {
                        None
                    };

                    if let Some(mime_type) = mime {
                        let b64 = base64_encode(&data);
                        return Some(format!("data:{};base64,{}", mime_type, b64));
                    }
                }
            }
        }
    }

    None
}

pub fn get_user_info() -> UserInfo {
    let username = get_username();
    let home = get_home_dir(&username);

    UserInfo {
        full_name: get_full_name(&username),
        is_admin: is_admin(&username),
        avatar_base64: get_avatar_base64(&username),
        shell: get_shell(&username),
        home_dir: home,
        username,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_passwd_line_full() {
        let line = "rafael:x:1000:1000:Rafael Do Carmo Costa:/home/rafael:/bin/bash";
        let result = parse_passwd_line(line);
        assert!(result.is_some());
        let (user, name, home, shell, uid) = result.unwrap();
        assert_eq!(user, "rafael");
        assert_eq!(name, "Rafael Do Carmo Costa");
        assert_eq!(home, "/home/rafael");
        assert_eq!(shell, "bash");
        assert_eq!(uid, "1000");
    }

    #[test]
    fn test_parse_passwd_line_root() {
        let line = "root:x:0:0:root:/root:/bin/zsh";
        let (user, name, home, shell, uid) = parse_passwd_line(line).unwrap();
        assert_eq!(user, "root");
        assert_eq!(name, "root");
        assert_eq!(home, "/root");
        assert_eq!(shell, "zsh");
        assert_eq!(uid, "0");
    }

    #[test]
    fn test_parse_passwd_line_gecos_with_comma() {
        let line = "user:x:1001:1001:Last,First,Title,Office,Phone:/home/user:/bin/sh";
        let (_, name, _, _, _) = parse_passwd_line(line).unwrap();
        assert_eq!(name, "Last");
    }

    #[test]
    fn test_parse_passwd_line_short() {
        assert!(parse_passwd_line("short:line").is_none());
    }

    #[test]
    fn test_parse_passwd_line_empty() {
        assert!(parse_passwd_line("").is_none());
    }

    #[test]
    fn test_user_info_struct() {
        let u = UserInfo {
            username: "test".into(),
            full_name: "Test User".into(),
            is_admin: true,
            avatar_base64: None,
            shell: "/bin/bash".into(),
            home_dir: "/home/test".into(),
        };
        assert_eq!(u.username, "test");
        assert!(u.is_admin);
        assert_eq!(u.shell, "/bin/bash");
    }

    #[test]
    fn test_parse_passwd_line_different_shell() {
        let line = "user:x:1002:1002:Full Name:/home/user:/usr/bin/fish";
        let (_, _, _, shell, _) = parse_passwd_line(line).unwrap();
        assert_eq!(shell, "fish");
    }

    #[test]
    fn test_parse_passwd_line_nologin_shell() {
        let line = "daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin";
        let (_, _, _, shell, _) = parse_passwd_line(line).unwrap();
        assert_eq!(shell, "nologin");
    }

    #[test]
    fn test_parse_passwd_line_uid_1000() {
        let line = "user2:x:1000:1000:User Two:/home/user2:/bin/bash";
        let (_, _, _, _, uid) = parse_passwd_line(line).unwrap();
        assert_eq!(uid, "1000");
    }

    #[test]
    fn test_parse_passwd_line_uid_0() {
        let line = "root:x:0:0:root:/root:/bin/bash";
        let (_, _, _, _, uid) = parse_passwd_line(line).unwrap();
        assert_eq!(uid, "0");
    }

    #[test]
    fn test_parse_passwd_line_no_shell() {
        let line = "user:x:1003:1003:No Shell:/home/user:";
        let result = parse_passwd_line(line);
        assert!(result.is_some());
        let (_, _, _, shell, _) = result.unwrap();
        assert_eq!(shell, "");
    }

    #[test]
    fn test_parse_passwd_line_shell_missing_field() {
        let line = "user:x:1004:1004:Test User:/home/user";
        let result = parse_passwd_line(line);
        assert!(result.is_none());
    }

    #[test]
    fn test_user_info_struct_admin_false() {
        let u = UserInfo {
            username: "guest".into(),
            full_name: "Guest Account".into(),
            is_admin: false,
            avatar_base64: Some("data:image/png;base64,iVBORw0KGgo=".into()),
            shell: "/usr/sbin/nologin".into(),
            home_dir: "/tmp/guest".into(),
        };
        assert_eq!(u.username, "guest");
        assert!(!u.is_admin);
        assert!(u.avatar_base64.is_some());
        assert_eq!(u.home_dir, "/tmp/guest");
    }

    #[test]
    fn test_parse_passwd_line_minimal_fields() {
        let line = "testuser:x:1005:1005::/home/testuser:/bin/sh";
        let (user, name, home, shell, uid) = parse_passwd_line(line).unwrap();
        assert_eq!(user, "testuser");
        assert_eq!(name, "");
        assert_eq!(home, "/home/testuser");
        assert_eq!(shell, "sh");
        assert_eq!(uid, "1005");
    }
}

