mod error;
mod cron;
use anchor_lang::prelude::*;
use anchor_lang::{Accounts, Key, solana_program};
use anchor_lang::solana_program::instruction::Instruction;
use cron::Crontab;
use crate::cron::Tm;
use anchor_lang::solana_program::program::invoke_signed;

const TRIGGER_TYPE_NONE: u8 = 1;
const TRIGGER_TYPE_TIME: u8 = 2;
const TRIGGER_TYPE_PROGRAM: u8 = 3;

const RECURRING_FOREVER:i16 = -999;
const DEFAULT_RETRY_WINDOW: i64 = 300;

const TIMED_FLOW_COMPLETE: i64 = 0;
const TIMED_FLOW_ERROR: i64 = -1;

const OPERATOR_TIME_SLOT: i64 = 20;
const SNF_APP_SETTINGS_KEY: &str = "BFHUu5FLD32mX2KtvDgzfPYNfANqjKmbUG3ow1wFPwj6";

const PAY_FEE_FROM_FLOW: u8 = 2;

// declare_id!("86G3gad5tVjJxdQmmdQ6E3rLQNnDNh4KYcqiiSd7Az63");
declare_id!("3K4NPJKUJLbgGfxTJumtxv3U3HeJbS3nVjwy8CqFj6F2");

#[program]
pub mod snowflake {
    use super::*;
    use spl_token::solana_program::program::invoke_signed;
    use anchor_lang::solana_program;
    use spl_token::instruction;
    use anchor_lang::__private::bytemuck::__core::str::FromStr;

    pub fn create_flow(ctx: Context<CreateFlow>, client_flow: Flow) -> ProgramResult {
        let flow = &mut ctx.accounts.flow;
        flow.flow_owner = ctx.accounts.flow_owner.key();

        flow.apply_flow_data(client_flow);
        
        if flow.validate_flow_data() {
            Ok(())
        } else {
            Err(ProgramError::InvalidAccountData)
        }
    }

    pub fn update_flow(ctx: Context<UpdateFlow>, client_flow: Flow) -> ProgramResult {
        let flow = &mut ctx.accounts.flow;
        let caller = &ctx.accounts.caller;

        if flow.flow_owner != *caller.key {
            return Err(ProgramError::IllegalOwner);
        }

        flow.apply_flow_data(client_flow);

        if flow.validate_flow_data() {
            Ok(())
        } else {
            Err(ProgramError::InvalidAccountData)
        }
    }

    pub fn delete_flow(ctx: Context<DeleteFlow>) -> ProgramResult {
        let flow = &mut ctx.accounts.flow;
        let caller = &ctx.accounts.caller;

        if flow.flow_owner != *caller.key {
            return Err(ProgramError::IllegalOwner);
        }

        flow.empty_flow_data();

        Ok(())
    }

