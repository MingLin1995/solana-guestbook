use anchor_lang::prelude::*;

#[account]
pub struct CheckInAccount {
    /// 簽到發起者的錢包公鑰 (32 bytes)
    pub user: Pubkey,
    /// 鏈上 Unix 時間戳記 (8 bytes)
    pub timestamp: i64,
    /// 留言內容 (4 bytes 長度前綴 + 最多 280 bytes UTF-8 字串)
    pub message: String,
}

impl CheckInAccount {
    /// 留言最大字元長度 (以 Twitter/X 的 280 字為標準)
    pub const MAX_MESSAGE_LEN: usize = 280;

    /// 帳戶空間計算 (Space Calculation):
    /// 8 (Anchor 帳戶辨識碼 Discriminator)
    /// + 32 (簽到者 Pubkey)
    /// + 8 (i64 timestamp)
    /// + 4 (String 長度前綴)
    /// + 280 (Message 內容)
    pub const LEN: usize = 8 + 32 + 8 + 4 + Self::MAX_MESSAGE_LEN;
}
