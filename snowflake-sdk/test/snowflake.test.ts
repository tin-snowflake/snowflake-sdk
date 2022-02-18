import { JobBuilder } from "../src/job-builder";
import Snowflake from "../src/snowflake";
import { Provider } from "@project-serum/anchor";
import { instructions, tomorrow } from "./test-data";
import { TriggerType } from "../src/model";

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

  const fetchedJob = await snowflake.fetch(job.pubKey);

  console.log(fetchedJob);

  expect(fetchedJob.name).toBe("hello world");
  expect(fetchedJob.triggerType).toBe(TriggerType.Time);
  expect(fetchedJob.recurring).toBe(false);
  expect(fetchedJob.pubKey).toBeDefined();
});

test("update job", async function () {
  const provider = Provider.local();
  const snowflake = new Snowflake(provider);

  const job = new JobBuilder()
    .jobName("hello world")
    .jobInstructions(instructions)
    .scheduleOnce(tomorrow())
    .build();

  await snowflake.createJob(job);

  let fetchedJob = await snowflake.fetch(job.pubKey);

  expect(fetchedJob.name).toBe("hello world");
  expect(fetchedJob.triggerType).toBe(TriggerType.Time);
  expect(fetchedJob.recurring).toBe(false);

  fetchedJob = new JobBuilder()
    .fromExistingJob(fetchedJob)
    .jobName("hello world 2")
    .scheduleCron("0 * * * *", 2)
    .build();

  await snowflake.updateJob(fetchedJob);
  fetchedJob = await snowflake.fetch(job.pubKey);

  expect(fetchedJob.name).toBe("hello world 2");
  expect(fetchedJob.triggerType).toBe(TriggerType.Time);
  expect(fetchedJob.recurring).toBe(true);
});
