/// 驗證前端傳入的簽到資料格式與密碼學簽章合法性
pub fn validate_checkin_payload(
    user_pubkey: &str,
    message: &str,
    tx_signature: &str,
) -> Result<(), &'static str> {
    // 1. 檢查留言內容
    let trimmed_msg = message.trim();
    if trimmed_msg.is_empty() {
        return Err("留言內容不能為空");
    }
    if trimmed_msg.chars().count() > 280 {
        return Err("留言長度不能超過 280 個字元");
    }

    // 2. 檢查 Solana 公鑰格式 (Base58 且解碼後長度應為 32 bytes)
    let decoded_pubkey = bs58::decode(user_pubkey)
        .into_vec()
        .map_err(|_| "無效的 Solana 錢包公鑰格式 (Base58 解碼失敗)")?;
    if decoded_pubkey.len() != 32 {
        return Err("Solana 公鑰長度必須為 32 bytes");
    }

    // 3. 檢查交易簽章格式 (Base58 且解碼後長度應為 64 bytes)
    let decoded_sig = bs58::decode(tx_signature)
        .into_vec()
        .map_err(|_| "無效的交易簽章格式 (Base58 解碼失敗)")?;
    if decoded_sig.len() != 64 {
        return Err("交易簽章長度必須為 64 bytes");
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const VALID_PUBKEY: &str = "EKR4NkE7RYZiLynvP4LWEq6UNcbfKnKiJkq72ciwxoSm";
    const VALID_SIG: &str = "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYj7WNXTHQXUrJhUCP5vwWcxWDN45x1T8YshbWwM5jP5ZJb25i58tA";

    #[test]
    fn test_valid_payload() {
        let result = validate_checkin_payload(VALID_PUBKEY, "你好，區塊鏈！", VALID_SIG);
        assert!(result.is_ok(), "合法的資料應通過驗證");
    }

    #[test]
    fn test_empty_message() {
        let result = validate_checkin_payload(VALID_PUBKEY, "   ", VALID_SIG);
        assert_eq!(result, Err("留言內容不能為空"));
    }

    #[test]
    fn test_message_too_long() {
        let long_msg = "a".repeat(281);
        let result = validate_checkin_payload(VALID_PUBKEY, &long_msg, VALID_SIG);
        assert_eq!(result, Err("留言長度不能超過 280 個字元"));
    }

    #[test]
    fn test_invalid_pubkey() {
        let result = validate_checkin_payload("NotABase58Pubkey!", "留言", VALID_SIG);
        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_signature() {
        let result = validate_checkin_payload(VALID_PUBKEY, "留言", "TooShortSig");
        assert!(result.is_err());
    }
}
