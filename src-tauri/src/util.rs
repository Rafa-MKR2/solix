// SPDX-License-Identifier: MIT

pub fn base64_encode(data: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::new();
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = chunk.get(1).copied().unwrap_or(0) as u32;
        let b2 = chunk.get(2).copied().unwrap_or(0) as u32;
        let triple = (b0 << 16) | (b1 << 8) | b2;

        result.push(CHARS[((triple >> 18) & 0x3F) as usize] as char);
        result.push(CHARS[((triple >> 12) & 0x3F) as usize] as char);
        if chunk.len() > 1 {
            result.push(CHARS[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
        if chunk.len() > 2 {
            result.push(CHARS[(triple & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
    }
    result
}

pub fn base64_decode(data: &str) -> Result<Vec<u8>, String> {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let data = data.trim();
    let mut bytes = Vec::new();
    let mut buffer = 0u32;
    let mut bits = 0;
    for ch in data.chars() {
        if ch == '=' {
            break;
        }
        if let Some(pos) = CHARS.iter().position(|&c| c as char == ch) {
            buffer = (buffer << 6) | pos as u32;
            bits += 6;
            if bits >= 8 {
                bits -= 8;
                bytes.push((buffer >> bits) as u8);
                buffer &= (1 << bits) - 1;
            }
        }
    }
    Ok(bytes)
}

/// Base used to format byte counts.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FormatBase {
    /// Base 1024 (binary). Labels: B, KB, MB, GB — GB with 2 decimals.
    Binary,
    /// Base 1000 (SI). Labels: bytes, KB, MB, GB — GB with 1 decimal.
    Decimal,
}

/// Formats a byte count with a human-readable unit.
/// Thresholds are inclusive (`>=`), so exact boundaries roll over to the
/// next unit (ex: 1024 bytes -> "1 KB", 1_000_000 bytes -> "1.0 MB").
pub fn format_bytes(bytes: u64, base: FormatBase) -> String {
    let (divisor, byte_label, gb_precision) = match base {
        FormatBase::Binary => (1024.0, "B", 2),
        FormatBase::Decimal => (1000.0, "bytes", 1),
    };
    let size = bytes as f64;
    if size >= divisor * divisor * divisor {
        format!(
            "{:.*} GB",
            gb_precision,
            size / (divisor * divisor * divisor)
        )
    } else if size >= divisor * divisor {
        format!("{:.1} MB", size / (divisor * divisor))
    } else if size >= divisor {
        format!("{:.0} KB", size / divisor)
    } else {
        format!("{} {}", bytes, byte_label)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_base64_encode_empty() {
        assert_eq!(base64_encode(b""), "");
    }

    #[test]
    fn test_base64_encode_1_byte() {
        assert_eq!(base64_encode(b"M"), "TQ==");
    }

    #[test]
    fn test_base64_encode_2_bytes() {
        assert_eq!(base64_encode(b"Ma"), "TWE=");
    }

    #[test]
    fn test_base64_encode_3_bytes() {
        assert_eq!(base64_encode(b"Man"), "TWFu");
    }

    #[test]
    fn test_base64_encode_hello() {
        assert_eq!(base64_encode(b"Hello World!"), "SGVsbG8gV29ybGQh");
    }

    #[test]
    fn test_base64_decode_hello() {
        assert_eq!(base64_decode("SGVsbG8=").unwrap(), b"Hello");
    }

    #[test]
    fn test_base64_decode_empty() {
        assert!(base64_decode("").unwrap().is_empty());
    }

    #[test]
    fn test_base64_decode_padding() {
        assert_eq!(base64_decode("TWFu").unwrap(), b"Man");
    }

    #[test]
    fn test_base64_decode_whitespace() {
        assert_eq!(base64_decode("  SGVsbG8=  ").unwrap(), b"Hello");
    }

    #[test]
    fn test_base64_decode_invalid_chars_skipped() {
        assert_eq!(base64_decode("SGVsbG!!@#8=").unwrap(), b"Hello");
    }

    // ─── format_bytes (Binary base 1024) ───

    #[test]
    fn test_format_bytes_binary_bytes() {
        assert_eq!(format_bytes(0, FormatBase::Binary), "0 B");
        assert_eq!(format_bytes(500, FormatBase::Binary), "500 B");
        assert_eq!(format_bytes(1023, FormatBase::Binary), "1023 B");
    }

    #[test]
    fn test_format_bytes_binary_kb() {
        assert_eq!(format_bytes(1024, FormatBase::Binary), "1 KB");
        assert_eq!(format_bytes(2048, FormatBase::Binary), "2 KB");
        assert_eq!(format_bytes(1536, FormatBase::Binary), "2 KB");
        assert_eq!(format_bytes(1_048_575, FormatBase::Binary), "1024 KB");
    }

    #[test]
    fn test_format_bytes_binary_mb() {
        assert_eq!(format_bytes(1_048_576, FormatBase::Binary), "1.0 MB");
        assert_eq!(format_bytes(1_572_864, FormatBase::Binary), "1.5 MB");
        assert_eq!(format_bytes(1_073_741_823, FormatBase::Binary), "1024.0 MB");
    }

    #[test]
    fn test_format_bytes_binary_gb() {
        assert_eq!(format_bytes(1_073_741_824, FormatBase::Binary), "1.00 GB");
        assert_eq!(format_bytes(2_147_483_648, FormatBase::Binary), "2.00 GB");
        assert_eq!(format_bytes(1_610_612_736, FormatBase::Binary), "1.50 GB");
        assert_eq!(
            format_bytes(5_497_558_138_880, FormatBase::Binary),
            "5120.00 GB"
        );
        assert_eq!(
            format_bytes(1_099_511_627_776, FormatBase::Binary),
            "1024.00 GB"
        );
    }

    // ─── format_bytes (Decimal base 1000) ───

    #[test]
    fn test_format_bytes_decimal_bytes() {
        assert_eq!(format_bytes(0, FormatBase::Decimal), "0 bytes");
        assert_eq!(format_bytes(1, FormatBase::Decimal), "1 bytes");
        assert_eq!(format_bytes(999, FormatBase::Decimal), "999 bytes");
    }

    #[test]
    fn test_format_bytes_decimal_kb() {
        assert_eq!(format_bytes(1_001, FormatBase::Decimal), "1 KB");
        assert_eq!(format_bytes(10_000, FormatBase::Decimal), "10 KB");
        assert_eq!(format_bytes(999_999, FormatBase::Decimal), "1000 KB");
    }

    #[test]
    fn test_format_bytes_decimal_mb() {
        assert_eq!(format_bytes(1_000_000, FormatBase::Decimal), "1.0 MB");
        assert_eq!(format_bytes(1_000_001, FormatBase::Decimal), "1.0 MB");
        assert_eq!(format_bytes(1_500_000, FormatBase::Decimal), "1.5 MB");
        assert_eq!(format_bytes(999_999_999, FormatBase::Decimal), "1000.0 MB");
    }

    #[test]
    fn test_format_bytes_decimal_gb() {
        assert_eq!(format_bytes(1_000_000_001, FormatBase::Decimal), "1.0 GB");
        assert_eq!(format_bytes(2_500_000_000, FormatBase::Decimal), "2.5 GB");
        assert_eq!(format_bytes(10_000_000_000, FormatBase::Decimal), "10.0 GB");
        assert_eq!(
            format_bytes(1_000_000_000_000, FormatBase::Decimal),
            "1000.0 GB"
        );
    }
}
