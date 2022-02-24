import BN from 'bn.js';
import { Action } from './flowAction';
import { PublicKey } from '@solana/web3.js';

export interface Flow {
  name: string;
  nextExecutionTime: BN;
  lastScheduledExecution: BN;
  userUtcOffset: number;
  actions: [Action];
  recurring: boolean;
  retryWindow: number;
  remainingRuns: number;
  owner: PublicKey;
  triggerType: number;
  payFeeFrom: number;
  scheduleEndDate: BN;
  expiryDate: BN;
  expireOnComplete: boolean;
  externalId: string;
  extra: string;
}

export interface UIFlow {
  state: State;
  triggerType: TriggerType;
}

export enum RecurringUIOption {
  No = 'No',
  Yes = 'Yes',
}

export const RUN_FOREVER = -999;
export const RETRY_WINDOW = 300;

export enum TriggerType {
  None = 1,
  Time = 2,
  ProgramCondition = 3,
}

export const TriggerTypeLabels = {
  [TriggerType.None]: 'None',
  [TriggerType.Time]: 'Time',
  [TriggerType.ProgramCondition]: 'Program Condition',
};
export enum State {
  Pending = 1,
  Complete = 2,
  Error = 3,
}
