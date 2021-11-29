const Cron = require('cron-converter');

// instantiate cron converter
const cron = new Cron();

export const localCronToUTCCron = localCrontab => {
  console.log('localCronToUTCCron input', localCrontab);
  const localArrayCrontab = cron.fromString(localCrontab).toArray();
  const month = localArrayCrontab[3];
  const day = localArrayCrontab[2];
  const localDate = new Date();
  const offsetHours = Math.floor(localDate.getTimezoneOffset() / 60);
  const offsetMinutes = localDate.getTimezoneOffset() % 60;

  let arrayCrontab = [localArrayCrontab[0].map(minute => (minute + offsetMinutes + 60) % 60), localArrayCrontab[1].map(hour => (hour + offsetHours + 24) % 24), day, month, localArrayCrontab[4]];
  let result = cron.fromArray(arrayCrontab).toString();
  console.log('localCronToUTCCron output', result);
  return result;
};

export const utcCronToLocalCron = localCrontab => {
  console.log('utcCronToLocalCron input', localCrontab);
  const localArrayCrontab = cron.fromString(localCrontab).toArray();
  const month = localArrayCrontab[3];
  const day = localArrayCrontab[2];
  const localDate = new Date();
  const offsetHours = Math.floor(localDate.getTimezoneOffset() / 60);
  const offsetMinutes = localDate.getTimezoneOffset() % 60;

  let arrayCrontab = [localArrayCrontab[0].map(minute => (minute - offsetMinutes + 60) % 60), localArrayCrontab[1].map(hour => (hour - offsetHours + 24) % 24), day, month, localArrayCrontab[4]];
  let result = cron.fromArray(arrayCrontab).toString();
  console.log('utcCronToLocalCron output', result);
  return result;
};
