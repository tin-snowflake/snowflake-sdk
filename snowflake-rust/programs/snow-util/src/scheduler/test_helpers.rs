/*//! Functions used in the tests. to be used later
//! This module is only compiled for testing.

use crate::scheduler::snow_time::SnowTime;


/// Get a Tm from a date. Months and days are supplied 1-indexed, but
/// the Tm struct is inconsistently 0- and 1-indexed.
pub (crate) fn get_tm(year: i32,
                      month: i32,
                      day: i32,
                      hour: i32,
                      minute: i32,
                      second: i32) -> SnowTime {


  SnowTime {
    tm_sec: second,
    tm_min: minute,
    tm_hour: hour,
    tm_mday: day,
    tm_mon: month.saturating_sub(1), // zero indexed
    tm_year: year.saturating_sub(1900), // Years since 1900
    tm_wday: 0, // Incorrect, but don't care
    tm_yday: 0, // Incorrect, but don't care
    tm_isdst: 0,
    tm_utcoff: 0,
    tm_nsec: 0,
  }
}

/// Normalize a Tm to drop certain fields entirely.
pub (crate) fn normal(time: &SnowTime) -> SnowTime {
  let mut tm = time.clone();
  tm.tm_wday = 0;
  tm.tm_yday = 0;
  tm.tm_isdst = 0;
  tm.tm_utcoff = 0;
  tm.tm_nsec= 0;
  tm
}
*/