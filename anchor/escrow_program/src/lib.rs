// lib.rs - Anchor escrow program for Metaplex Core marketplace
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use mpl_core::cpi::{self as core_cpi, TransferV1};
use mpl_core::state::Asset;

declare_id!("Escrow111111111111111111111111111111111111");

#[program]
pub mod escrow_program {
    use super::*;

    // Initialize an escrow account for a listing
    pub fn initialize_listing(ctx: Context<InitializeListing>, asset_address: Pubkey, price: u64) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow_account;
        escrow.seller = *ctx.accounts.seller.key;
        escrow.asset_address = asset_address;
        escrow.price = price;
        escrow.is_filled = false;
        Ok(())
    }

    // Buyer purchases the listed asset via escrow
    pub fn purchase(ctx: Context<Purchase>, buyer: Pubkey) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow_account;
        require!(!escrow.is_filled, EscrowError::AlreadyFilled);
        // Transfer SOL to seller
        **ctx.accounts.buyer.to_account_info().try_borrow_mut_lamports()? -= escrow.price;
        **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += escrow.price;

        // Core transferV1 CPI to move the asset
        let cpi_program = ctx.accounts.core_program.to_account_info();
        let cpi_accounts = TransferV1 {
            asset: ctx.accounts.asset.to_account_info(),
            authority: ctx.accounts.seller.to_account_info(),
            destination: ctx.accounts.buyer.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        core_cpi::transfer_v1(cpi_ctx, None)?;

        escrow.is_filled = true;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeListing<'info> {
    #[account(init, payer = seller, space = 8 + 32 + 32 + 8 + 1)]
    pub escrow_account: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub seller: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Purchase<'info> {
    #[account(mut, has_one = seller)]
    pub escrow_account: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub seller: Signer<'info>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: The Core asset account
    pub asset: AccountInfo<'info>,
    /// CHECK: Core program ID
    pub core_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct EscrowAccount {
    pub seller: Pubkey,
    pub asset_address: Pubkey,
    pub price: u64,
    pub is_filled: bool,
}

#[error_code]
pub enum EscrowError {
    #[msg("The escrow has already been filled.")]
    AlreadyFilled,
}
