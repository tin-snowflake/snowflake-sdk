import SnowService from "./services/snow-service";
import log4js, { Logger } from "log4js";
import { LOG4JS_CONFIG } from "./constants/log4js-config";
import { JobCacheService } from "./services/job-cache-service";
import { DatabaseService } from "./services/database-service";
import "dotenv/config";
import { ProgramAccount } from "@project-serum/anchor";
import { FlowModel } from "./models/flow";
import { ExecutionErrorType } from "./models/execution-result"
import cron from "node-cron";
import {
  RATE_LIMITED_DELAY_IN_MILLISECONDS,
  RATE_LIMITED_REQUEST_NUMBER,
} from "./constants/config";
import { PublicKey } from "@solana/web3.js";

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
    return new Promise((ok) =>
      setTimeout(ok, RATE_LIMITED_DELAY_IN_MILLISECONDS)
    );
  }

  private async handleExecutableFlows(flows: ProgramAccount<FlowModel>[]) {
    const executableFlows = flows.filter((flow) =>
      this.snowService.shouldExecuteFlow(flow)
    );

    let flowsToBeRemoved: PublicKey[] = [];

    for (let i = 0; i < executableFlows.length; i++) {
      if (i !== 0) {
        if (i % RATE_LIMITED_REQUEST_NUMBER === 0) {
          await this.delay();
        }
      }
      let result = await this.snowService.executeFlow(executableFlows[i]);
      if (result.getErrorType() === ExecutionErrorType.ACCOUNT_NOT_AVAILABLE) {
        flowsToBeRemoved.push(result.flowPublicKey);
      }
    }

    this.removeFlowsFromCache(flowsToBeRemoved);
  }

  private async handleTimeExpiredFlows(flows: ProgramAccount<FlowModel>[]) {
    const timeFlowExpiredFlows = flows.filter((flow) =>
      this.snowService.isTimedFlowExpired(flow)
    );

    let flowsToBeRemoved: PublicKey[] = [];
    for (let i = 0; i < timeFlowExpiredFlows.length; i++) {
      if (i !== 0) {
        if (i % RATE_LIMITED_REQUEST_NUMBER === 0) {
          await this.delay();
        }
      }
      let result = await this.snowService.markTimedFlowAsError(timeFlowExpiredFlows[i]);
      if (result.getErrorType() === ExecutionErrorType.ACCOUNT_NOT_AVAILABLE) {
        flowsToBeRemoved.push(result.flowPublicKey);
      }
    }

    this.removeFlowsFromCache(flowsToBeRemoved);
  }
  
  private async removeFlowsFromCache(flowPubKeys: PublicKey[]) {
    if (flowPubKeys === undefined || flowPubKeys.length == 0) {
      return;
    }

    for (let i = 0; i < flowPubKeys.length; i++) {
      let flowPubKey = flowPubKeys[i];
      await this.jobCacheService.cleanFlow(flowPubKey);
    }
  }

  private async getAllFlows(): Promise<ProgramAccount<FlowModel>[]> {
     /**
       * Create the jobs table for caching if it doesn't exist
       */
      await this.jobCacheService.createJobsTable();

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
         return memoryFlows.map((flow) => ({
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

        return flows;
      }
  }

  private async bootstrap() {
    try {
      if (this.isBusy) {
        this.logger.info("Node Operator is busy, will skip this run");
        return;
      }

      this.logger.info("Running Node Operator ...");
      this.isBusy = true;

      let allFlows = await this.getAllFlows();

      await Promise.all([
        this.handleExecutableFlows(allFlows),
        this.handleTimeExpiredFlows(allFlows),
      ]);

      this.isBusy = false;
    } catch (err: any) {
      this.isBusy = false;
      this.logger.error("Error running node operator: ", err);
    }
  }

  private async invalidateCache() {
    this.logger.info("Invalidate cache ...")
    try {
      await this.jobCacheService.cleanFlows();
    } catch (error: any) {
      this.logger.error("Error invalidating the cache: ", error);
    }
  }

  async run() {
    /**
     * Subscribe to the changes in the flows and update the cache
     */
    this.snowService.onFlowsChanged(async (flow) => {
      await this.jobCacheService.writeSingleFlow(
        this.jobCacheService.convertProgramAccountToFlow(flow)
      );
    });

    // Invalidate cache every one hour
    cron.schedule("0 * * * *", () => this.invalidateCache());
    
    // Run the bootstrap every 5 seconds
    cron.schedule("*/5 * * * * *", async () => await this.bootstrap());
  }
}

SnowflakeOperator.instance().run();
