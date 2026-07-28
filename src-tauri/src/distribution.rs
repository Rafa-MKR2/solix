// SPDX-License-Identifier: MIT
// Copyright (c) 2025 Rafa-MKR2
// GitHub: https://github.com/Rafa-MKR2


use serde::Serialize;
use std::collections::HashMap;

#[derive(Debug, Serialize)]
pub struct LinuxDistribution {
    pub id: String,
    pub name: String,
    pub version: String,
    pub family: String,
    pub package_manager: String,
}

fn get_distribution_mappings() -> HashMap<&'static str, (&'static str, &'static str)> {
    let mut map = HashMap::new();
    map.insert("arch", ("arch", "pacman"));
    map.insert("garuda", ("arch", "pacman"));
    map.insert("endeavouros", ("arch", "pacman"));
    map.insert("manjaro", ("arch", "pacman"));
    map.insert("ubuntu", ("debian", "apt"));
    map.insert("debian", ("debian", "apt"));
    map.insert("linuxmint", ("debian", "apt"));
    map.insert("pop", ("debian", "apt"));
    map.insert("fedora", ("fedora", "dnf"));
    map.insert("opensuse", ("opensuse", "zypper"));
    map.insert("suse", ("opensuse", "zypper"));
    map
}

fn find_mapping(
    id: &str,
    id_like: &str,
) -> (String, String) {
    let mappings = get_distribution_mappings();

    if let Some(&(family, pm)) = mappings.get(id) {
        return (family.to_string(), pm.to_string());
    }

    if !id_like.is_empty() {
        for candidate in id_like.split_whitespace() {
            if candidate.starts_with("opensuse") {
                return ("opensuse".to_string(), "zypper".to_string());
            }
            if let Some(&(family, pm)) = mappings.get(candidate) {
                return (family.to_string(), pm.to_string());
            }
        }
    }

    ("unknown".to_string(), "unknown".to_string())
}

fn parse_os_release(content: &str) -> HashMap<String, String> {
    let mut values = HashMap::new();

    for line in content.lines() {
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        if let Some(separator) = line.find('=') {
            let key = line[..separator].trim().to_string();
            let raw_value = line[separator + 1..].trim();
            let value = unquote(raw_value);
            values.insert(key, value);
        }
    }

    values
}

fn unquote(value: &str) -> String {
    let value = value.trim();
    if (value.starts_with('"') && value.ends_with('"'))
        || (value.starts_with('\'') && value.ends_with('\''))
    {
        let inner = &value[1..value.len() - 1];
        inner.replace("\\\"", "\"").replace("\\'", "'")
    } else {
        value.to_string()
    }
}

pub async fn detect_linux_distribution() -> Option<LinuxDistribution> {
    let os_release_content = tokio::fs::read_to_string("/etc/os-release").await.ok()?;
    let os_release = parse_os_release(&os_release_content);

    let id = os_release.get("ID").cloned().unwrap_or_default().to_lowercase();
    let name = os_release
        .get("NAME")
        .or_else(|| os_release.get("PRETTY_NAME"))
        .cloned()
        .unwrap_or_default();
    let version = os_release
        .get("VERSION_ID")
        .or_else(|| os_release.get("VERSION"))
        .or_else(|| os_release.get("BUILD_ID"))
        .cloned()
        .unwrap_or_default();
    let id_like = os_release.get("ID_LIKE").cloned().unwrap_or_default();

    let (family, package_manager) = find_mapping(&id, &id_like);

    Some(LinuxDistribution {
        id,
        name,
        version,
        family,
        package_manager,
    })
}
