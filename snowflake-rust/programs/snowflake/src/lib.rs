mod error;

use anchor_lang::prelude::*;
use anchor_lang::{Key, solana_program, Accounts};
use anchor_lang::solana_program::program::invoke;
use spl_token::solana_program::program::invoke_signed;

use anchor_lang::solana_program::instruction::Instruction;
use solana_program::pubkey;
use std::num::ParseIntError;
use std::fmt::Write;
use error::ErrorCode;

declare_id!("86G3gad5tVjJxdQmmdQ6E3rLQNnDNh4KYcqiiSd7Az63");

const REPEAT_UNIT_MINUTE: u8 = 1;
const REPEAT_UNIT_HOUR: u8 = 2;
const REPEAT_UNIT_DAY: u8 = 3;
const REPEAT_UNIT_WEEK: u8 = 4;

//Flow with next execution date older than (now - RETRY_WINDOW) won't be executed.
const FLOW_RETRY_WINDOW: i64 = 300;

const TRIGGER_METHOD_MANUAL: u8 = 1;
const TRIGGER_METHOD_SCHEDULE: u8 = 2;


#[program]
pub mod snowflake {
    use super::*;
    use spl_token::instruction;
    use spl_token::solana_program::program::invoke_signed;

    pub fn initialize(ctx: Context<InitializePoolInfo>) -> ProgramResult {
        // create
        let accts = ctx.accounts;
        let sf_pool_info = &mut accts.snowflake_pool_info;
        sf_pool_info.staker_liquidity_mint = accts.staker_liquidity_mint.key();
        sf_pool_info.token_holding_acct = accts.token_holding_acct.key();
        sf_pool_info.authority = accts.authority.key();
        Ok(())
    }

    pub fn init_test(ctx: Context<InitTest>) -> ProgramResult {
        msg!("init test success");
        Ok(())
    }

    pub fn check_job(ctx: Context<CheckJob>) -> ProgramResult {
        emit!(JobReadyEvent {
            job_is_ready : true
        });
        Ok(())
    }

    pub fn execute_job(ctx: Context<ExecuteJob>) -> ProgramResult {
        msg!("start executing job");
        let clock = Clock::get()?;
        let now = clock.unix_timestamp;
        let jobTime = 1631493435;

        msg!("current time {:?} vs job time {:?}", now, jobTime);

        if now > jobTime {
            msg!("job is due, executing now ... ");
            do_execute_job(&ctx);
        } else {
            msg!("too early for execution, do nothing ... ");
        }

        Ok(())
    }

    pub fn create_job(ctx : Context<CreateJob>, job_name: String, job_instruction: String,
                      job_target_program_account_list : Vec<Pubkey>) -> ProgramResult {
        msg!("job_target_program_account_list {:?}", job_target_program_account_list);
        let job_info = &mut ctx.accounts.job_info;
        job_info.job_name = job_name;
        job_info.job_instruction = decode_hex(job_instruction.as_str()).expect("Invalid job instruction data !");
        job_info.job_owner = ctx.accounts.job_owner.key();
        job_info.job_target_program_pubkey = ctx.accounts.target_program.key();
        job_info.job_target_program_account_list = job_target_program_account_list;
        msg!("job created successfully {:?} {:?} {:?}", job_info.job_name, job_info.job_instruction, job_info.job_target_program_pubkey);
        Ok(())
    }

    pub fn create_flow(ctx : Context<CreateFlow>, client_flow: Flow) -> ProgramResult {
        let flow = &mut ctx.accounts.flow;
        flow.flow_owner = ctx.accounts.flow_owner.key();
        apply_flow_data(flow, client_flow);
        Ok(())
    }

    pub fn update_flow(ctx : Context<UpdateFlow>, client_flow: Flow) -> ProgramResult {
        let flow = &mut ctx.accounts.flow;
        apply_flow_data(flow, client_flow);
        msg!("flow is {:?}", flow.name);
        Ok(())
    }

