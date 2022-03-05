import SnowService from "./services/snow-service";
import log4js, { Logger } from "log4js";
import { LOG4JS_CONFIG } from "./constants/log4js-config";
import { JobCacheService } from "./services/job-cache-service";
import { DatabaseService } from "./services/database-service";
import "dotenv/config";
import { ProgramAccount } from "@project-serum/anchor";
import { FlowModel } from "./models/flow";
import cron from "node-cron";
import {
  RATE_LIMITED_DELAY_IN_MILLISECONDS,
  RATE_LIMITED_REQUEST_NUMBER,
} from "./constants/config";

log4js.configure(LOG4JS_CONFIG);

class SnowflakeOperator {
  private logger: Logger = log4js.getLogger("Operator");
  private snowService: SnowService = SnowService.instance();
  private dbService: DatabaseService = DatabaseService.instance();
  private jobCacheService: JobCacheService = new JobCacheService(
    this.dbService.database
  );

  private isBusy: boolean = false;

  static instance(): SnowflakeOperator {
    return new SnowflakeOperator();
  }

  private async delay() {
    return new Promise((ok) => setTimeout(ok, RATE_LIMITED_DELAY_IN_MILLISECONDS));
  }

  private async handleExecutableFlows(flows: ProgramAccount<FlowModel>[]) {
    const executableFlows = flows.filter((flow) =>
      this.snowService.shouldExecuteFlow(flow)
    );

    for (let i = 0; i < executableFlows.length; i++) {
      if (i !== 0) {
        if (i % RATE_LIMITED_REQUEST_NUMBER === 0) {
          await this.delay();
        }
      }
      await this.snowService.executeFlow(executableFlows[i]);
    }
  }

  private async handleTimeExpiredFlows(flows: ProgramAccount<FlowModel>[]) {
    const timeFlowExpiredFlows = flows.filter((flow) =>
      this.snowService.isTimedFlowExpired(flow)
    );

    for (let i = 0; i < timeFlowExpiredFlows.length; i++) {
      if (i !== 0) {
        if (i % RATE_LIMITED_REQUEST_NUMBER === 0) {
          await this.delay();
        }
      }
      await this.snowService.markTimedFlowAsError(timeFlowExpiredFlows[i]);
    }
  }

  private async bootstrap() {
    try {
      console.log("Running...");
      this.logger.info("Running Node Operator");
      if (this.isBusy) {
        this.logger.info("Node Operator is busy, will skip this run");
        return;
      }

      this.isBusy = true;

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

      await Promise.all([
        this.handleExecutableFlows(tempFlows),
        this.handleTimeExpiredFlows(tempFlows),
      ]);

      this.isBusy = false;

    } catch (err: any) {
      this.isBusy = false;
      this.logger.error(err.message);
    }
  }

  async run() {
    try {
      /**
       * Subscribe to the changes in the flows and update the cache
       */
      this.snowService.onFlowsChanged(async (flow) => {
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