    pub fn execute_flow<'info>(ctx: Context<'_,'_,'_, 'info, ExecuteFlow<'info>>) -> ProgramResult {
        let pda_bump = validate_execute_flow_pda(&ctx)?;

        do_execute_flow(ctx, pda_bump)
    }

    pub fn execute_scheduled_flow<'info>(ctx: Context<'_,'_,'_, 'info, ExecuteFlow<'info>>) -> ProgramResult {
        let pda_bump = validate_execute_flow_pda(&ctx)?;
        charge_fee(&ctx, pda_bump);        

        let operator = &ctx.accounts.caller;
        let app_settings = &ctx.accounts.app_settings;
        let flow = &mut ctx.accounts.flow;
        let now = Clock::get()?.unix_timestamp;

        let sfn_app_settings_key = Pubkey::from_str(SNF_APP_SETTINGS_KEY).unwrap();
        if app_settings.key() != sfn_app_settings_key {
            return Err(ProgramError::Custom(4));
        }
        
        if !app_settings.can_operator_excecute_flow(now, &flow.key(), operator.key) {
            return Err(ProgramError::Custom(3));
        }

        if !flow.is_due_for_execute(now) {
            return Err(ProgramError::Custom(1));
        }

        flow.update_after_schedule_run(now);

        do_execute_flow(ctx, pda_bump)
    }

    pub fn mark_timed_flow_as_error(ctx: Context<ExecuteFlow>) -> ProgramResult {
        let flow = &mut ctx.accounts.flow;
        let now = Clock::get()?.unix_timestamp;

        if !flow.is_schedule_expired(now) {
            return Err(ProgramError::Custom(2));
        }

        charge_txn_fee();
        flow.next_execution_time = TIMED_FLOW_ERROR;

        Ok(())
    }

    pub fn withdraw_native(ctx: Context<WithdrawNative>, amount: u64) -> ProgramResult {
        let caller = &ctx.accounts.caller;
        let (pda, bump) = Pubkey::find_program_address(&[&caller.key().to_bytes()], ctx.program_id);

        let ix = solana_program::system_instruction::transfer(
            &pda,
       &caller.key(),
            amount,
        );
        invoke_signed(
            &ix,
            &[caller.to_account_info(), ctx.accounts.pda.to_account_info()],
            &[&[&caller.key().to_bytes(), &[bump]]],
        )?;
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> ProgramResult {
        let caller = &ctx.accounts.caller;
        let (pda, bump) = Pubkey::find_program_address(&[&caller.key().to_bytes()], ctx.program_id);

        let ix_result: Result<Instruction, ProgramError>  = instruction::transfer(
            ctx.accounts.token_program.key,
            ctx.accounts.source_ata.key,
            ctx.accounts.destination_ata.key,
            &pda,
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
            &[&[&caller.key().to_bytes(), &[bump]]],
        );

        Ok(())
    }

    pub fn init_app_settings(ctx: Context<InitAppSettings>) -> ProgramResult {
        let app_settings = &mut ctx.accounts.app_settings;
        app_settings.snf_foundation = ctx.accounts.snf_foundation.key();
        app_settings.operators = Vec::new();
        app_settings.operator_to_check_index = -1;
        Ok(())
    }

    pub fn register_operator(ctx: Context<RegisterOperator>) -> ProgramResult {
        let app_settings = &mut ctx.accounts.app_settings;
        let caller = &ctx.accounts.caller;
        let operator = &ctx.accounts.operator;

        //Only SNF Foundation can register new operator
        if app_settings.snf_foundation != *caller.key {
            return Err(ProgramError::IllegalOwner);
        }

        //If key is already in the list - don't add
        if app_settings.is_operator_registered(operator.key) {
            return Err(ProgramError::Custom(1));
        }
       
        app_settings.operators.push(*operator.key);
        if app_settings.operator_to_check_index == -1 {
            app_settings.operator_to_check_index = 0;
        }

        Ok(())
    }
    
    pub fn airdrop_devnet(ctx : Context<Airdrop>, amount: u64) -> ProgramResult {
        let (pda, bump) = Pubkey::find_program_address(&["airdrop_devnet".as_bytes()], ctx.program_id);

        if !pda.eq(ctx.accounts.authority.key) {
            return Err(ProgramError::InvalidArgument);
        }

        let ix = spl_token::instruction::mint_to(
            &spl_token::ID,
            ctx.accounts.mint.key,
            ctx.accounts.to.key,
            ctx.accounts.authority.key,
            &[],
            amount,
        )?;

        solana_program::program::invoke_signed(
            &ix,
            &[
                ctx.accounts.to.clone(),
                ctx.accounts.mint.clone(),
                ctx.accounts.authority.clone(),
                ctx.accounts.token_program.clone(),
            ],
            &[&["airdrop_devnet".as_bytes(), &[bump]]],
        )
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
            &[&[&flow.flow_owner.to_bytes(), &[pda_bump]]],
        )?;
    }
    Ok(())
}

pub fn validate_execute_flow_pda(ctx: &Context<ExecuteFlow>) -> Result<u8, ProgramError> {
    let flow = &ctx.accounts.flow;
    let (pda, bump) = Pubkey::find_program_address(&[&flow.flow_owner.to_bytes()], ctx.program_id);
    if pda.eq(&ctx.accounts.pda.key()) {
        Ok(bump)
    } else {
        Err(ProgramError::InvalidArgument)
    }
}

/************************ CONTEXTS */


