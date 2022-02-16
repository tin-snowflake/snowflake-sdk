import { BN } from "@project-serum/anchor";
import {
  AccountMeta,
  PublicKey,
  Signer,
  TransactionInstruction,
} from "@solana/web3.js";
import { Buffer } from "buffer";

export type UnixTimeStamp = number;
export type UTCOffset = number;

export enum TriggerType {
  None = 1,
  Time = 2,
  ProgramCondition = 3,
}

export const RETRY_WINDOW = 300;
export const CUSTOM_ACTION_CODE = 100;

export class Job {
  name: string = "job - " + new Date().toLocaleDateString();
  nextExecutionTime: UnixTimeStamp = 0;
  lastScheduledExecution: UnixTimeStamp = 0;
  userTimezoneOffset: UTCOffset = new Date().getTimezoneOffset() * 60;

  instructions: TransactionInstruction[] = [];
  recurring: boolean = false;
  retryWindow: number = RETRY_WINDOW;
  remainingRuns: number = 0;
  flowOwner: PublicKey;
  triggerType: TriggerType = TriggerType.None;
  cron: string = "";

  toSerializableJob(): SerializableJob {
    const serJob = new SerializableJob();
    serJob.name = this.name;
    serJob.nextExecutionTime = new BN(this.nextExecutionTime);
    // serJob.lastScheduledExecution = new BN(this.lastScheduledExecution);
    serJob.userUtcOffset = new BN(this.userTimezoneOffset);
    serJob.recurring = this.recurring;
    serJob.retryWindow = new BN(this.retryWindow);
    serJob.remainingRuns = this.remainingRuns;
    // serJob.flowOwner = this.flowOwner;
    serJob.triggerType = this.triggerType;
    serJob.cron = this.cron;

    for (let instruction of this.instructions) {
      const serAction = new SerializableAction();
      serAction.program = instruction.programId;
      serAction.accounts = instruction.keys;
      serAction.instruction = instruction.data;
      const actionCode = (instruction as any)["code"] as number;
      serAction.actionCode = actionCode ? actionCode : CUSTOM_ACTION_CODE;
      const actionName = (instruction as any)["name"];
      serAction.name = actionName ? actionName : "";
      serJob.actions.push(serAction);
    }

    return serJob;
  }
}

export class SerializableJob {
  name: string;
  nextExecutionTime: BN;
  lastScheduledExecution: BN;
  userUtcOffset: BN;
  actions: SerializableAction[] = [];
  recurring: boolean;
  retryWindow: BN;
  remainingRuns: number;
  // flowOwner: PublicKey;
  triggerType: TriggerType;
  cron: string;
}

export class SerializableAction {
  program: PublicKey;
  instruction: Buffer;
  accounts: Array<AccountMeta> = [];
  actionCode: number;
  name: string;
}

export type InstructionsAndSigners = {
  instructions: TransactionInstruction[];
  signers: Signer[];
};
