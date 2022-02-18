import { BN } from "@project-serum/anchor";
import {
  AccountMeta,
  PublicKey,
  Signer,
  TransactionInstruction,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import _ from "lodash";
import { SNOW_PROGRAM_ID } from "./snowflake";

export type UnixTimeStamp = number;
export type UTCOffset = number;

export enum TriggerType {
  None = 1,
  Time = 2,
  ProgramCondition = 3,
}

export const RETRY_WINDOW = 300;
export const CUSTOM_ACTION_CODE = 100;

const NON_BN_FIELDS = ["remainingRuns", "triggerType"];

export class Job {
  pubKey: PublicKey;
  name: string = "job - " + new Date().toLocaleDateString();
  userUtcOffset: UTCOffset = new Date().getTimezoneOffset() * 60;
  instructions: TransactionInstruction[] = [];
  recurring: boolean = false;
  retryWindow: number = RETRY_WINDOW;
  remainingRuns: number = 0;
  owner: PublicKey;
  triggerType: TriggerType = TriggerType.None;
  cron: string = "";
  expireOnComplete: boolean = false;
  clientAppId: PublicKey = new PublicKey(SNOW_PROGRAM_ID);
  dedicatedOperator: PublicKey;
  nextExecutionTime: UnixTimeStamp = 0;
  lastScheduledExecution: UnixTimeStamp = 0;
  scheduleEndDate: UnixTimeStamp = 0;
  expiryDate: UnixTimeStamp = 0;
  createdDate: UnixTimeStamp = 0;
  lastRentCharged: UnixTimeStamp = 0;
  lastUpdatedDate: UnixTimeStamp = 0;
  externalId: String = "";
  extra: String = "";

  isBNType(property: string): boolean {
    return (
      typeof (this as any)[property] === "number" &&
      NON_BN_FIELDS.indexOf(property) < 0
    );
  }

  toSerializableJob(): SerializableJob {
    const serJob = _.cloneDeepWith(
      this,
      function customizer(v, k: any, o: any): any {
        if (!k) return;
        if (o.isBNType(k)) return new BN(o[k]);
        if (o[k] instanceof PublicKey) return o[k];
        if (k === "instructions") return [];
      }
    );
    serJob.actions = [];
    for (let instruction of this.instructions) {
      const serAction = SerializableAction.fromInstruction(instruction);
      serJob.actions.push(serAction);
    }
    delete serJob.instructions;
    delete serJob.jobId;
    return serJob;
  }
}

export type SerializableJob = any;

export function toJob(serJob: SerializableJob, jobPubKey: PublicKey): Job {
  const template = new Job();
  const job: Job = _.cloneDeepWith(
    serJob,
    function customizer(v, k: any, o: any): any {
      if (!k) return;
      if (template.isBNType(k)) {
        return (o[k] as BN).toNumber();
      }
      if (o[k] instanceof PublicKey) return o[k];
      if (k === "actions") return [];
    }
  );
  job.instructions = [];
  for (let action of serJob.actions) {
    const instruction = SerializableAction.toInstruction(action);
    job.instructions.push(instruction);
  }
  delete (job as any).actions;
  job.pubKey = jobPubKey;
  return job;
}

export class SerializableAction {
  program: PublicKey;
  instruction: Buffer;
  accounts: Array<AccountMeta> = [];
  actionCode: number;
  name: string;
  extra: string;

  static fromInstruction(
    instruction: TransactionInstruction
  ): SerializableAction {
    const serAction = new SerializableAction();
    serAction.program = instruction.programId;
    serAction.accounts = instruction.keys;
    serAction.instruction = instruction.data;
    const openInstruction = instruction as any;
    serAction.actionCode = openInstruction.code
      ? openInstruction.code
      : CUSTOM_ACTION_CODE;
    serAction.name = openInstruction.name ? openInstruction.name : "";
    serAction.extra = openInstruction.extra ? openInstruction.extra : "";
    return serAction;
  }

  static toInstruction(serAction: SerializableAction): TransactionInstruction {
    const instruction: TransactionInstruction = {
      data: serAction.instruction,
      keys: serAction.accounts,
      programId: serAction.program,
    };
    return instruction;
  }
}

export type InstructionsAndSigners = {
  instructions: TransactionInstruction[];
  signers: Signer[];
};
