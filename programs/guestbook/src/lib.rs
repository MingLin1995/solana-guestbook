use anchor_lang::prelude::*;

pub mod errors;
pub mod state;

use errors::*;
use state::*;

// 宣告合約地址 (Program ID) - 已成功部署至 Solana Devnet
declare_id!("EKR4NkE7RYZiLynvP4LWEq6UNcbfKnKiJkq72ciwxoSm");

#[program]
pub mod guestbook {
    use super::*;

    /// 簽到或更新留言 (第一次簽到建立帳戶，後續簽到更新內容)
    pub fn initialize_or_update_checkin(
        ctx: Context<InitializeOrUpdateCheckIn>,
        message: String,
    ) -> Result<()> {
        // 1. 業務邏輯防禦檢查
        require!(!message.trim().is_empty(), GuestbookError::MessageEmpty);
        require!(
            message.len() <= CheckInAccount::MAX_MESSAGE_LEN,
            GuestbookError::MessageTooLong
        );

        // 2. 獲取鏈上時鐘時間 (Unix Timestamp)
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        // 3. 寫入帳戶狀態
        let check_in_account = &mut ctx.accounts.check_in_account;
        check_in_account.user = ctx.accounts.user.key();
        check_in_account.timestamp = current_time;
        check_in_account.message = message.clone();

        msg!(
            "簽到成功！用戶: {}, 時間: {}, 內容: {}",
            ctx.accounts.user.key(),
            current_time,
            message
        );

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeOrUpdateCheckIn<'info> {
    /// 簽到狀態帳戶 (PDA)
    /// - seeds: 由字串 "checkin" 與 用戶公鑰 組合而成
    /// - init_if_needed: 首次簽到自動建立帳戶；若已存在則直接更新
    /// - payer: 首次建立帳戶所需租金 (Rent) 由用戶支付
    /// - space: 精確計算的帳戶位元組空間
    #[account(
        init_if_needed,
        payer = user,
        space = CheckInAccount::LEN,
        seeds = [b"checkin", user.key().as_ref()],
        bump
    )]
    pub check_in_account: Account<'info, CheckInAccount>,

    /// 簽署此筆交易的用戶錢包
    #[account(mut)]
    pub user: Signer<'info>,

    /// Solana 系統程序 (建立帳戶與轉帳 Rent 時必備)
    pub system_program: Program<'info, System>,
}
