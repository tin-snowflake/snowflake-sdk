use thiserror::Error;
use solana_program::program_error::ProgramError;

#[derive(Error, Debug, Copy, Clone)]
pub enum PriceCheckError {
    #[error("Price Account Not Active")]
    PriceAccountNotActive,
    #[error("Price Criteria Not Match")]
    PriceCriteriaNotMatch,
}

impl From<PriceCheckError> for ProgramError {
    fn from(e: PriceCheckError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
