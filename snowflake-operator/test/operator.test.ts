import { ProgramAccount } from "@project-serum/anchor";
import { FlowModel } from "../src/models/flow";
import { DatabaseService } from "../src/services/database-service";
import { JobCacheService } from "../src/services/job-cache-service";
import SnowService from "../src/services/snow-service";

let snowService: SnowService;
let jobCacheService: JobCacheService;
let cachedFlows: ProgramAccount<FlowModel>[] = [];

beforeAll(() => {
  const databaseService = DatabaseService.instance();
  snowService = SnowService.instance();
  jobCacheService = new JobCacheService(databaseService.database);
});

test("test cache flows", async () => {
  /**
   * Create the jobs table for caching if it doesn't exist
   */
  await jobCacheService.createJobsTable();

  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt == 0) {
      const fetchedJob = await jobCacheService.getAllFlows();
      expect(fetchedJob).toHaveLength(0);
    }
    /**
     * Check if there are any flows in the cache
     */
    const memoryFlows = await jobCacheService.getAllFlows();
    const isCached = memoryFlows && memoryFlows.length > 0;

    if (attempt == 0) {
      expect(memoryFlows).toHaveLength(0);
      expect(isCached).toBeFalsy();
    }

    if (isCached) {
      expect(attempt).toBe(1);
      expect(cachedFlows).toHaveLength(memoryFlows.length);

      /**
       * If there are flows in the cache, we need to check if they are still valid
       */
      cachedFlows = memoryFlows.map((flow) => ({
        account: flow,
        publicKey: flow.pubkey,
      }));
    } else {
      /**
       * If there are no flows in the cache, then we need to get the flows from the Snowflake Service
       */
      const flows = await snowService.listAllFlows();

      if (flows && flows.length > 0) {
        const flowAccounts = flows.map<FlowModel>((flow) => ({
          ...flow.account,
          pubkey: flow.publicKey,
        }));
        /**
         * We need to write the flows to the cache
         */
        await jobCacheService.writeMultipleFlows(flowAccounts);
      }

      const fetchedJob = await jobCacheService.getAllFlows();
      expect(flows).toHaveLength(fetchedJob.length);

      cachedFlows = flows;
    }
  }

  await jobCacheService.cleanFlows();

  const cleanedFlows = await jobCacheService.getAllFlows();
  expect(cleanedFlows).toHaveLength(0);
});
