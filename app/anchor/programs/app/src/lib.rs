use anchor_lang::prelude::*;

declare_id!("5Fmp1yJbn6UTLoasmbmKSMBAELE1ayeZsRRdUcN8Q9Y5");

#[program]
pub mod app {
    use super::*;

    pub fn greet(_ctx: Context<Initialize>) -> Result<()> {
        msg!("GM!");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
