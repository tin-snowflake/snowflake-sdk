mod error;

use anchor_lang::prelude::*;
use anchor_lang::{Accounts, Key};
use anchor_lang::solana_program::instruction::Instruction;

//Flow with next execution date older than (now - RETRY_WINDOW) and still pending will be marked as 'error'.
const FLOW_RETRY_WINDOW: i64 = 300;

declare_id!("86G3gad5tVjJxdQmmdQ6E3rLQNnDNh4KYcqiiSd7Az63");

#[program]
pub mod snowflake {
    use super::*;
    use spl_token::solana_program::program::invoke_signed;

    pub fn create_flow(ctx: Context<CreateFlow>, client_flow: Flow) -> ProgramResult {
        let flow = &mut ctx.accounts.flow;
        flow.flow_owner = ctx.accounts.flow_owner.key();
        apply_flow_data(flow, client_flow);
        flow.state = State::Pending;
        Ok(())
    }

    pub fn update_flow(ctx: Context<UpdateFlow>, client_flow: Flow) -> ProgramResult {
        let flow = &mut ctx.accounts.flow;
        let caller = &ctx.accounts.caller;

        if flow.flow_owner != *caller.key {
            return Err(ProgramError::IllegalOwner);
        }

        apply_flow_data(flow, client_flow);

        if flow.remaining_runs > 0 {
            flow.state = State::Pending;
        }
        
        Ok(())
    }

    pub fn delete_flow(ctx: Context<DeleteFlow>) -> ProgramResult {
        let flow = &mut ctx.accounts.flow;
        let caller = &ctx.accounts.caller;

        if flow.flow_owner != *caller.key {
            return Err(ProgramError::IllegalOwner);
        }

        empty_flow_data(flow);
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

        if !should_run_scheduled_flow(flow, now) {
            return Ok(());
        }

        charge_fee(flow);
        update_flow_after_schedule_run(flow, now);

        execute_flow(ctx)
    }

    pub fn mark_timed_flow_as_error(ctx: Context<ExecuteFlow>) -> ProgramResult {
        let flow = &mut ctx.accounts.flow;
        let now = Clock::get()?.unix_timestamp;

        if !should_mark_scheduled_flow_as_error(flow, now) {
            return Ok(());
        }

        charge_txn_fee(flow);
        flow.state = State::Error;
        Ok(())
    }

    pub fn update_schedule(ctx: Context<ExecuteFlow>) -> ProgramResult {
        Ok(())
    }
}


/************************ CONTEXTS */

#[derive(Accounts)]
pub struct CreateFlow<'info> {
    #[account(init, payer = flow_owner, space = 5000)]
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
    pub trigger_type: TriggerType,
    pub state: State,
    pub remaining_runs: u16,
    pub cron: String,
    pub next_execution_time: i64,
    pub last_scheduled_execution: i64,
    pub name: String,
    pub actions: Vec<Action>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub enum TriggerType {
    None,
    Time,
    Program,
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub enum State {
    Pending,
    Complete,
    Error,
    PendingScheduleUpdate,
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

fn apply_flow_data(flow: &mut Flow, client_flow: Flow) {
    flow.trigger_type = client_flow.trigger_type;
    flow.remaining_runs = client_flow.remaining_runs;
    flow.cron = client_flow.cron;
    flow.next_execution_time = client_flow.next_execution_time;

    flow.name = client_flow.name;
    flow.actions = client_flow.actions;
}

fn empty_flow_data(flow: &mut Flow) {
    flow.name = String::from("");
    flow.actions = Vec::new();
    flow.next_execution_time = 0;
    flow.last_scheduled_execution = 0;
    flow.remaining_runs = 0;
    flow.cron = String::from("");
}

fn should_run_scheduled_flow(flow: &Flow, now: i64) -> bool {
    match flow.state {
        State::Pending => {
            match flow.trigger_type {
                TriggerType::Time => {
                    return flow.next_execution_time < now && now - flow.next_execution_time < FLOW_RETRY_WINDOW
                },
                TriggerType::Program => return true,
                _ => return false
            }
        },
        _ => return false
    }
}

fn update_flow_after_schedule_run(flow: &mut Flow, now: i64) {
    flow.last_scheduled_execution = now;
    flow.remaining_runs = flow.remaining_runs - 1;

    match flow.trigger_type {
        TriggerType::Time => {
            flow.state = if flow.remaining_runs < 1 {State::Complete} else {State::PendingScheduleUpdate};
        }
        TriggerType::Program => {
            flow.state = if flow.remaining_runs < 1 {State::Complete} else {State::Pending};
        }
        _ => {}
    }
}

fn should_mark_scheduled_flow_as_error(flow: &Flow, now: i64) -> bool {
    match flow.state {
        State::Pending => {
            match flow.trigger_type {
                TriggerType::Time => {
                    return now - flow.next_execution_time > FLOW_RETRY_WINDOW
                },
                _ => return false
            }
        },
        _ => return false
    }
}

fn charge_fee(_flow: &Flow) {

}

fn charge_txn_fee(_flow: &Flow) {

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