    pub fn delete_flow(ctx : Context<DeleteFlow>) -> ProgramResult {
        let flow = &mut ctx.accounts.flow;
        let caller = &ctx.accounts.caller;
        
        //Check to ensure caller is also account owner
        if flow.flow_owner != *caller.key {
            return Err(ProgramError::IllegalOwner);
        }

        empty_flow_data(flow);

        Ok(())
    }

    pub fn execute_flow(ctx : Context<UpdateFlow>) -> ProgramResult {
        do_execute_flow(ctx, TRIGGER_METHOD_MANUAL)
    }

    pub fn execute_scheduled_flow(ctx : Context<UpdateFlow>) -> ProgramResult {
        let flow = &ctx.accounts.flow;

        if flow.next_execution_time == 0 {
            // Not run 2 lines below in devnet and testnet as cluster time are not correct
            // || flow.next_execution_time > now 
            // || now - flow.next_execution_time > FLOW_RETRY_WINDOW {
            return Ok(());
        }

        do_execute_flow(ctx, TRIGGER_METHOD_SCHEDULE)
    }

    pub fn pay_employee(ctx : Context<PayEmployee>) -> ProgramResult  {

        let (pda, bump) = Pubkey::find_program_address(&[b"snowflake"], ctx.program_id);
        let pda_authority = ctx.accounts.pda_authority.key;

        msg!("pda : {:?} and pda_authority {:?} ", pda, pda_authority);

        let ix_result: Result<Instruction, ProgramError>  = instruction::transfer(
            ctx.accounts.token_program.key,
            ctx.accounts.from.key,
            ctx.accounts.to.key,
            &pda,
            &[],
            20,
        );

        let ix = ix_result?;

        invoke_signed(
            &ix,
            &[
             //   ctx.accounts.token_program.to_account_info(),
                ctx.accounts.from.to_account_info(),
                ctx.accounts.to.to_account_info(),
                ctx.accounts.pda_authority.to_account_info()
            ],
            &[&[b"snowflake", &[bump]]]
        );

        Ok(())
    }
}

fn apply_flow_data(flow: &mut Flow, client_flow: Flow) {
    flow.name = client_flow.name;
    flow.actions = client_flow.actions;
    flow.next_execution_time = client_flow.next_execution_time;
    flow.repeat_interval_unit = client_flow.repeat_interval_unit;
    flow.repeat_interval_value = client_flow.repeat_interval_value;
}

fn empty_flow_data(flow: &mut Flow) {
    flow.name = String::from("");
    flow.actions = Vec::new();
    flow.next_execution_time = 0;
    flow.repeat_interval_unit = 0;
    flow.repeat_interval_value = 0;
    flow.last_execution_time = 0;
    flow.last_trigger_method = 0;
}


#[derive(Accounts)]
pub struct PayEmployee<'info> {
    token_program : AccountInfo<'info>,
    #[account(mut)]
    from : AccountInfo<'info>,
    #[account(mut)]
    to : AccountInfo<'info>,
    pda_authority : AccountInfo<'info>
}

impl Action {
    fn target_account_metas(&self) -> Vec<AccountMeta> {
        self.accounts.iter().map(|item| AccountMeta::from(item)).collect()
    }
}

