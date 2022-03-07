import { Database } from "sqlite3";
import SchemaComposer from "../utils/schema-composer";
import Bluebird, { Promise } from "bluebird";
import log4js from "log4js";
import { LOG4JS_CONFIG } from "../constants/log4js-config";
import { BN, ProgramAccount } from "@project-serum/anchor";
import { FlowModel } from "src/models/flow";
import { PublicKey } from "@solana/web3.js";

log4js.configure(LOG4JS_CONFIG);
const logger = log4js.getLogger("Memory Cache");

/**
 * This class is responsible for caching the flows in memory
 */
export class JobCacheService {
  private database: Database;
  private jobSchema: Record<string, string>;

  constructor(_database: Database) {
    this.database = _database;
    const schemaComposer = new SchemaComposer("jobs");
    this.jobSchema = schemaComposer.composeTableSchema();
  }

  /**
   * Get all the flows from the database
   * @returns Array of FlowModel
   */
  getAllFlows(): Bluebird<Array<FlowModel>> {
    return new Promise<Array<FlowModel>>((resolve, reject) => {
      this.database.serialize(() => {
        this.database.all(this.jobSchema.getAllJobs, (err, rows) => {
          if (err) {
            logger.error(err.message);
            reject(err);
          } else {
            resolve(rows.map((row) => this.serializeFlowModel(row)));
          }
        });
      });
    });
  }

  convertProgramAccountToFlow(
    programAccount: ProgramAccount<FlowModel>
  ): FlowModel {
    return {
      actions: programAccount.account.actions,
      nextExecutionTime: programAccount.account.nextExecutionTime,
      owner: programAccount.account.owner,
      pubkey: programAccount.publicKey,
      remainingRuns: programAccount.account.remainingRuns,
      retryWindow: programAccount.account.retryWindow,
      triggerType: programAccount.account.triggerType,
    };
  }

  serializeFlowModel(flow: any): FlowModel {
    const parsedActions = JSON.parse(flow.actions);
    const serializedActions = parsedActions.map((action: any) => ({
      ...action,
      program: new PublicKey(action.program),
      accounts: action.accounts.map((account: any) => ({
        ...account,
        pubkey: new PublicKey(account.pubkey),
      })),
    }));
    const serializedFlow = {
      pubkey: new PublicKey(flow.pubkey),
      nextExecutionTime: new BN(flow.next_execution_time),
      remainingRuns: parseInt(flow.remaining_runs),
      triggerType: parseInt(flow.trigger_type),
      retryWindow: parseInt(flow.retry_window),
      owner: new PublicKey(flow.owner),
      actions: serializedActions,
    };
    return serializedFlow;
  }

  /**
   * Create a job table in the database
   * @returns Array of FlowModel
   */
  createJobsTable(): Bluebird<void> {
    return new Promise((resolve, reject) => {
      this.database.run(this.jobSchema.createJobsTable, (err) => {
        if (err) {
          logger.error(err.message);
          reject(err);
        } else {
          logger.log("Created the Jobs table.");
          resolve();
        }
      });
    });
  }

  /**
   * Delete a flow from the database
   * @returns Promise that resolves when the table is dropped
   */
  cleanFlows(): Bluebird<void> {
    return new Promise((resolve, reject) => {
      this.database.run(this.jobSchema.invalidateCache, (err) => {
        if (err) {
          logger.error(err.message);
          reject(err);
        } else {
          logger.info("Invalidated all flows.");
          resolve();
        }
      });
    });
  }

  cleanFlow(flowAddress: PublicKey): Bluebird<void> {
    return new Promise((resolve, reject) => {
      this.database.run(
        this.jobSchema.deleteJob,
        [flowAddress.toString()],
        (err) => {
          if (err) {
            logger.error(err.message);
            reject(err);
          } else {
            logger.info(`Deleted flow ${flowAddress.toString()}`);
            resolve();
          }
        }
      );
    });
  }

  /**
   * Write a flow to the database
   * @param flowAccountsData Array of ProgramAccounts
   * @returns Array of FlowModel
   */
  writeMultipleFlows(flowAccountsData: Array<FlowModel>): Promise<void> {
    return new Promise((resolve, reject) => {
      flowAccountsData.map((flowData) => {
        const writtenFlow = [
          flowData.pubkey.toString(),
          flowData.triggerType,
          flowData.remainingRuns,
          parseInt(flowData.nextExecutionTime.toString()),
          flowData.retryWindow,
          flowData.owner.toString(),
          JSON.stringify(flowData.actions),
        ];
        this.database.run(this.jobSchema.writeAllJobs, writtenFlow, (err) => {
          if (err) {
            logger.error(err.message);
            reject(err);
          } else {
            resolve();
          }
        });
      });
      logger.info(
        `Inserted ${flowAccountsData.length} rows into the Jobs table.`
      );
    });
  }

  /**
   * Write a flow to the database
   * @param flow Flow to be written to the database
   * @returns Promise that resolves when the flow is written to the database
   */
  writeSingleFlow(flow: FlowModel): Bluebird<void> {
    return new Promise((resolve, reject) => {
      const flowRecord = [
        flow.pubkey,
        flow.triggerType,
        flow.remainingRuns,
        parseInt(flow.nextExecutionTime.toString()),
        flow.retryWindow,
        flow.owner.toString(),
        JSON.stringify(flow.actions),
      ];
      this.database.run(this.jobSchema.writeAllJobs, flowRecord, (err) => {
        if (err) {
          logger.error(err.message);
          reject(err);
        } else {
          logger.info(`Inserted ${flow.pubkey.toString()} to table Jobs`);
          resolve();
        }
      });
    });
  }
}
