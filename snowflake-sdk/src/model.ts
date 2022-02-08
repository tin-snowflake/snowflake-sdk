import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

export type UnixTimeStamp = number;

export enum TriggerType {
  None = 1,
  Time = 2,
  ProgramCondition = 3,
}

export const RETRY_WINDOW = 300;
export type Action = any;
export class Flow {
  name: string = "job - " + new Date().toLocaleDateString();
  nextExecutionTime: BN = new BN(0);
  lastScheduledExecution: BN = new BN(0);
  userUtcOffset: BN = new BN(new Date().getTimezoneOffset() * 60);
  actions: Action[] = [];
  recurring: boolean = false;
  retryWindow: BN = new BN(RETRY_WINDOW);
  remainingRuns: number = 0;
  flowOwner: PublicKey | undefined;
  triggerType: TriggerType = TriggerType.None;
  cron: string | undefined;
}
