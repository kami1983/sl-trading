use anchor_lang::prelude::*;

declare_id!("19g7kgLjp6TKgtHCgs5rZseG4eeKNqhXf3AhAmRJrtW");

#[program]
pub mod learn_solana_program {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        msg!("Initialize!");
        Ok(())
    }

    #[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
    pub enum TradeType {
        BUY,
        SELL,
    }

    #[event]
    pub struct TradeEvent {
        pub id: String,            
        pub user_id: String,       
        pub fund_id: String,       
        pub trade_type: TradeType, 
        pub amount: u64,           
        pub price: u64,            
        pub timestamp: i64,
    }

    pub fn log_trade(
        _ctx: Context<LogTrade>,
        id: String,
        user_id: String,
        fund_id: String,
        trade_type: TradeType,
        amount: u64,
        price: u64,
        timestamp: i64,
    ) -> Result<()> {
        // 发出交易事件
        emit!(TradeEvent {
            id: id.clone(),
            user_id,
            fund_id,
            trade_type: trade_type.clone(),
            amount,
            price,
            timestamp,
        });

        msg!("Trade event emitted - ID: {}, Type: {:?}, Amount: {}, Price: {}", 
            id,
            trade_type,
            amount,
            price
        );

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct LogTrade<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
}
