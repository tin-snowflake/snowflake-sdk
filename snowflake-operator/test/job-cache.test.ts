import { Database } from "sqlite3";
import { DatabaseService } from "../src/services/database-service";
import { JobCacheService } from "../src/services/job-cache-service";
import { flowAccountsData } from "./test-data";

let database: Database;
let jobCacheService: JobCacheService;

beforeAll(() => {});

test("connect to database", () => {
  database = DatabaseService.connectToDatabase();
  expect(database).toBeDefined();

  jobCacheService = new JobCacheService(database);
});

test("create job table", async () => {
  await jobCacheService.createJobsTable();

  const jobs = await jobCacheService.getAllFlows();

  expect(jobs).toHaveLength(0);
});

test("write job to database", async () => {
  await jobCacheService.writeMultipleFlows(flowAccountsData);

  const flows = await jobCacheService.getAllFlows();

  expect(flows.length).toBe(1);
  expect(flows[0].owner.toString()).toBe(
    "BxUeMg5etjmiDX25gbGi2pn1MyzkcQx3ZCCiUifTUhyj"
  );
  expect(flows[0].triggerType).toBe(3);
});

test("invalidate cache", async () => {
  await jobCacheService.writeSingleFlow(flowAccountsData[0]);

  const flows = await jobCacheService.getAllFlows();

  expect(flows.length).toBeGreaterThan(0);

  await jobCacheService.cleanFlows();

  const flowsAfterDeleted = await jobCacheService.getAllFlows();
  expect(flowsAfterDeleted.length).toBe(0);
});
