import { JobBuilder } from "../src/job-builder";
import Snowflake from "../src/snowflake";
import { Provider } from "@project-serum/anchor";
import { instructions, tomorrow } from "./test-data";

test("create job", async function () {
  const provider = Provider.local();
  const snowflake = new Snowflake(provider);

  const job = new JobBuilder()
    .jobName("hello world")
    .jobInstructions(instructions)
    .scheduleOnce(tomorrow())
    .build();

  const txId = await snowflake.createJob(job);

  console.log("create job txn signature ", txId);
});
