mod error;
mod cron;
use anchor_lang::prelude::*;
use anchor_lang::{Accounts, Key};
use anchor_lang::solana_program::instruction::Instruction;
use cron::Crontab;
use crate::cron::Tm;

const TRIGGER_TYPE_NONE: u8 = 1;
const TRIGGER_TYPE_TIME: u8 = 2;
const TRIGGER_TYPE_PROGRAM: u8 = 3;

const RECURRING_FOREVER:i16 = -999;
const DEFAULT_RETRY_WINDOW: i64 = 300;

const TIMED_FLOW_COMPLETE: i64 = 0;
const TIMED_FLOW_ERROR: i64 = -1;

declare_id!("86G3gad5tVjJxdQmmdQ6E3rLQNnDNh4KYcqiiSd7Az63");

#[program]
pub mod snowflake {
    use super::*;
    use spl_token::solana_program::program::invoke_signed;

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

    pub fn execute_flow(ctx: Context<ExecuteFlow>) -> ProgramResult {
        let flow = &ctx.accounts.flow;
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
                data: action.instruction.clone(),
            };

            invoke_signed(
                &ix,
                ctx.remaining_accounts,
                &[&[&flow.flow_owner.to_bytes(), &[bump]]],
            )?;
        }

        Ok(())
    }

    pub fn execute_scheduled_flow(ctx: Context<ExecuteFlow>) -> ProgramResult {
        let flow = &mut ctx.accounts.flow;
        let now = Clock::get()?.unix_timestamp;

        if !flow.is_due_for_execute(now) {
            return Err(ProgramError::Custom(1));
        }

        charge_fee();
        flow.update_after_schedule_run(now);

        execute_flow(ctx)
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
}


/************************ CONTEXTS */

#[derive(Accounts)]
pub struct CreateFlow<'info> {
    #[account(init, payer = flow_owner, space = 4992)]
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
}


/************************ DATA MODEL */
#[account]
#[derive(Debug)]
pub struct Flow {
    pub flow_owner: Pubkey,
    pub trigger_type: u8,
    pub recurring: bool,
    pub remaining_runs: i16,
    pub next_execution_time: i64,
    pub retry_window: i64,
    pub last_scheduled_execution: i64,
    pub user_utc_offset: i64,
    pub cron: String,
    pub name: String,
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

/************************ HELPER METHODS */

fn calculate_next_execution_time(_cron: &str, utc_offset: i64) -> i64 {
    let now = Clock::get().unwrap().unix_timestamp;
    let cron = Crontab::parse(_cron).unwrap();
    let next_execution = cron.find_event_after(&Tm::from_time_ts(now)).unwrap().to_time_ts(utc_offset);
    next_execution
}

fn charge_fee() {

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
        let (pda, bump) = Pubkey::find_program_address(&[&testkey], &programId);
        msg!("{:?}", pda);
    }
}
