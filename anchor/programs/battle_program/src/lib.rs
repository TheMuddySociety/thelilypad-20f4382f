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
        duration_seconds: i64,
        max_players: u8,
    ) -> Result<()> {
        let battle = &mut ctx.accounts.battle_account;

        battle.creator = ctx.accounts.creator.key();
        battle.collection_mint = ctx.accounts.collection_mint.key();
        battle.authority = ctx.accounts.authority.key();
        
        // Optional entry fee (e.g. anti-spam or pot builder)
        battle.entry_fee = entry_fee;
        if entry_fee > 0 {
             let transfer_instruction = system_instruction::transfer(
                &ctx.accounts.creator.key(),
                &battle.key(),
                entry_fee,
            );
            anchor_lang::solana_program::program::invoke(
                &transfer_instruction,
                &[
                    ctx.accounts.creator.to_account_info(),
                    battle.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;
        }

        battle.total_pot = entry_fee; // Pot starts with creator fee
        battle.mode = mode; // 0=Duel, 1=Arena
        battle.max_players = max_players;
        battle.participants = Vec::new();
        
        let clock = Clock::get()?;
        battle.start_time = clock.unix_timestamp;
        battle.end_time = clock.unix_timestamp + duration_seconds;
        battle.state = 0; // 0=Waiting/Active (depending on logic)

        // Add creator as first participant
        battle.participants.push(Participant {
            address: ctx.accounts.creator.key(),
            volume_swapped: 0,
            swaps_count: 0,
            score: 0,
        });

        // If simple join is not needed and creation implies start:
        // battle.state = 1; 

        msg!("Battle Created: {} for collection {}", battle.key(), battle.collection_mint);
        Ok(())
    }

    pub fn join_battle(ctx: Context<JoinBattle>) -> Result<()> {
        let battle = &mut ctx.accounts.battle_account;
        
        // Check if battle is open
        let clock = Clock::get()?;
        require!(clock.unix_timestamp < battle.end_time, BattleError::BattleEnded);
        require!(battle.participants.len() < battle.max_players as usize, BattleError::BattleFull);

        // Handle Entry Fee
        if battle.entry_fee > 0 {
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
            battle.total_pot += battle.entry_fee;
        }

        battle.participants.push(Participant {
            address: ctx.accounts.player.key(),
            volume_swapped: 0,
            swaps_count: 0,
            score: 0,
        });
        
        if battle.participants.len() >= 2 && battle.state == 0 {
            battle.state = 1; // Mark active if we have opponents
        }

        msg!("Player Joined: {}", ctx.accounts.player.key());
        Ok(())
    }

    // verifiable_swap_amount would come from a trusted source or oracle in a real scenario
    // For now, we simulate the "Gamification" aspect where an authorized backend verifies the swap happened
    pub fn record_swap(ctx: Context<RecordSwap>, participant_index: u8, volume: u64) -> Result<()> {
        let battle = &mut ctx.accounts.battle_account;
        
        require!(battle.state == 1, BattleError::BattleNotActive);
        let clock = Clock::get()?;
        
        // Auto-close if time is up
        if clock.unix_timestamp > battle.end_time {
            battle.state = 2; // Ended
            return Err(BattleError::BattleEnded.into());
        }

        require!((participant_index as usize) < battle.participants.len(), BattleError::InvalidParticipant);

        let participant = &mut battle.participants[participant_index as usize];
        participant.volume_swapped += volume;
        participant.swaps_count += 1;
        
        // Score logic: volume is score
        participant.score = participant.volume_swapped;

        msg!("Swap Recorded: {} vol for player {}", volume, participant.address);
        Ok(())
    }

    pub fn claim_rewards(ctx: Context<ClaimRewards>, winner_index: u8) -> Result<()> {
        let battle = &mut ctx.accounts.battle_account;

        require!(battle.state == 2 || battle.state == 1, BattleError::BattleNotEnded); // Can claim if ended or if we manually end it now
        
        // Ensure only authority can trigger payout (for now)
        // In future, anyone can call if on-chain logic confirms winner deterministically
        
        let winner_pubkey = battle.participants[winner_index as usize].address;
        require!(winner_pubkey == ctx.accounts.winner.key(), BattleError::InvalidWinner);

        let reward_amount = battle.total_pot;
        require!(reward_amount > 0, BattleError::NoRewards);

        // Transfer pot to winner
        **battle.to_account_info().try_borrow_mut_lamports()? -= reward_amount;
        **ctx.accounts.winner.to_account_info().try_borrow_mut_lamports()? += reward_amount;
        
        battle.total_pot = 0;
        battle.state = 3; // 3 = Paid/Closed

        msg!("Rewards Claimed: {} lamports to {}", reward_amount, winner_pubkey);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateBattle<'info> {
    #[account(init, payer = creator, space = 8 + 500)] 
    pub battle_account: Account<'info, BattleAccount>,
    #[account(mut)]
    pub creator: Signer<'info>,
    /// CHECK: Collection mint to track
    pub collection_mint: AccountInfo<'info>,
    /// CHECK: Server authority
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
pub struct RecordSwap<'info> {
    #[account(mut, has_one = authority)]
    pub battle_account: Account<'info, BattleAccount>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut, has_one = authority)]
    pub battle_account: Account<'info, BattleAccount>,
    pub authority: Signer<'info>,
    #[account(mut)]
    pub winner: AccountInfo<'info>,
}

#[account]
pub struct BattleAccount {
    pub creator: Pubkey,
    pub collection_mint: Pubkey, 
    pub authority: Pubkey,
    
    pub entry_fee: u64,
    pub total_pot: u64, 
    
    pub start_time: i64,
    pub end_time: i64,
    
    pub mode: u8,
    pub max_players: u8,
    pub state: u8, // 0=Waiting, 1=Active, 2=Ended, 3=Closed
    
    pub participants: Vec<Participant>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct Participant {
    pub address: Pubkey,
    pub volume_swapped: u64, 
    pub swaps_count: u32,
    pub score: u64,
}

#[error_code]
pub enum BattleError {
    #[msg("Battle Not Active")]
    BattleNotActive,
    #[msg("Battle Full")]
    BattleFull,
    #[msg("Battle Ended")]
    BattleEnded,
    #[msg("Battle Not Ended")]
    BattleNotEnded,
    #[msg("Invalid Participant Index")]
    InvalidParticipant,
    #[msg("Invalid Winner Address")]
    InvalidWinner,
    #[msg("No Rewards to Claim")]
    NoRewards,
}
