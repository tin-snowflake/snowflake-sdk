import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { Idl, Program, Provider } from "@project-serum/anchor";
import programIdl from "./idl/snowflake.json";
import { Job } from "./model";
import { InstructionBuilder } from "./instruction-builder";
import { TransactionSender } from "./transaction-sender";
import Finder from "./finder";

export const SNOW_PROGRAM_ID = "3K4NPJKUJLbgGfxTJumtxv3U3HeJbS3nVjwy8CqFj6F2";

export default class Snowflake {
  program: Program;
  instructionBuilder: InstructionBuilder;
  transactionSender: TransactionSender;
  provider: Provider;
  finder: Finder;
  constructor(provider: Provider) {
    this.provider = provider;
    this.program = new Program(
      programIdl as Idl,
      SNOW_PROGRAM_ID,
      this.provider
    );
    this.instructionBuilder = new InstructionBuilder(this.program);
    this.transactionSender = new TransactionSender(this.provider);
    this.finder = new Finder(this.program);
  }

  async createJob(job: Job): Promise<TransactionSignature> {
    job.validateForCreate();
    const { instructions, signers } =
      this.instructionBuilder.buildCreateJobInstruction(job);
    const tx = await this.transactionSender.sendWithWallet({
      instructions,
      signers,
    });

    job.pubKey = signers[0].publicKey;
    return tx;
  }

  async updateJob(job: Job): Promise<TransactionSignature> {
    job.validateForUpdate();
    const { instructions, signers } =
      this.instructionBuilder.buildUpdateJobInstruction(job);
    const tx = await this.transactionSender.sendWithWallet({
      instructions,
      signers,
    });

    return tx;
  }

  async fetch(jobPubKey: PublicKey): Promise<Job> {
    return await this.finder.findByJobPubKey(jobPubKey);
  }
}
