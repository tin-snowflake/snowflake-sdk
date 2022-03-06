mod error;
use anchor_lang::prelude::*;
use anchor_lang::{Accounts, Key, solana_program};
use anchor_lang::solana_program::instruction::Instruction;
use snow_util::scheduler::{SnowSchedule, SnowTime};
use snow_util::operator::controller::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::token::{Token, TokenAccount};
use crate::error::ErrorCode;

declare_id!("BiVwqu45yQTxqTTTAD1UrMZNyZ3qsEVqKwTEfG9BvUs6");

pub enum TriggerType {
    None = 1,
    Time = 2,
    Program = 3
}

pub enum FeeSource {
    FromFeeAccount = 1,
    FromFlow = 2
}

const RECURRING_FOREVER: i16 = -999;
const DEFAULT_RETRY_WINDOW: u32 = 300;

const TIMED_FLOW_COMPLETE: i64 = 0;
const TIMED_FLOW_ERROR: i64 = -1;

const SNF_PROGRAM_SETTINGS_KEY: &str = "APiJdtb25pQf1RCBxCoX2Q2trEjGPeXztJ2NztTQ8SYY";

#[program]
pub mod snowflake {
    use super::*;
    use spl_token::instruction;


    pub fn create_flow(ctx: Context<CreateFlow>, account_size : u32, client_flow: Flow) -> ProgramResult {
        let flow = &mut ctx.accounts.flow;
        flow.owner = ctx.accounts.owner.key();

        let date = Clock::get()?.unix_timestamp;
        flow.created_date = date;
        flow.last_updated_date = date;
        flow.apply_flow_data(client_flow);

        require!(flow.validate_flow_data(),ErrorCode::InvalidJobData);
        Ok(())
    }

    pub fn update_flow(ctx: Context<UpdateFlow>, client_flow: Flow) -> ProgramResult {
        let flow = &mut ctx.accounts.flow;

        flow.last_updated_date = Clock::get()?.unix_timestamp;
        flow.apply_flow_data(client_flow);

        require!(flow.validate_flow_data(),ErrorCode::InvalidJobData);
        Ok(())
    }

    pub fn delete_flow(ctx: Context<DeleteFlow>) -> ProgramResult {
        let flow = &mut ctx.accounts.flow;

        flow.empty_flow_data();

        Ok(())
    }

