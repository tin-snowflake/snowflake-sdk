use crate::error;
#[error(offset = 0)]
pub enum ErrorCode {
    // Instructions.
    #[msg("The accounts specified for the job target program is not valid.")]
    InvalidJobTargetAccounts = 100
}