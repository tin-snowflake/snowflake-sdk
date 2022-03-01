import SnowService from "./services/snow-service";
import log4js from "log4js";
import { LOG4JS_CONFIG } from "./constants/log4js-config";
import { JobCacheService } from "./services/job-cache-service";
import { DatabaseService } from "./services/database-service";
import "dotenv/config";
import { ProgramAccount } from "@project-serum/anchor";
import { FlowModel } from "./models/flow";
import cron from "node-cron";

log4js.configure(LOG4JS_CONFIG);

class SnowflakeOperator {
  ONE_HOUR = 1000 * 60 * 60;

  snowService = SnowService.instance();
  dbService = DatabaseService.instance();
  jobCacheService = new JobCacheService(this.dbService.database);
  logger = log4js.getLogger("Operator");

  static instance(): SnowflakeOperator {
    return new SnowflakeOperator();
  }

  async bootstrap() {
    try {
      console.log("Running...");
      this.logger.info("Running Node Operator");
      /**
       * Create the jobs table for caching if it doesn't exist
       */
      await this.jobCacheService.createJobsTable();
      let tempFlows: ProgramAccount<FlowModel>[] = [];

      /**
       * Check if there are any flows in the cache
       */
      const memoryFlows = await this.jobCacheService.getAllFlows();
      const isCached = memoryFlows && memoryFlows.length > 0;
      if (isCached) {
        this.logger.info(`Found ${memoryFlows.length} flows in cache`);
        /**
         * If there are flows in the cache, we need to check if they are still valid
         */
        tempFlows = memoryFlows.map((flow) => ({
          account: flow,
          publicKey: flow.pubkey,
        }));
      } else {
        /**
         * If there are no flows in the cache, then we need to get the flows from the Snowflake Service
         */
        const flows = await this.snowService.listAllFlows();

        if (flows && flows.length > 0) {
          const flowAccounts = flows.map<FlowModel>((flow) => ({
            ...flow.account,
            pubkey: flow.publicKey,
          }));
          /**
           * We need to write the flows to the cache
           */
          await this.jobCacheService.writeMultipleFlows(flowAccounts);
        }

        tempFlows = flows;
      }

      await this.snowService.handleProcessFlows(tempFlows);

      /**
       * Invalidate the cache when the flows are updated
       */
    } catch (err: any) {
      /**
       * If there is an error, we need to log it and exit
       * The node operator can be restarted if the error is recoverable under 5 attempts
       */
      this.logger.error(err.message);
    }
  }

  async run() {
    try {
      /**
       * Subscribe to the changes in the flows and update the cache
       */
      this.snowService.onFlowsChanged(async (flow) => {
        console.log(flow);
        await this.jobCacheService.writeSingleFlow(
          this.jobCacheService.convertProgramAccountToFlow(flow)
        );
      });
      // Invalidate cache every one hour
      cron.schedule("0 * * * *", () => this.jobCacheService.cleanFlows());
      // Run the bootstrap every 5 seconds
      cron.schedule("*/5 * * * * *", async () => await this.bootstrap());
    } catch (error: any) {
      this.logger.info("Node Operator is down");
      this.logger.error(error.message);
      throw new Error(error.message);
    }
  }
}

SnowflakeOperator.instance().run();
