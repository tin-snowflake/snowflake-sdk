//! Crontab.rs is a library for parsing cron schedule expressions.

#![deny(deprecated)]
#![deny(missing_docs)]
#![deny(unreachable_patterns)]
#![deny(unused_extern_crates)]
#![deny(unused_imports)]
#![deny(unused_qualifications)]

// use time;


// TODO: Get rid of these.
// #[cfg(test)]
mod test_helpers;
mod snowtime;
mod crontab;
mod error;
mod parsing;
mod times;

// Exports
pub use crontab::Crontab;
pub use parsing::ScheduleComponents;
pub use snowtime::Tm;