impl From<&TargetAccountSpec> for AccountMeta {
    fn from(item: &TargetAccountSpec) -> Self {
        AccountMeta {
            pubkey: item.pubkey,
            is_signer: item.is_signer,
            is_writable: item.is_writable
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct Action {
    name : String,
    action_code : u32,
    instruction : Vec<u8>,
    program: Pubkey,
    accounts: Vec<TargetAccountSpec>
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct TargetAccountSpec {
    pub pubkey: Pubkey,
    /// True if an Instruction requires a Transaction signature matching `pubkey`.
    pub is_signer: bool,
    /// True if the `pubkey` can be loaded as a read-write account.
    pub is_writable: bool,
}

#[derive(Accounts)]
pub struct ExecuteFlow<'info> {
    pub flow : Account<'info, Flow>,
}

#[derive(Accounts)]
pub struct CreateJob<'info> {
    #[account(init, payer = job_owner, space = 1048)]
    job_info : Account<'info, Job>,
    #[account(signer)]
    pub job_owner : AccountInfo<'info>,
    pub target_program : AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,

}

#[derive(Accounts)]
pub struct CreateFlow<'info> {
    #[account(init, payer = flow_owner, space = 5000)]
    flow : Account<'info, Flow>,
    #[account(signer)]
    pub flow_owner : AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct UpdateFlow<'info> {
    #[account(mut)]
    flow : Account<'info, Flow>
}

#[derive(Accounts)]
pub struct DeleteFlow<'info> {
    #[account(mut, close=caller)]
    flow : Account<'info, Flow>,
    #[account()]
    pub caller : AccountInfo<'info>,
}

#[account]
#[derive(Debug)]
pub struct Flow {
    pub flow_owner : Pubkey,
    pub repeat_interval_unit: u8,
    pub repeat_interval_value: u16,
    pub next_execution_time: i64,
    pub last_execution_time: i64,
    pub last_trigger_method: u8,
    pub name : String,
    pub actions :  Vec<Action>,
}

#[account]
pub struct Job {
    job_name : String,
    job_instruction : Vec<u8>,
    job_target_program_pubkey : Pubkey,
    job_target_program_account_list : Vec<Pubkey>,
    job_owner : Pubkey,
}

#[derive(Accounts)]
pub struct ExecuteJob<'info> {
    pub target_program : AccountInfo<'info>,
    pub job_info : Account<'info, Job>,
    // pub account_1 : AccountInfo<'info>
}

fn do_execute_job(ctx : &Context<ExecuteJob>) {
    let job_info = &ctx.accounts.job_info;

    // validate_target_accounts(ctx.remaining_accounts,
    //                          &job_info.job_target_program_account_list);

    let ix = Instruction {
        program_id: job_info.job_target_program_pubkey,
        accounts: to_account_metas(ctx.remaining_accounts),
        data: job_info.job_instruction.clone()
    };

    invoke(&ix, ctx.remaining_accounts);
}


fn validate_target_accounts(accounts_passed_in_from_client : &[AccountInfo], job_target_accounts : &Vec<pubkey::Pubkey>)
    -> Result<(), ProgramError> {
    // validate size
    if accounts_passed_in_from_client.len() != job_target_accounts.len() {
        return Err(ErrorCode::InvalidJobTargetAccounts.into())
    }

    // validate each accounts from clients matching each accounts specified in the job
    for (i, target_account) in job_target_accounts.iter().enumerate() {
        let account_passed_in  = accounts_passed_in_from_client.get(i).unwrap();
        if account_passed_in.key != target_account {
            return Err(ErrorCode::InvalidJobTargetAccounts.into())
        }
    }
    Ok(())
}

/* OLD WORKING VERSION
fn do_execute_job(ctx : &Context<ExecuteJob>) {
    let ix = Instruction {
        program_id: ctx.accounts.target_program.key(),
        accounts: vec![AccountMeta::new_readonly(ctx.accounts.account_1.key(), false)],
        data: vec![175, 175, 109, 31, 13, 152, 155, 237]
    };

    let account_1 = ctx.accounts.account_1.to_account_info();
    invoke(&ix, &[account_1]);
}*/

#[event]
pub struct JobReadyEvent {
    job_is_ready : bool
}

#[derive(Accounts)]
pub struct CheckJob {

}


#[derive(Accounts)]
pub struct InitTest<'info> {
    #[account(init, payer = authority, space = 8 + 96)]
    snowflake_pool_info : ProgramAccount<'info, SnowflakePoolInfo>,
    #[account(signer)]
    pub authority : AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct InitializePoolInfo<'info> {
    #[account(init, payer = authority, space = 8 + 96)]
    snowflake_pool_info : Account<'info, SnowflakePoolInfo>,
    token_holding_acct : AccountInfo<'info>,
    staker_liquidity_mint : AccountInfo<'info>,
    pub authority : AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
}