    pub fn execute_flow<'info>(ctx: Context<'_,'_,'_, 'info, ExecuteFlow<'info>>) -> ProgramResult {
        let pda_bump = *ctx.bumps.get("pda").unwrap();

        do_execute_flow(ctx, pda_bump)
    }

    pub fn execute_scheduled_flow<'info>(ctx: Context<'_,'_,'_, 'info, ExecuteFlow<'info>>) -> ProgramResult {
        let pda_bump = *ctx.bumps.get("pda").unwrap();
        charge_fee(&ctx, pda_bump)?;        

        let operator = &ctx.accounts.caller;
        let program_settings = &ctx.accounts.program_settings;
        let flow = &mut ctx.accounts.flow;
        let now = Clock::get()?.unix_timestamp;

        require!(program_settings.can_operator_excecute_flow(now, &flow.key(), operator.key), ErrorCode::JobIsNotAssignedToOperator);

        require!(flow.is_due_for_execute(now), ErrorCode::JobIsNotDueForExecution);

        flow.update_after_schedule_run(now);

        do_execute_flow(ctx, pda_bump)
    }

    pub fn mark_timed_flow_as_error(ctx: Context<ExecuteFlow>) -> ProgramResult {
        let pda_bump = *ctx.bumps.get("pda").unwrap();
        charge_fee(&ctx, pda_bump)?;

        let operator = &ctx.accounts.caller;
        let program_settings = &ctx.accounts.program_settings;
        let flow = &mut ctx.accounts.flow;
        let now = Clock::get()?.unix_timestamp;
        
        require!(program_settings.can_operator_excecute_flow(now, &flow.key(), operator.key), ErrorCode::JobIsNotAssignedToOperator);
        
        require!(flow.is_schedule_expired(now), ErrorCode::CannotMarkJobAsErrorIfItsWithinSchedule);
        
        flow.next_execution_time = TIMED_FLOW_ERROR;
        flow.last_updated_date = now;

        Ok(())
    }

    pub fn withdraw_native(ctx: Context<WithdrawNative>, amount: u64) -> ProgramResult {
        let caller = &ctx.accounts.caller;
        let pda = &ctx.accounts.pda;
        let pda_bump = *ctx.bumps.get("pda").unwrap();

        let ix = solana_program::system_instruction::transfer(
            &pda.key(),
            &caller.key(),
            amount,
        );
        invoke_signed(
            &ix,
            &[caller.to_account_info(), ctx.accounts.pda.to_account_info()],
            &[&[&caller.key().as_ref(), &[pda_bump]]],
        )?;
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> ProgramResult {
        let caller = &ctx.accounts.caller;
        let pda = &ctx.accounts.pda;
        let pda_bump = *ctx.bumps.get("pda").unwrap();

        let ix_result: Result<Instruction, ProgramError>  = instruction::transfer(
            ctx.accounts.token_program.key,
            &ctx.accounts.source_ata.key(),
            &ctx.accounts.destination_ata.key(),
            &pda.key(),
            &[],
            amount,
        );

        let ix = ix_result?;
        invoke_signed(
            &ix,
            &[
                ctx.accounts.source_ata.to_account_info(),
                ctx.accounts.destination_ata.to_account_info(),
                caller.to_account_info(),
                ctx.accounts.pda.to_account_info()
            ],
            &[&[&caller.key().as_ref(), &[pda_bump]]],
        )?;

        Ok(())
    }

    pub fn init_program_settings(ctx: Context<InitProgramSettings>) -> ProgramResult {
        let program_settings = &mut ctx.accounts.program_settings;
        program_settings.snf_foundation = ctx.accounts.snf_foundation.key();
        program_settings.operators = Vec::new();
        program_settings.operator_to_check_index = -1;
        Ok(())
    }

    pub fn register_operator(ctx: Context<RegisterOperator>) -> ProgramResult {
        let program_settings = &mut ctx.accounts.program_settings;
        let operator = &ctx.accounts.operator;

        require!(!program_settings.is_operator_registered(operator.key), ErrorCode::OperatorIsAlreadyRegistered);
       
        program_settings.operators.push(*operator.key);
        if program_settings.operator_to_check_index == -1 {
            program_settings.operator_to_check_index = 0;
        }

        Ok(())
    }
}

pub fn do_execute_flow<'info>(ctx: Context<'_,'_,'_, 'info,ExecuteFlow<'info>>, pda_bump : u8) -> ProgramResult {
    let flow = &ctx.accounts.flow;
    let pda = &ctx.accounts.pda.key();

    for action in flow.actions.iter() {
        let mut metas = action.target_account_metas();

        for meta in &mut metas {
            if meta.pubkey.eq(pda) {
                meta.is_signer = true;
            }
        }

        let ix = Instruction {
            program_id: action.program,
            accounts: metas,
            data: action.instruction.clone(),
        };

        invoke_signed(
            &ix,
            ctx.remaining_accounts,
            &[&[&flow.owner.as_ref(), &[pda_bump]]],
        )?;
    }
    Ok(())
}

/* CONTEXTS */

#[derive(Accounts)]
pub struct WithdrawNative<'info> {

    pub caller: Signer<'info>,

    /// CHECK : no read and pda is derived from the signer
    #[account(mut, seeds = [&caller.key().as_ref()], bump)]
    pub pda: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {

    pub caller: Signer<'info>,

    /// CHECK : no read or write and pda is derived from the signer
    #[account(seeds = [&caller.key().as_ref()], bump)]
    pub pda: AccountInfo<'info>,

    #[account(mut)]
    destination_ata: Account<'info, TokenAccount>,

    #[account(mut, constraint = &source_ata.owner == &pda.key())]
    pub source_ata: Account<'info, TokenAccount>,

    token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(account_size : u32, client_flow: Flow)]
