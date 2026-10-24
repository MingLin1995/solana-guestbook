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
