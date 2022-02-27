use anchor_lang::prelude::*;

#[error]
pub enum ErrorCode {
    #[msg("The job data is invalid.")]
    InvalidJobData,

    #[msg("The job is not assigned to this operator.")]
    JobIsNotAssignedToOperator,

    #[msg("The job is not due for execution.")]
    JobIsNotDueForExecution,

    #[msg("Unable to mark the time triggered job as error because it is still within schedule.")]
    CannotMarkJobAsErrorIfItsWithinSchedule,

    #[msg("The operator is already registered.")]
    OperatorIsAlreadyRegistered,
}