pub struct CreateFlow<'info> {

    #[account(init, payer = owner, space = account_size as usize)]
    flow: Account<'info, Flow>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateFlow<'info> {

    #[account(mut, has_one = owner)]
    flow: Account<'info, Flow>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct DeleteFlow<'info> {

    #[account(mut, has_one = owner, close=owner)]
    flow: Account<'info, Flow>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteFlow<'info> {

    #[account(mut)]
    flow: Account<'info, Flow>,

    /// CHECK : account is only used for lamports transfer, no assumption made on its data structure
    #[account(mut, seeds = [&flow.owner.as_ref()], bump)]
    pub pda: AccountInfo<'info>,

    pub caller: Signer<'info>,

    pub system_program: Program<'info, System>,

    #[account(address = SNF_PROGRAM_SETTINGS_KEY.parse::<Pubkey>().unwrap())]
    pub program_settings: Account<'info, ProgramSettings>,

}

#[derive(Accounts)]
pub struct InitProgramSettings<'info> {

    #[account(init, payer = snf_foundation, space = 5000)]
    program_settings: Account<'info, ProgramSettings>,

    #[account(mut)]
    pub snf_foundation: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterOperator<'info> {

    #[account(mut, has_one = snf_foundation)]
    program_settings: Account<'info, ProgramSettings>,

    pub snf_foundation: Signer<'info>,

    /// CHECK : no read or write to this account.
    pub operator: UncheckedAccount<'info>,
}


/* DATA MODEL */
#[account]
#[derive(Debug)]
pub struct Flow {
    pub owner: Pubkey,
    pub last_updated_date: i64,
    pub created_date: i64,
    pub trigger_type: u8,
    pub next_execution_time: i64,
    pub retry_window: u32,
    pub recurring: bool,
    pub remaining_runs: i16,
    pub schedule_end_date: i64,
    pub client_app_id: u32,
    pub last_rent_charged: i64,
    pub last_scheduled_execution: i64,
    pub expiry_date: i64,
    pub expire_on_complete: bool,
    pub dedicated_operator: Pubkey,
    pub pay_fee_from: u8,
    pub user_utc_offset: i32,
    pub external_id: String,
    pub cron: String,
    pub name: String,
    pub extra: String,
    pub actions: Vec<Action>,
}

impl Flow {
    fn apply_flow_data(&mut self, client_flow: Flow) {
        self.trigger_type = client_flow.trigger_type;
        self.recurring = client_flow.recurring;
        self.remaining_runs = client_flow.remaining_runs;
        self.retry_window = client_flow.retry_window;
        self.cron = client_flow.cron;
        self.name = client_flow.name;
        self.actions = client_flow.actions;
        self.user_utc_offset = client_flow.user_utc_offset;
        self.pay_fee_from = client_flow.pay_fee_from;
        self.client_app_id = client_flow.client_app_id;
        self.external_id = client_flow.external_id;
        self.schedule_end_date = 0;
        self.expiry_date = 0;
        self.expire_on_complete = false;
        self.extra = String::from("");

        if self.trigger_type == TriggerType::Time as u8 {
            if self.retry_window < 1 {
                self.retry_window = DEFAULT_RETRY_WINDOW;
            }

            if self.recurring {
                if self.has_remaining_runs() {
                    self.next_execution_time = calculate_next_execution_time(&self.cron, self.user_utc_offset as i64);
                }
            } else {
                self.next_execution_time = client_flow.next_execution_time;
                self.remaining_runs = 1;
            }
        }
    }

    fn validate_flow_data(&self)  -> bool {
        if self.trigger_type != TriggerType::None as u8
            && self.trigger_type != TriggerType::Time as u8
            && self.trigger_type != TriggerType::Program as u8 {
            return false;
        }

        if self.remaining_runs < 0 && self.remaining_runs != RECURRING_FOREVER {
            return false;
        }
        true
    }
    
    fn empty_flow_data(&mut self) {
        self.name = String::from("");
        self.actions = Vec::new();
        self.next_execution_time = 0;
        self.last_scheduled_execution = 0;
        self.remaining_runs = 0;
        self.cron = String::from("");
        self.trigger_type = TriggerType::None as u8;
    }

    fn has_remaining_runs(&self) -> bool {
        self.remaining_runs > 0 || self.remaining_runs == RECURRING_FOREVER
    }
        
    fn is_due_for_execute(&self, now: i64) -> bool {
        if self.trigger_type == TriggerType::Program as u8 {
            return self.has_remaining_runs();
        }

        if self.trigger_type == TriggerType::Time as u8 {
            return self.next_execution_time > 0 
                    && self.next_execution_time < now 
                    && now - self.next_execution_time < self.retry_window as i64;
        }

        false
    }

    fn is_schedule_expired(&self, now: i64) -> bool {
        return self.trigger_type == TriggerType::Time as u8
            && self.next_execution_time > 0
            && now.checked_sub(self.next_execution_time).unwrap() > self.retry_window as i64;

    }

    fn update_after_schedule_run(&mut self, now: i64) {
        self.last_scheduled_execution = now;
        if self.remaining_runs != RECURRING_FOREVER {
            self.remaining_runs = self.remaining_runs.checked_sub(1).unwrap();
        }

        if self.trigger_type == TriggerType::Time as u8 {
            self.next_execution_time = 
                if self.has_remaining_runs() {calculate_next_execution_time(&self.cron, self.user_utc_offset as i64)}
                else {TIMED_FLOW_COMPLETE};
        }

        self.last_updated_date = now;
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct Action {
    name: String,
    action_code: u32,
    instruction: Vec<u8>,
    program: Pubkey,
    accounts: Vec<TargetAccountSpec>,
    extra: String
}

impl Action {
    fn target_account_metas(&self) -> Vec<AccountMeta> {
        self.accounts
            .iter()
            .map(|item| AccountMeta::from(item))
            .collect()
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct TargetAccountSpec {
    pub pubkey: Pubkey,
    pub is_signer: bool,
    pub is_writable: bool,
}

impl From<&TargetAccountSpec> for AccountMeta {
    fn from(item: &TargetAccountSpec) -> Self {
        AccountMeta {
            pubkey: item.pubkey,
            is_signer: item.is_signer,
            is_writable: item.is_writable,
        }
    }
}

#[account]
#[derive(Debug)]
pub struct ProgramSettings {
    pub snf_foundation: Pubkey,
    pub operators: Vec<Pubkey>,
    pub operator_to_check_index: i32,
    pub last_check_time: i64,
}

impl ProgramSettings {
  
    fn is_operator_registered(&self, operator: &Pubkey) -> bool {
        for key in &self.operators {
            if key == operator {
                return true;
            }
        }
        false
    }

    fn can_operator_excecute_flow(&self, now: i64, flow_key: &Pubkey, operator_key: &Pubkey) -> bool {
        if !self.is_operator_registered(operator_key) {
            return false;
        }
        can_execute(&self.operators,  now, flow_key, operator_key)
    }
}

/* HELPER METHODS */

fn calculate_next_execution_time(_cron: &str, utc_offset: i64) -> i64 {
    let now = Clock::get().unwrap().unix_timestamp.checked_sub(utc_offset).unwrap();
    let schedule = SnowSchedule::parse(_cron).unwrap();
    let next_execution = schedule.next_event(&SnowTime::from_time_ts(now)).unwrap().to_time_ts(utc_offset);
    next_execution
}

fn charge_fee(ctx: &Context<ExecuteFlow>, pda_bump: u8) -> ProgramResult {
    let fee = Fees::get().unwrap().fee_calculator.lamports_per_signature;
    let pda = &ctx.accounts.pda;
    let caller = &ctx.accounts.caller;
    let flow = &ctx.accounts.flow;

    if flow.pay_fee_from == FeeSource::FromFlow as u8 {
        let flow_account = flow.to_account_info();
        **flow_account.try_borrow_mut_lamports()? = flow_account.to_account_info().lamports().checked_sub(fee).unwrap();
        **caller.try_borrow_mut_lamports()? = caller.to_account_info().lamports().checked_add(fee).unwrap();
    } else {
        let ix = solana_program::system_instruction::transfer(
            &pda.key,
            &caller.key,
            fee,
        );
        invoke_signed(
            &ix,
            &[caller.to_account_info(), pda.to_account_info()],
            &[&[&flow.owner.as_ref(), &[pda_bump]]],
        )?;
    }
    Ok(())
}