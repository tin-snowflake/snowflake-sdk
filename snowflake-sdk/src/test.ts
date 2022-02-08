import SnowService from "./snow-service";
import { Snowflake } from "./snowflake";
const snowService = SnowService.instance();

async function main() {
  const instructions = [];
  const connection = [];

  const snowflake = new Snowflake(connection);

  // schedule instructions to run once at 12:00 22-10-2022
  const tx1 = snowflake.scheduleOnce(instructions, "12:00 22-10-2022");

  // schedule instructions to run on the 15th day of the month for 3 times.
  const tx2 = snowflake.scheduleCron(instructions, "* * 15 * 1 *", 3);

  // schedule instructions to run as long as the program condition is true for 4 times
  const tx3 = snowflake.scheduleConditional(instructions, 4);

  // to create the schedule instruction
  const ix = snowflake.automationBuider().
    .forInstructions(ixs)
    .runAt("xyz")
    .runFor(3)
    .build();

  snowflake.schedule(ix);
}

main().then(() => console.log("Success"));