#[derive(Accounts)]
pub struct Airdrop<'info> {
    pub authority: AccountInfo<'info>,
    #[account(mut)]
    pub mint: AccountInfo<'info>,
    #[account(mut)]
    pub to: AccountInfo<'info>,
    pub token_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct WithdrawNative<'info> {
    #[account(signer,mut)]
    pub caller: AccountInfo<'info>,

    #[account(mut)]
    pub pda: AccountInfo<'info>,

    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(signer)]
    pub caller: AccountInfo<'info>,

    pub pda: AccountInfo<'info>,

    #[account(mut)]
    pub destination_ata: AccountInfo<'info>,

    #[account(mut)]
    pub source_ata: AccountInfo<'info>,

    token_program : AccountInfo<'info>
}

#[derive(Accounts)]
pub struct CreateFlow<'info> {
    #[account(init, payer = flow_owner, space = 4994)]
    flow: Account<'info, Flow>,
    #[account(signer)]
    pub flow_owner: AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct UpdateFlow<'info> {
    #[account(mut)]
    flow: Account<'info, Flow>,
    #[account(signer)]
    pub caller: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct DeleteFlow<'info> {
    #[account(mut, close=caller)]
    flow: Account<'info, Flow>,
    #[account(signer)]
    pub caller: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct ExecuteFlow<'info> {
    #[account(mut)]
    flow: Account<'info, Flow>,
    #[account(mut)]
    pub pda: AccountInfo<'info>,
    #[account(signer,mut)]
    pub caller: AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
    #[account()]
    pub app_settings: Account<'info, AppSettings>,

}

#[derive(Accounts)]
pub struct InitAppSettings<'info> {
    #[account(init, payer = snf_foundation, space = 1000)]
    app_settings: Account<'info, AppSettings>,
    #[account(signer)]
    pub snf_foundation: AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct RegisterOperator<'info> {
    #[account(mut)]
    app_settings: Account<'info, AppSettings>,
    #[account(signer)]
    pub caller: AccountInfo<'info>,
    pub operator: AccountInfo<'info>,
}


/************************ DATA MODEL */
#[account]
#[derive(Debug)]
pub struct Flow {
    pub flow_owner: Pubkey,
    pub trigger_type: u8,
    pub pay_fee_from: u8,
    pub dedicated_operator: Pubkey,
    pub recurring: bool,
    pub remaining_runs: i16,
    pub schedule_end_date: i64,
    pub next_execution_time: i64,
    pub retry_window: i64,
    pub last_scheduled_execution: i64,
    pub user_utc_offset: i64,
    pub expiry_date: i64,
    pub expire_on_complete: bool,
    pub created_date: i64,
    pub last_rent_charged: i64,
    pub last_updated_date: i64,
    pub client_app_id: Pubkey,
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

