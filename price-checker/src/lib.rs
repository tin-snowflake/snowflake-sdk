pub mod instruction;
pub mod utils;
pub mod error;

use solana_program::{
    entrypoint,
    pubkey::Pubkey,
    account_info::{AccountInfo, next_account_info},
    msg
};
use pyth_client::{PriceStatus, Price};
use crate::instruction::{PriceCheckCriteria};
use crate::error::PriceCheckError;


entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8]
) -> entrypoint::ProgramResult {
    let account_info_iter = &mut accounts.iter().peekable();
    account_info_iter.size_hint();

    let result = PriceCheckCriteria::unpack(&instruction_data).unwrap();

    for c in result.criteria {
        let price_account = next_account_info(account_info_iter)?;
        let pyth_price_data = &price_account.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);
        
        if !is_active(&pyth_price) {
            return Err(PriceCheckError::PriceAccountNotActive.into());
        }

        //Should we worry about pyth_price.agg.conf ?
        if !c.match_condition(pyth_price.agg.price, pyth_price.expo) {
            msg!("Price condition not match Pyth price: {} ({})", pyth_price.agg.price, pyth_price.expo);
            return Err(PriceCheckError::PriceCriteriaNotMatch.into());
        } 
    }

    msg!("Price criteria matched.");
    Ok(())
}

fn is_active(pyth_price: &Price) -> bool {
    match pyth_price.agg.status {
        PriceStatus::Trading => {
            return true;
        },
        _ => return false,
    }
}
