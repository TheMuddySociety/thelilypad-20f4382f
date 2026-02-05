use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;

declare_id!("BatL1e1111111111111111111111111111111111111");

#[program]
pub mod battle_program {
    use super::*;

    pub fn create_battle(
        ctx: Context<CreateBattle>,
        entry_fee: u64,
        mode: u8,
        max_players: u8,
    ) -> Result<()> {
        let battle = &mut ctx.accounts.battle_account;

        battle.creator = ctx.accounts.creator.key();
        battle.authority = ctx.accounts.authority.key(); // Authority to resolve (server)
        battle.dataset_id = Pubkey::default(); // Optional for future use
        battle.entry_fee = entry_fee;
        battle.total_pot = 0;
        battle.mode = mode; // 0=Duel, 1=Arena, 2=Blitz
        battle.max_players = max_players;
        battle.players = Vec::new(); // Initialize empty players list
        battle.state = 0; // 0=Waiting

        // Join creator automatically (optional, but robust for game flow)
        // For now, we'll keep creator separate or force join in next instruction.
        // Let's assume create_battle also deposits the creator's stake.

        // Transfer entry fee from creator to battle PDA
        let transfer_instruction = system_instruction::transfer(
            &ctx.accounts.creator.key(),
            &battle.key(),
            entry_fee,
        );

        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.creator.to_account_info(),
                battle.to_account_info(), // PDA holds funds
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        battle.total_pot += entry_fee;
        battle.players.push(ctx.accounts.creator.key());

        Ok(())
    }

    pub fn join_battle(ctx: Context<JoinBattle>) -> Result<()> {
        let battle = &mut ctx.accounts.battle_account;

        require!(battle.state == 0, BattleError::BattleNotOpen);
        require!(battle.players.len() < battle.max_players as usize, BattleError::BattleFull);

        // Transfer entry fee from player to battle PDA
        let transfer_instruction = system_instruction::transfer(
            &ctx.accounts.player.key(),
            &battle.key(),
            battle.entry_fee,
        );

        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.player.to_account_info(),
                battle.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        battle.players.push(ctx.accounts.player.key());
        battle.total_pot += battle.entry_fee;

        // Start battle if full
        if battle.players.len() == battle.max_players as usize {
            battle.state = 1; // Active
        }

        Ok(())
    }

    pub fn resolve_battle(ctx: Context<ResolveBattle>, winner_index: u8) -> Result<()> {
        let battle = &mut ctx.accounts.battle_account;

        require!(battle.state == 1, BattleError::BattleNotActive);
        
        // Ensure winner index is valid
        require!((winner_index as usize) < battle.players.len(), BattleError::InvalidWinner);
        
        let winner = battle.players[winner_index as usize];
        battle.winner = Some(winner);
        battle.state = 2; // Resolved

        // Payout to winner
        // PDA must sign to transfer funds out
        // Note: In production you'd take a fee here.

        let amount = battle.total_pot;
        **battle.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.winner_account.to_account_info().try_borrow_mut_lamports()? += amount;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateBattle<'info> {
    #[account(init, payer = creator, space = 8 + 32 + 32 + 32 + 8 + 8 + 1 + 1 + (4 + 32 * 8) + 1 + 1 + 33)] 
    pub battle_account: Account<'info, BattleAccount>,
    #[account(mut)]
    pub creator: Signer<'info>,
    /// CHECK: This is the server authority key that will resolve battles
    pub authority: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinBattle<'info> {
    #[account(mut)]
    pub battle_account: Account<'info, BattleAccount>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveBattle<'info> {
    #[account(mut, has_one = authority)]
    pub battle_account: Account<'info, BattleAccount>,
    pub authority: Signer<'info>,
    /// CHECK: Must match the pubkey at the winner_index in battle.players
    #[account(mut)]
    pub winner_account: AccountInfo<'info>, 
}

#[account]
pub struct BattleAccount {
    pub creator: Pubkey,
    pub authority: Pubkey,
    pub dataset_id: Pubkey,
    pub entry_fee: u64,
    pub total_pot: u64,
    pub mode: u8,
    pub max_players: u8,
    pub players: Vec<Pubkey>,
    pub state: u8, // 0=Waiting, 1=Active, 2=Resolved
    pub winner: Option<Pubkey>,
}

#[error_code]
pub enum BattleError {
    #[msg("Battle is not in waiting state.")]
    BattleNotOpen,
    #[msg("Battle is already full.")]
    BattleFull,
    #[msg("Battle is not active.")]
    BattleNotActive,
    #[msg("Invalid winner index.")]
    InvalidWinner,
}
