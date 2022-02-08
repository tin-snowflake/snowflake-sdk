import { Connection, TransactionInstruction } from "@solana/web3.js";
import { Flow, TriggerType, UnixTimeStamp } from "./model";
import { BN } from "@project-serum/anchor";

export class OnchainScheduler {
  connection: Connection;
  private flow: Flow = new Flow();

  constructor(connection: Connection) {
    this.connection = connection;
  }

  jobName(name: string): OnchainScheduler {
    this.flow.name = name;
    return this;
  }

  jobInstructions(instructions: TransactionInstruction[]): OnchainScheduler {
    this.flow.actions = instructions;
    return this;
  }

  scheduleOnce(executionTime: UnixTimeStamp): OnchainScheduler {
    this.flow.triggerType = TriggerType.Time;
    this.flow.recurring = false;
    this.flow.nextExecutionTime = new BN(executionTime);
    return this;
  }

  scheduleCron(cron: string, numberOfExecutions: number): OnchainScheduler {
    this.flow.triggerType = TriggerType.Time;
    this.flow.recurring = true;
    this.flow.cron = cron;
    this.flow.remainingRuns = numberOfExecutions;
    return this;
  }

  async scheduleConditional(numberOfExecutions: number) {
    this.flow.triggerType = TriggerType.ProgramCondition;
    this.flow.remainingRuns = numberOfExecutions;
    return this;
  }

  build() {}

  send() {}
}
