use anchor_lang::prelude::*;
use anchor_spl::token;
use anchor_spl::token::{ Token, MintTo, Transfer };

// Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS
declare_id!("BWKHL1GyfjpYoYJBmtbaFo83YfANG6r7JLhc25vxxZDh");

#[program]
pub mod toastcoin {
    use super::*;

    // TODO: Add amount
    pub fn mint_token(ctx: Context<MintToken>) -> Result<()> {
        // https://docs.rs/anchor-spl/latest/anchor_spl/token/struct.MintTo.html
        let cpi_accounts = MintTo {
            //get the account
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };

        // get token_program account info
        let cpi_program = ctx.accounts.token_program.to_account_info();
        // Create the CpiContext we need for the request
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        // Execute anchor's helper function to mint tokens
        // https://docs.rs/anchor-spl/latest/anchor_spl/token/fn.mint_to.html
        token::mint_to(cpi_ctx, 10)?;
        Ok(())
    }

    pub fn transfer_token(ctx: Context<TransferToken>) -> Result<()> {
        //  https://docs.rs/anchor-spl/latest/anchor_spl/token/struct.Transfer.html
        let transfer_instruction = Transfer {
            from: ctx.accounts.from.to_account_info(),
            to: ctx.accounts.to.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        // Create the Context for our Transfer request
        let cpi_ctx = CpiContext::new(cpi_program, transfer_instruction);

        // https://docs.rs/anchor-spl/latest/anchor_spl/token/fn.transfer.html
        anchor_spl::token::transfer(cpi_ctx, 5)?;

        Ok(())
    }
}

#[derive(Accounts)]
// https://docs.rs/anchor-spl/latest/anchor_spl/token/struct.MintTo.html
pub struct MintToken<'info> {
    #[account(mut)]
    /// CHECK: This is the token that we want to mint
    pub mint: AccountInfo<'info>,
    // token_program for out cpi contacts that we can mint our token
    pub token_program: Program<'info, Token>,
    /// CHECK: This is the token account that we want to mint tokens to
    #[account(mut)]
    pub to: AccountInfo<'info>,
    /// CHECK: the authority of the mint account
    #[account(mut)]
    pub authority: AccountInfo<'info>,
}

#[derive(Accounts)]
// https://docs.rs/anchor-spl/latest/anchor_spl/token/struct.Transfer.html
pub struct TransferToken<'info> {
    // token_program for out cpi contacts that we can mint our token
    pub token_program: Program<'info, Token>,
    /// CHECK: The associated token account that we are transferring the token from
    #[account(mut)]
    pub from: AccountInfo<'info>,
    /// CHECK: The associated token account that we are transferring the token to
    #[account(mut)]
    pub to: AccountInfo<'info>,
    pub authority: Signer<'info>,
}