#[account]
pub struct SnowflakePoolInfo {
    token_holding_acct : Pubkey,
    staker_liquidity_mint : Pubkey,
    authority : Pubkey
}

fn decode_hex(input_str: &str) -> Result<Vec<u8>, ParseIntError> {
    let s : String = input_str.chars().filter(|c| !c.is_whitespace()).collect();
    (0..s.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&s[i..i + 2], 16))
        .collect()
}

fn encode_hex(bytes: &[u8]) -> String {
    let mut s = String::with_capacity(bytes.len() * 2);
    for &b in bytes {
        write!(&mut s, "{:02x}", b).unwrap();
    }
    s
}

fn to_account_metas(account_infos : &[AccountInfo]) -> Vec<AccountMeta> {
    account_infos
        .iter()
        .map(|acc| match acc.is_writable {
            false => AccountMeta::new_readonly(*acc.key, acc.is_signer),
            true => AccountMeta::new(*acc.key, acc.is_signer),
        })
        .collect()
}

fn do_execute_flow(ctx: Context<UpdateFlow>, trigger_method: u8) -> ProgramResult {
    let flow = &mut ctx.accounts.flow;
    let (pda, bump) = Pubkey::find_program_address(&[&flow.flow_owner.to_bytes()], ctx.program_id);

    for action in flow.actions.iter() {
        let mut metas = action.target_account_metas();

        for meta in &mut metas {
            if meta.pubkey.eq(&pda) {
                meta.is_signer = true;
            }
        }

        let ix = Instruction {
            program_id: action.program,
            accounts: metas,
            data: action.instruction.clone()
        };

        invoke_signed(&ix, ctx.remaining_accounts, &[&[&flow.flow_owner.to_bytes(), &[bump]]])?;
    }

    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    flow.last_execution_time = now;
    flow.last_trigger_method = trigger_method;

    if trigger_method == TRIGGER_METHOD_SCHEDULE {
        flow.next_execution_time = calculate_next_execution_time(flow);
    }    

    Ok(())
}

fn calculate_next_execution_time(flow: &Flow) -> i64 {
    let seconds: i64;

    match flow.repeat_interval_unit {
        REPEAT_UNIT_MINUTE => seconds = 60,
        REPEAT_UNIT_HOUR => seconds = 60 * 60,
        REPEAT_UNIT_DAY => seconds = 24 * 60 * 60,
        REPEAT_UNIT_WEEK => seconds = 7 * 24 * 60 * 60,
        _ => return 0
    }

    flow.next_execution_time + seconds * (flow.repeat_interval_value as i64)
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::__private::bytemuck::__core::str::FromStr;

    #[test]
    fn test_decode_hex_with_spaces() {
        let input = "09 0A0B  0C";
        let decoded = decode_hex(input).expect("Decoding failed");
        assert_eq!(decoded, vec![9, 10, 11, 12]);
    }

    #[test]
    fn test_decode_hex_without_spaces() {
        let input = "090a0B0c";
        let decoded = decode_hex(input).expect("Decoding failed");
        assert_eq!(decoded, vec![9, 10, 11, 12]);
    }

    #[test]
    fn test_encode_hex() {
        let bytes = &[9, 10, 11, 12];
        let hex_output = encode_hex(bytes);
        assert_eq!(hex_output, "090a0b0c");
    }
    #[test]
    fn test_seed() {
        let testkey =  pubkey::Pubkey::from_str("EpmRY1vzTajbur4hkipMi3MbvjbJHKzqEAAqXj12ccZQ").unwrap().to_bytes();
        let programId = pubkey::Pubkey::from_str("86G3gad5tVjJxdQmmdQ6E3rLQNnDNh4KYcqiiSd7Az63").unwrap();
        let (pda, bump) = Pubkey::find_program_address(&[&testkey], &programId);
        msg!("{:?}",pda);
    }
}