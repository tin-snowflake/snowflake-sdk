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

export class Job {
  name: string = "job - " + new Date().toLocaleDateString();
  userUtcOffset: UTCOffset = new Date().getTimezoneOffset() * 60;
  instructions: TransactionInstruction[] = [];
  recurring: boolean = false;
  retryWindow: number = RETRY_WINDOW;
  remainingRuns: number = 0;
  flowOwner: PublicKey;
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

  isBN(property: string): boolean {
    return (
      typeof (this as any)[property] === "number" &&
      ["remainingRuns"].indexOf(property) < 0
    );
  }

  toSerializableJob(): SerializableJob {
    const serJob: SerializableJob = _.cloneDeepWith(
      this,
      function customizer(v, k: any, o: any): any {
        if (!k) return;
        if (o.isBN(k)) return new BN(o[k]);
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
    return serJob;
  }
}

type SerializableJob = any;

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
}

export type InstructionsAndSigners = {
  instructions: TransactionInstruction[];
  signers: Signer[];
};
