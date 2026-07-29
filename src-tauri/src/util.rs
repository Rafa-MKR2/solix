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
        if ch == '=' { break; }
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_base64_encode_empty() {
        assert_eq!(base64_encode(b""), "");
    }

    #[test]
    fn test_base64_encode_1_byte() { assert_eq!(base64_encode(b"M"), "TQ=="); }

    #[test]
    fn test_base64_encode_2_bytes() { assert_eq!(base64_encode(b"Ma"), "TWE="); }

    #[test]
    fn test_base64_encode_3_bytes() { assert_eq!(base64_encode(b"Man"), "TWFu"); }

    #[test]
    fn test_base64_encode_hello() { assert_eq!(base64_encode(b"Hello World!"), "SGVsbG8gV29ybGQh"); }

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
}
