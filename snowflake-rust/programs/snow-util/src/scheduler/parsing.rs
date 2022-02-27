#![allow(deprecated)]

use std::collections::{BTreeSet};
use std::iter::FromIterator;
use super::error::CrontabError;

/// The components of a crontab schedule.
/// The values in each field are guaranteed to be both unique and ordered.
#[derive(Clone, Debug, Default)]
pub struct ScheduleComponents {
  /// Minutes in the schedule.
  /// Range [0,59] inclusive.
  pub minutes: Vec<u32>,

  /// Hours in the schedule.
  /// Range [0,23] inclusive.
  pub hours: Vec<u32>,

  /// Days of the month in the schedule.
  /// Range [1,31] inclusive.
  pub days: Vec<u32>,

  /// Months in the schedule.
  /// Range [1,12] inclusive.
  pub months: Vec<u32>,

  /// Days of the week in the schedule.
  /// Range [0,6] inclusive.
  pub weekdays: Vec<u32>,

  /// Seconds in the schedule.
  /// Not yet in use. Do not use.
  #[deprecated(since="0.2.0", note="Field is never set!")]
  pub seconds: Vec<u32>,
}

pub (crate) fn parse_cron(schedule: &str)
    -> Result<ScheduleComponents, CrontabError> {
  let fields : Vec<&str> = schedule.trim()
      .split_whitespace()
      .collect();

  if fields.len() != 5 {
    return Err(CrontabError::ErrCronFormat(
      format!("Invalid format: {}", schedule)));
  }
  let minutes = parse_field(fields[0], 0, 59)?;
  let hours = parse_field(fields[1], 0, 23)?;
  let days = parse_field(fields[2], 1, 31)?;
  let months = parse_field(fields[3], 1, 12)?;
  let weekdays = parse_field(fields[4], 0, 6)?;
  Ok(ScheduleComponents {
    minutes: minutes,
    hours: hours,
    days: days,
    months: months,
    weekdays: weekdays,
    seconds: Vec::new(), // FIXME: Implement (though nonstandard).
  })
}

fn parse_field(field: &str, field_min: u32, field_max: u32)
    -> Result<Vec<u32>, CrontabError> {
  let mut components = BTreeSet::<u32>::new();
  for part in field.split(",") {
    let mut min = field_min;
    let mut max = field_max;
    let mut step = 1;

    // stepped, eg. */2 or 1-45/3
    let stepped : Vec<&str> = part.splitn(2, "/").collect();

    // ranges, eg. 1-30
    let range : Vec<&str> = stepped[0].splitn(2, "-").collect();

    if stepped.len() == 2 {
      step = stepped[1].parse::<u32>()?;
    }

    if range.len() == 2 {
      min = range[0].parse::<u32>()?;
      max = range[1].parse::<u32>()?;
    }

    if stepped.len() == 1 && range.len() == 1 && part != "*" {
      min = part.parse::<u32>()?;
      max = min;
    }

    if min < field_min {
      return Err(CrontabError::FieldOutsideRange {
        description: format!("Value {} is less than minimum: {}", min, field_min)
      });
    }

    if max > field_max {
      return Err(CrontabError::FieldOutsideRange {
        description: format!("Value {} is greater than maximum: {}", max, field_max)
      });
    }

    let values = (min .. max + 1).filter(|i| i % step == 0)
        .collect::<Vec<u32>>();

    components.extend(values);
  }

  let mut components : Vec<u32> = Vec::from_iter(components.into_iter());
  components.sort();

  Ok(components)
}
