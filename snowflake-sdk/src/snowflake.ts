import { Connection, TransactionSignature } from "@solana/web3.js";
import { Idl, Program, Provider, Wallet } from "@project-serum/anchor";
import programIdl from "./idl/snowflake.json";
import { Job } from "./model";
import { InstructionBuilder } from "./instruction-builder";
import { TransactionSender } from "./transaction-sender";

export const SNOW_PROGRAM_ID = "3K4NPJKUJLbgGfxTJumtxv3U3HeJbS3nVjwy8CqFj6F2";

export default class Snowflake {
  program: Program;
  instructionBuilder: InstructionBuilder;
  transactionSender: TransactionSender;
  provider: Provider;

  constructor(provider: Provider) {
    this.provider = provider;
    this.program = new Program(
      programIdl as Idl,
      SNOW_PROGRAM_ID,
      this.provider
    );
    this.instructionBuilder = new InstructionBuilder(this.program);
    this.transactionSender = new TransactionSender(this.provider);
  }

  async createJob(job: Job): Promise<TransactionSignature> {
    const { instructions, signers } =
      this.instructionBuilder.buildCreateJobInstruction(job);
    return await this.transactionSender.sendWithWallet({
      instructions,
      signers,
    });
  }
}
