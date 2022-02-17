import { JobBuilder } from "../src/job-builder";
import Snowflake from "../src/snowflake";
import { Provider } from "@project-serum/anchor";
import { instructions, tomorrow } from "./test-data";
import { Job } from "../src/model";

test("create job", async function () {
  const provider = Provider.local();
  const snowflake = new Snowflake(provider);

  const job = new JobBuilder()
    .jobName("hello world 1")
    .jobInstructions(instructions)
    .scheduleOnce(tomorrow())
    .build();

  const txId = await snowflake.createJob(job);

  console.log("create job txn signature ", txId);
});

test("job conversion test", async function () {
  const job = new JobBuilder()
    .jobName("hello world 1")
    .jobInstructions(instructions)
    .scheduleOnce(tomorrow())
    .build();

  const serJob = job.toSerializableJob();

  console.log("serJob = ", serJob);
});

test("type check", async function () {
  const job = new Job();
  console.log(job.isBN("nextExecutionTime"));
  console.log(job.isBN("name"));
});
