// SPDX-License-Identifier: MIT
// Testes de integração do crate (src-tauri/tests/) — exercitam a API
// pública de `solix_lib::util` como um consumidor externo faria.
use solix_lib::util::{base64_decode, base64_encode, format_bytes, FormatBase};

#[test]
fn base64_roundtrip_binary() {
    let data: Vec<u8> = (0u8..=255).collect();
    let encoded = base64_encode(&data);
    let decoded = base64_decode(&encoded).expect("decode deve funcionar");
    assert_eq!(decoded, data);
}

#[test]
fn base64_roundtrip_known_vector() {
    let encoded = base64_encode(b"Hello World!");
    assert_eq!(encoded, "SGVsbG8gV29ybGQh");
    assert_eq!(base64_decode(&encoded).unwrap(), b"Hello World!");
}

#[test]
fn base64_padding_variants() {
    // 1, 2 e 3 bytes geram padding diferente
    assert_eq!(base64_encode(b"M"), "TQ==");
    assert_eq!(base64_encode(b"Ma"), "TWE=");
    assert_eq!(base64_encode(b"Man"), "TWFu");
}

#[test]
fn format_bytes_binary_base() {
    assert_eq!(format_bytes(500, FormatBase::Binary), "500 B");
    assert_eq!(format_bytes(1024, FormatBase::Binary), "1 KB");
    assert_eq!(format_bytes(1_048_576, FormatBase::Binary), "1.0 MB");
    assert_eq!(format_bytes(1_073_741_824, FormatBase::Binary), "1.00 GB");
}

#[test]
fn format_bytes_decimal_base() {
    assert_eq!(format_bytes(0, FormatBase::Decimal), "0 bytes");
    assert_eq!(format_bytes(1_000, FormatBase::Decimal), "1 KB");
    assert_eq!(format_bytes(1_000_000, FormatBase::Decimal), "1.0 MB");
    assert_eq!(format_bytes(1_000_000_000, FormatBase::Decimal), "1.0 GB");
}
