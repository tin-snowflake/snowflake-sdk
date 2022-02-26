use super::error::CrontabError;
use super::parsing::{ScheduleComponents, parse_cron};
use super::snow_time::SnowTime;
use super::times::{adv_month, adv_day, adv_hour, adv_minute};
/// Represents a crontab schedule.
#[derive(Clone)]
pub struct SnowSchedule {
  /// The components parsed from a crontab schedule.
  pub schedule: ScheduleComponents,
}

impl SnowSchedule {

  /// Parse a crontab schedule into a Crontab instance.
  pub fn parse(crontab_schedule: &str) -> Result<SnowSchedule, CrontabError> {

    let schedule = parse_cron(crontab_schedule)?;
    Ok(SnowSchedule {
      schedule: schedule,
    })
  }

  pub fn find_event_after(&self, start_time: &SnowTime) -> Option<SnowTime> {
    calculate_next_event(&self.schedule, start_time)
  }

}

// TODO: Stop testing this. Test the Crontab method instead.
pub (crate) fn calculate_next_event(times: &ScheduleComponents, time: &SnowTime)
    -> Option<SnowTime> {
  let mut next_time = time.clone();

  // Minute-resolution. We're always going to round up to the next minute.
  next_time.tm_sec = 0;
  adv_minute(&mut next_time);

  loop {
    match try_month(times, &mut next_time) {
      DateTimeMatch::Missed => continue, // Retry
      DateTimeMatch::ContinueMatching => {}, // Continue
      DateTimeMatch::AnswerFound(upcoming) => return Some(upcoming),
    }

    match try_day(times, &mut next_time) {
      DateTimeMatch::Missed => continue, // Retry
      DateTimeMatch::ContinueMatching => {}, // Continue
      DateTimeMatch::AnswerFound(upcoming) => return Some(upcoming),
    }

    match try_hour(times, &mut next_time) {
      DateTimeMatch::Missed => continue, // Retry
      DateTimeMatch::ContinueMatching => {}, // Continue
      DateTimeMatch::AnswerFound(upcoming) => return Some(upcoming),
    }

    match try_minute(times, &mut next_time) {
      DateTimeMatch::Missed => continue, // Retry
      DateTimeMatch::ContinueMatching => return Some(next_time), // Uhh...
      DateTimeMatch::AnswerFound(upcoming) => return Some(upcoming),
    }
  }
}

enum DateTimeMatch {
  Missed,
  ContinueMatching,
  AnswerFound(SnowTime),
}

fn try_month(times: &ScheduleComponents, time: &mut SnowTime) -> DateTimeMatch {
  // Tm month range is [0, 11]
  // Cron months are [1, 12]
  let test_month = (time.tm_mon + 1) as u32;

  match times.months.binary_search(&test_month) {
    Ok(_) => {
      // Precise month... must keep matching
      DateTimeMatch::ContinueMatching
    },
    Err(pos) => {
      if let Some(month) = times.months.get(pos) {
        // Next month. We're done.
        let mut use_time = time.clone();
        use_time.tm_mon = (month - 1) as i32;
        // Tm day range is [1, 31]
        use_time.tm_mday = times.days.get(0).unwrap().clone() as i32;
        // Tm hour range is [0, 23]
        use_time.tm_hour = times.hours.get(0).unwrap().clone() as i32;
        // Tm minute range is [0, 59]
        use_time.tm_min = times.minutes.get(0).unwrap().clone() as i32;
        use_time.tm_sec = 0; // Second resolution

        DateTimeMatch::AnswerFound(use_time)

      } else {
        // Skipped beyond. Pop to last unit and use next value.
        time.tm_year = time.tm_year + 1;
        // Tm month range is [0, 11], Cron months are [1, 12]
        time.tm_mon = (times.months.get(0).unwrap().clone() - 1) as i32;
        // Tm day range is [1, 31]
        time.tm_mday = times.days.get(0).unwrap().clone() as i32;
        // Tm hour range is [0, 23]
        time.tm_hour = times.hours.get(0).unwrap().clone() as i32;
        // Tm minute range is [0, 59]
        time.tm_min = times.minutes.get(0).unwrap().clone() as i32;
        time.tm_sec = 0; // Second resolution

        DateTimeMatch::Missed
      }
    }
  }
}

