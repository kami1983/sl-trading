use anchor_lang::prelude::*;

declare_id!("AYSiAKC8KwsEznPuN2BBYJzdmmgm5kDmzNNsDo2QpD3G");

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
