// SPDX-License-Identifier: MIT
// Teste de integração cross-module: o catálogo de ferramentas (tool.rs)
// deve ser consistente com o mapeamento de pacotes (install.rs).
use solix_lib::install::get_package_name;
use solix_lib::tool::get_development_tools;
use std::collections::HashSet;

#[test]
fn every_tool_maps_to_a_package_name() {
    let tools = get_development_tools();
    assert!(!tools.is_empty(), "catálogo não pode ser vazio");

    for t in &tools {
        let pkg = get_package_name(&t.name);
        assert!(
            !pkg.is_empty(),
            "ferramenta '{}' mapeada para nome de pacote vazio",
            t.name
        );
    }
}

#[test]
fn tool_names_are_unique() {
    let tools = get_development_tools();
    let names: HashSet<&str> = tools.iter().map(|t| t.name.as_str()).collect();
    assert_eq!(
        names.len(),
        tools.len(),
        "existem nomes duplicados no catálogo"
    );
}

#[test]
fn known_tools_have_expected_package_names() {
    assert_eq!(get_package_name("node"), "nodejs");
    assert_eq!(get_package_name("python3"), "python3");
    assert_eq!(get_package_name("java"), "default-jre");
    assert_eq!(get_package_name("heroic"), "heroic-games-launcher");
}

#[test]
fn unknown_tool_falls_back_to_itself() {
    assert_eq!(
        get_package_name("totally-unknown-tool"),
        "totally-unknown-tool"
    );
}