fn try_day(times: &ScheduleComponents, time: &mut SnowTime) -> DateTimeMatch {
  match times.days.binary_search(&(time.tm_mday as u32)) {
    Ok(_) => {
      // Precise month... must keep matching
      DateTimeMatch::ContinueMatching
    },
    Err(pos) => {
      if let Some(day) = times.days.get(pos) {
        // Next day. We're done.
        let mut use_time = time.clone();
        // Tm day range is [1, 31]
        use_time.tm_mday = day.clone() as i32;
        // Tm hour range is [0, 23]
        use_time.tm_hour = times.hours.get(0).unwrap().clone() as i32;
        // Tm minute range is [0, 59]
        use_time.tm_min = times.minutes.get(0).unwrap().clone() as i32;
        use_time.tm_sec = 0; // Second resolution

        DateTimeMatch::AnswerFound(use_time)

      } else {
        time.tm_mday = 1; // Reset day (1-indexed)
        time.tm_hour = 0; // Reset hour
        time.tm_min = 0; // Reset minute
        time.tm_sec = 0; // Reset second
        adv_month(time);
        DateTimeMatch::Missed
      }
    }
  }
}

fn try_hour(times: &ScheduleComponents, time: &mut SnowTime) -> DateTimeMatch {
  match times.hours.binary_search(&(time.tm_hour as u32)) {
    Ok(_) => {
      // Precise month... must keep matching
      DateTimeMatch::ContinueMatching
    },
    Err(pos) => {
      if let Some(hour) = times.hours.get(pos) {
        // Next hour. We're done.
        let mut use_time = time.clone();
        // Tm hour range is [0, 23]
        use_time.tm_hour = hour.clone() as i32;
        // Tm minute range is [0, 59]
        use_time.tm_min = times.minutes.get(0).unwrap().clone() as i32;
        use_time.tm_sec = 0; // Second resolution

        DateTimeMatch::AnswerFound(use_time)

      } else {
        time.tm_hour = 0; // Reset hour
        time.tm_min = 0; // Reset minute
        time.tm_sec = 0; // Reset second
        adv_day(time);
        DateTimeMatch::Missed
      }
    }
  }
}

fn try_minute(times: &ScheduleComponents, time: &mut SnowTime) -> DateTimeMatch {
  match times.minutes.binary_search(&(time.tm_min as u32)) {
    Ok(_) => {
      // DONE
      let mut use_time = time.clone();
      //use_time.tm_min = minute.clone() as i32;
      use_time.tm_sec = 0; // Second resolution
      DateTimeMatch::AnswerFound(use_time)
    },
    Err(pos) => {
      if let Some(minute) = times.minutes.get(pos) {
        // Next minute. We're done.
        let mut use_time = time.clone();
        // Tm minute range is [0, 59]
        use_time.tm_min = minute.clone() as i32;
        use_time.tm_sec = 0; // Second resolution

        DateTimeMatch::AnswerFound(use_time)

      } else {
        time.tm_min = 0; // Reset minute
        time.tm_sec = 0; // Reset second
        adv_hour(time);
        DateTimeMatch::Missed
      }
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use SnowSchedule;

  fn parse_times(schedule: &str) -> ScheduleComponents {
    let crontab = SnowSchedule::parse(schedule).ok().unwrap();
    crontab.schedule
  }


  #[test]
  fn first_of_the_month() {
    // First of the month at 0:00.

    let cron = SnowSchedule::parse("0 12 * 12 4").unwrap();
    let next_execution = cron.find_event_after(&SnowTime::from_time_ts(1638148600)).unwrap();
    println!("next execution is {:?}", next_execution);
    // let tm = get_tm(2004, 1, 1, 0, 1, 59);
/*
    // A minute late... advances the month.
    let tm = get_tm(2004, 1, 1, 0, 1, 59);
    let next = calculate_next_event(&times, &tm).unwrap();
    expect!(normal(&next)).to(be_equal_to(get_tm(2004, 2, 1, 0, 0, 0)));

    // A few hours late... advances the month.
    let tm = get_tm(2004, 1, 1, 12, 59, 59);
    let next = calculate_next_event(&times, &tm).unwrap();
    expect!(normal(&next)).to(be_equal_to(get_tm(2004, 2, 1, 0, 0, 0)));

    // Halfway through month advances the month.
    let tm = get_tm(2004, 1, 15, 0, 0, 0);
    let next = calculate_next_event(&times, &tm).unwrap();
    expect!(normal(&next)).to(be_equal_to(get_tm(2004, 2, 1, 0, 0, 0)));

    // Halfway through month at end of year advances the year.
    let tm = get_tm(2004, 12, 15, 0, 0, 0);
    let next = calculate_next_event(&times, &tm).unwrap();
    expect!(normal(&next)).to(be_equal_to(get_tm(2005, 1, 1, 0, 0, 0)));*/
  }
}