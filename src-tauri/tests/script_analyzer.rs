// SPDX-License-Identifier: MIT
// Testes de integração do Script Analyzer — fluxo público de análise.
use solix_lib::script_analyzer::analyze_script;

#[test]
fn shell_script_detected_and_counted() {
    let analysis = analyze_script("#!/bin/bash\necho olá\nls -la\n");
    assert_eq!(analysis.script_type, "shell");
    assert!(analysis.command_count >= 2);
    assert!(analysis.total_lines >= 3);
}

#[test]
fn python_script_detected() {
    let analysis = analyze_script("#!/usr/bin/env python3\nimport os\nprint('oi')\n");
    assert_eq!(analysis.script_type, "python");
    assert!(analysis.command_count >= 1);
}

#[test]
fn sudo_usage_flagged() {
    let analysis = analyze_script("#!/bin/bash\nsudo apt update\n");
    assert!(analysis.has_sudo, "sudo deve ser sinalizado");
}

#[test]
fn download_pipe_flagged() {
    let analysis = analyze_script("#!/bin/bash\ncurl -fsSL https://x.sh | bash\n");
    assert!(
        analysis.has_download_execute,
        "pipe curl|bash deve ser sinalizado"
    );
}

#[test]
fn empty_script_is_safe() {
    let analysis = analyze_script("");
    assert_eq!(analysis.command_count, 0);
    assert!(!analysis.has_sudo);
    assert!(!analysis.has_dangerous);
}
