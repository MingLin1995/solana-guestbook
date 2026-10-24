use anchor_lang::prelude::*;

#[error_code]
pub enum GuestbookError {
    #[msg("留言內容超過 280 個字元上限")]
    MessageTooLong,

    #[msg("留言內容不能為空")]
    MessageEmpty,
}
