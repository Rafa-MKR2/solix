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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_os_release_minimal() {
        let content = "ID=arch\nVERSION_ID=rolling\n";
        let map = parse_os_release(content);
        assert_eq!(map.get("ID").unwrap(), "arch");
        assert_eq!(map.get("VERSION_ID").unwrap(), "rolling");
    }

    #[test]
    fn test_parse_os_release_full() {
        let content = r#"NAME="Ubuntu"
VERSION="22.04.3 LTS (Jammy Jellyfish)"
ID=ubuntu
ID_LIKE=debian
VERSION_ID="22.04"
PRETTY_NAME="Ubuntu 22.04.3 LTS"
"#;
        let map = parse_os_release(content);
        assert_eq!(map.get("NAME").unwrap(), "Ubuntu");
        assert_eq!(map.get("ID").unwrap(), "ubuntu");
        assert_eq!(map.get("ID_LIKE").unwrap(), "debian");
        assert_eq!(map.get("VERSION_ID").unwrap(), "22.04");
    }

    #[test]
    fn test_parse_os_release_skips_comments_and_empty() {
        let content = "# comment\n\nID=test\n";
        let map = parse_os_release(content);
        assert_eq!(map.len(), 1);
        assert_eq!(map.get("ID").unwrap(), "test");
    }

    #[test]
    fn test_parse_os_release_empty() {
        let map = parse_os_release("");
        assert!(map.is_empty());
    }

    #[test]
    fn test_unquote_double() {
        assert_eq!(unquote("\"Ubuntu\""), "Ubuntu");
    }

    #[test]
    fn test_unquote_single() {
        assert_eq!(unquote("'Ubuntu'"), "Ubuntu");
    }

    #[test]
    fn test_unquote_no_quotes() {
        assert_eq!(unquote("arch"), "arch");
    }

    #[test]
    fn test_unquote_empty() {
        assert_eq!(unquote(""), "");
    }

    #[test]
    fn test_unquote_just_quotes() {
        assert_eq!(unquote("\"\""), "");
    }

    #[test]
    fn test_find_mapping_direct() {
        let (family, pm) = find_mapping("arch", "");
        assert_eq!(family, "arch");
        assert_eq!(pm, "pacman");
    }

    #[test]
    fn test_find_mapping_via_id_like() {
        let (family, pm) = find_mapping("pop", "ubuntu");
        assert_eq!(family, "debian");
        assert_eq!(pm, "apt");
    }

    #[test]
    fn test_find_mapping_opensuse_id_like() {
        let (family, pm) = find_mapping("suse", "opensuse");
        // Will hit opensuse branch first
        assert_eq!(family, "opensuse");
        assert_eq!(pm, "zypper");
    }

    #[test]
    fn test_find_mapping_unknown() {
        let (family, pm) = find_mapping("nonexistent", "");
        assert_eq!(family, "unknown");
        assert_eq!(pm, "unknown");
    }

    #[test]
    fn test_find_mapping_all_known() {
        let known = [
            ("arch", "arch", "pacman"),
            ("garuda", "arch", "pacman"),
            ("manjaro", "arch", "pacman"),
            ("ubuntu", "debian", "apt"),
            ("debian", "debian", "apt"),
            ("fedora", "fedora", "dnf"),
            ("opensuse", "opensuse", "zypper"),
        ];
        for (id, fam, pm) in &known {
            let (family, pkg) = find_mapping(id, "");
            assert_eq!(&family, fam, "Family mismatch for {id}");
            assert_eq!(&pkg, pm, "PM mismatch for {id}");
        }
    }

    #[test]
    fn test_linux_distribution_struct() {
        let d = LinuxDistribution {
            id: "test".into(),
            name: "Test OS".into(),
            version: "1.0".into(),
            family: "unix".into(),
            package_manager: "test-pm".into(),
        };
        assert_eq!(d.id, "test");
        assert_eq!(d.name, "Test OS");
        assert_eq!(d.package_manager, "test-pm");
    }

    #[test]
    fn test_unquote_escaped_double() {
        assert_eq!(unquote("\"with\\\"quote\""), "with\"quote");
    }

    #[test]
    fn test_unquote_escaped_single() {
        assert_eq!(unquote("'with\\'quote'"), "with'quote");
    }

    #[test]
    fn test_find_mapping_linuxmint() {
        let (family, pm) = find_mapping("linuxmint", "");
        assert_eq!(family, "debian");
        assert_eq!(pm, "apt");
    }

    #[test]
    fn test_find_mapping_fedora_direct() {
        let (family, pm) = find_mapping("fedora", "");
        assert_eq!(family, "fedora");
        assert_eq!(pm, "dnf");
    }

    #[test]
    fn test_find_mapping_opensuse_tumbleweed_direct() {
        let (family, pm) = find_mapping("opensuse-tumbleweed", "");
        assert_eq!(family, "unknown");
        assert_eq!(pm, "unknown");
    }

    #[test]
    fn test_find_mapping_opensuse_tumbleweed_via_id_like() {
        let (family, pm) = find_mapping("tumbleweed", "opensuse");
        assert_eq!(family, "opensuse");
        assert_eq!(pm, "zypper");
    }

    #[test]
    fn test_find_mapping_unknown_with_id_like() {
        let (family, pm) = find_mapping("nonexistent", "unknown");
        assert_eq!(family, "unknown");
        assert_eq!(pm, "unknown");
    }

    #[test]
    fn test_parse_os_release_malformed_no_equal() {
        let content = "ID=arch\nTHIS_LINE_HAS_NO_EQUAL\nVERSION_ID=rolling\n";
        let map = parse_os_release(content);
        assert_eq!(map.get("ID").unwrap(), "arch");
        assert_eq!(map.get("VERSION_ID").unwrap(), "rolling");
        assert_eq!(map.len(), 2);
    }

    #[test]
    fn test_parse_os_release_only_blank_and_comments() {
        let content = "\n# comment 1\n\n# comment 2\n  \n";
        let map = parse_os_release(content);
        assert!(map.is_empty());
    }

    #[test]
    fn test_find_mapping_garuda() {
        let (family, pm) = find_mapping("garuda", "");
        assert_eq!(family, "arch");
        assert_eq!(pm, "pacman");
    }

    #[test]
    fn test_find_mapping_manjaro() {
        let (family, pm) = find_mapping("manjaro", "");
        assert_eq!(family, "arch");
        assert_eq!(pm, "pacman");
    }

    #[test]
    fn test_find_mapping_debian() {
        let (family, pm) = find_mapping("debian", "");
        assert_eq!(family, "debian");
        assert_eq!(pm, "apt");
    }

    #[test]
    fn test_find_mapping_opensuse_direct() {
        let (family, pm) = find_mapping("opensuse", "");
        assert_eq!(family, "opensuse");
        assert_eq!(pm, "zypper");
    }

    #[test]
    fn test_unquote_trailing_whitespace() {
        assert_eq!(unquote("  \"Ubuntu\"  "), "Ubuntu");
    }

    #[test]
    fn test_unquote_partial_quote() {
        assert_eq!(unquote("\"Ubuntu"), "\"Ubuntu");
    }

    #[test]
    fn test_parse_os_release_unquoted_value() {
        let content = "ID=arch\nVERSION_ID=rolling\n";
        let map = parse_os_release(content);
        assert_eq!(map.get("ID").unwrap(), "arch");
        assert_eq!(map.get("VERSION_ID").unwrap(), "rolling");
    }

    #[test]
    fn test_parse_os_release_value_with_equals() {
        let content = "VERSION=\"ID=value\"\n";
        let map = parse_os_release(content);
        assert_eq!(map.get("VERSION").unwrap(), "ID=value");
    }
}

