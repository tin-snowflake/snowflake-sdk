import { Program } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { Job, SerializableJob, toJob } from "./model";

export default class Finder {
  program: Program;
  constructor(program: Program) {
    this.program = program;
  }

  async findByJobPubKey(jobPubKey: PublicKey): Promise<Job> {
    let serJob: SerializableJob = await this.program.account.flow.fetch(
      jobPubKey
    );
    return toJob(serJob, jobPubKey);
  }
}