        if self.trigger_type == TRIGGER_TYPE_TIME {
            if self.retry_window < 1 {
                self.retry_window = DEFAULT_RETRY_WINDOW;
            }

            if self.recurring {
                if self.has_remaining_runs() {
                    self.next_execution_time = calculate_next_execution_time(&self.cron, self.user_utc_offset);
                }
            } else {
                self.next_execution_time = client_flow.next_execution_time;
                self.remaining_runs = 1;
            }
        }
    }

    fn validate_flow_data(&self)  -> bool {
        if self.trigger_type != TRIGGER_TYPE_NONE 
            && self.trigger_type != TRIGGER_TYPE_TIME 
            && self.trigger_type != TRIGGER_TYPE_PROGRAM {
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
        self.trigger_type = TRIGGER_TYPE_NONE;
    }

    fn has_remaining_runs(&self) -> bool {
        self.remaining_runs > 0 || self.remaining_runs == RECURRING_FOREVER
    }
        
    fn is_due_for_execute(&self, now: i64) -> bool {
        if self.trigger_type == TRIGGER_TYPE_PROGRAM {
            return self.has_remaining_runs();
        }

        if self.trigger_type == TRIGGER_TYPE_TIME {
            return self.next_execution_time > 0 
                    && self.next_execution_time < now 
                    && now - self.next_execution_time < self.retry_window;
        }

        false
    }

    fn is_schedule_expired(&self, now: i64) -> bool {
        return self.trigger_type == TRIGGER_TYPE_TIME 
            && self.next_execution_time > 0
            && now - self.next_execution_time > self.retry_window;
    }

    fn update_after_schedule_run(&mut self, now: i64) {
        self.last_scheduled_execution = now;
        if self.remaining_runs != RECURRING_FOREVER {
            self.remaining_runs = self.remaining_runs - 1;
        }

        if self.trigger_type == TRIGGER_TYPE_TIME {
            self.next_execution_time = 
                if self.has_remaining_runs() {calculate_next_execution_time(&self.cron, self.user_utc_offset)}
                else {TIMED_FLOW_COMPLETE};
        }
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
    /// True if an Instruction requires a Transaction signature matching `pubkey`.
    pub is_signer: bool,
    /// True if the `pubkey` can be loaded as a read-write account.
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
pub struct AppSettings {
    pub snf_foundation: Pubkey,
    pub operators: Vec<Pubkey>,
    pub operator_to_check_index: i32,
    pub last_check_time: i64,

}

impl AppSettings {
  
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

        let flow_id = flow_key.to_bytes()[0] as usize;
        let slot = ((now % 60) / OPERATOR_TIME_SLOT) as usize;

        let n = self.operators.len();
        let operator_index = ((flow_id % n) + slot) % n;
        let operator_in_charge = self.operators.get(operator_index).unwrap();

        operator_in_charge == operator_key
    }
}

/************************ HELPER METHODS */

fn calculate_next_execution_time(_cron: &str, utc_offset: i64) -> i64 {
    let now = Clock::get().unwrap().unix_timestamp - utc_offset;
    let cron = Crontab::parse(_cron).unwrap();
    let next_execution = cron.find_event_after(&Tm::from_time_ts(now)).unwrap().to_time_ts(utc_offset);
    next_execution
}

fn charge_fee(ctx: &Context<ExecuteFlow>, pda_bump: u8) -> ProgramResult {
    let fee = Fees::get().unwrap().fee_calculator.lamports_per_signature;
    let pda = &ctx.accounts.pda;
    let caller = &ctx.accounts.caller;
    let flow = &ctx.accounts.flow;

    if flow.pay_fee_from == PAY_FEE_FROM_FLOW {
        let flow_account = flow.to_account_info();
        **flow_account.try_borrow_mut_lamports()? -= fee;
        **caller.try_borrow_mut_lamports()? += fee;
    } else {
        let ix = solana_program::system_instruction::transfer(
            &pda.key,
            &caller.key,
            fee,
        );
        invoke_signed(
            &ix,
            &[caller.to_account_info(), pda.to_account_info()],
            &[&[&flow.flow_owner.to_bytes(), &[pda_bump]]],
        )?;
    }
    Ok(())
}

fn charge_txn_fee() {

}

// fn decode_hex(input_str: &str) -> Result<Vec<u8>, ParseIntError> {
//     let s: String = input_str.chars().filter(|c| !c.is_whitespace()).collect();
//     (0..s.len())
//         .step_by(2)
//         .map(|i| u8::from_str_radix(&s[i..i + 2], 16))
//         .collect()
// }

// fn encode_hex(bytes: &[u8]) -> String {
//     let mut s = String::with_capacity(bytes.len() * 2);
//     for &b in bytes {
//         write!(&mut s, "{:02x}", b).unwrap();
//     }
//     s
// }

// fn to_account_metas(account_infos: &[AccountInfo]) -> Vec<AccountMeta> {
//     account_infos
//         .iter()
//         .map(|acc| match acc.is_writable {
//             false => AccountMeta::new_readonly(*acc.key, acc.is_signer),
//             true => AccountMeta::new(*acc.key, acc.is_signer),
//         })
//         .collect()
// }

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::__private::bytemuck::__core::str::FromStr;
    use spl_token::solana_program::pubkey;

    // #[test]
    // fn test_decode_hex_with_spaces() {
    //     let input = "09 0A0B  0C";
    //     let decoded = decode_hex(input).expect("Decoding failed");
    //     assert_eq!(decoded, vec![9, 10, 11, 12]);
    // }

    // #[test]
    // fn test_decode_hex_without_spaces() {
    //     let input = "090a0B0c";
    //     let decoded = decode_hex(input).expect("Decoding failed");
    //     assert_eq!(decoded, vec![9, 10, 11, 12]);
    // }

    // #[test]
    // fn test_encode_hex() {
    //     let bytes = &[9, 10, 11, 12];
    //     let hex_output = encode_hex(bytes);
    //     assert_eq!(hex_output, "090a0b0c");
    // }
    #[test]
    fn test_seed() {
        let testkey = pubkey::Pubkey::from_str("EpmRY1vzTajbur4hkipMi3MbvjbJHKzqEAAqXj12ccZQ")
            .unwrap()
            .to_bytes();
        let programId =
            pubkey::Pubkey::from_str("86G3gad5tVjJxdQmmdQ6E3rLQNnDNh4KYcqiiSd7Az63").unwrap();
        let (pda, bump) = Pubkey::find_program_address(&["airdrop_devnet".as_bytes()], &programId);
        msg!("{:?}", pda);
    }

    #[test]
    fn test_app_settings() {
        let mut keys :Vec<Pubkey> = Vec::new();

        let operator0 = pubkey::Pubkey::from_str("EpmRY1vzTajbur4hkipMi3MbvjbJHKzqEAAqXj12ccZQ").unwrap();
        keys.push(operator0);

        let operator1 = pubkey::Pubkey::from_str("86G3gad5tVjJxdQmmdQ6E3rLQNnDNh4KYcqiiSd7Az63").unwrap();
        keys.push(operator1);

        let operator2 = pubkey::Pubkey::from_str("AbugGcRTG2rhAqvE6U4t5qH1ftedcKgEa19BjHbFGCMG").unwrap();
        keys.push(operator2);

        let app_settings = AppSettings {
            snf_foundation: pubkey::Pubkey::from_str("86G3gad5tVjJxdQmmdQ6E3rLQNnDNh4KYcqiiSd7Az63").unwrap(),
            operators: keys,
            operator_to_check_index: 0,
            last_check_time: 0,
        };

        assert_eq!(app_settings.is_operator_registered(&operator0), true);

        let non_registered_operator = pubkey::Pubkey::from_str("9dt6a11nz8EXg7HBo7tqcSqguwBAUDoHvR7nGZPvuu6X").unwrap();
        assert_eq!(app_settings.is_operator_registered(&non_registered_operator), false);

        let mut now: i64 = 12121323343;

        let flow1 = pubkey::Pubkey::from_str("9dt6a11nz8EXg7HBo7tqcSqguwBAUDoHvR7nGZPvuu6X").unwrap();
        let checkop0 = app_settings.can_operator_excecute_flow(now, &flow1, &operator0);
        let checkop1 = app_settings.can_operator_excecute_flow(now, &flow1, &operator1);
        let checkop2 = app_settings.can_operator_excecute_flow(now, &flow1, &operator2);
        println! ("Op 1 - {}, Op 2 - {}, Op 3 - {}", checkop0, checkop1, checkop2);

        now += OPERATOR_TIME_SLOT;
        let checkop0 = app_settings.can_operator_excecute_flow(now, &flow1, &operator0);
        let checkop1 = app_settings.can_operator_excecute_flow(now, &flow1, &operator1);
        let checkop2 = app_settings.can_operator_excecute_flow(now, &flow1, &operator2);
        println! ("Op 1 - {}, Op 2 - {}, Op 3 - {}", checkop0, checkop1, checkop2);

        now += OPERATOR_TIME_SLOT;
        let checkop0 = app_settings.can_operator_excecute_flow(now, &flow1, &operator0);
        let checkop1 = app_settings.can_operator_excecute_flow(now, &flow1, &operator1);
        let checkop2 = app_settings.can_operator_excecute_flow(now, &flow1, &operator2);
        println! ("Op 1 - {}, Op 2 - {}, Op 3 - {}", checkop0, checkop1, checkop2);

        now += OPERATOR_TIME_SLOT;
        let checkop0 = app_settings.can_operator_excecute_flow(now, &flow1, &operator0);
        let checkop1 = app_settings.can_operator_excecute_flow(now, &flow1, &operator1);
        let checkop2 = app_settings.can_operator_excecute_flow(now, &flow1, &operator2);
        println! ("Op 1 - {}, Op 2 - {}, Op 3 - {}", checkop0, checkop1, checkop2);
    }

}
