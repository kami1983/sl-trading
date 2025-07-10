use anchor_lang::prelude::*;

declare_id!("19g7kgLjp6TKgtHCgs5rZseG4eeKNqhXf3AhAmRJrtW");

#[program]
pub mod learn_solana_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
