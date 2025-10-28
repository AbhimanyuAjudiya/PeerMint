use anchor_lang::prelude::*;
use crate::state::Order;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct MarkPaid<'info> {
    #[account(mut)]
    pub helper: Signer<'info>,

    #[account(mut)]
    pub order: Account<'info, Order>,
}

pub fn mark_paid(ctx: Context<MarkPaid>, receipt_hash: Option<[u8; 32]>) -> Result<()> {
    let order = &mut ctx.accounts.order;
    require!(order.status == 1, ErrorCode::InvalidStatus);
    require!(order.helper == Some(*ctx.accounts.helper.key), ErrorCode::Unauthorized);
    order.status = 2; // PaidLocal
    order.paid_at = Some(Clock::get()?.unix_timestamp);
    if let Some(h) = receipt_hash {
        order.receipt_hash = Some(h);
    }
    Ok(())
}
