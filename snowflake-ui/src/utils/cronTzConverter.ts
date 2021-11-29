const Cron = require('cron-converter');
const timezoneJS = require('timezone-js');
const tzdata = require('tzdata');

// instantiate cron converter
const cron = new Cron();
// load timezone data
const _tz = timezoneJS.timezone;
_tz.loadingScheme = _tz.loadingSchemes.MANUAL_LOAD;
_tz.loadZoneDataFromObject(tzdata);

export const localCrontabToUtcCrontabs = (localCrontab, timezone) => {
  const localArrayCrontab = cron.fromString(localCrontab).toArray();
  const month = localArrayCrontab[3];
  const day = localArrayCrontab[2];
  const localDate = new timezoneJS.Date(new Date().getFullYear(), month - 1, day, 12, 0, timezone);
  const offsetHours = Math.floor(localDate.getTimezoneOffset() / 60);
  const offsetMinutes = localDate.getTimezoneOffset() % 60;

  let arrayCrontab = [localArrayCrontab[0].map(minute => (minute + offsetMinutes + 60) % 60), localArrayCrontab[1].map(hour => (hour + offsetHours + 24) % 24), [day], [month], localArrayCrontab[4]];
  return cron.fromArray(arrayCrontab).toString();
};
