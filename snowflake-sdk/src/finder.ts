import { Program } from "@project-serum/anchor";
import { AccountInfo, PublicKey } from "@solana/web3.js";
import { Job, SerializableJob } from "./model";

export default class Finder {
  program: Program;
  constructor(program: Program) {
    this.program = program;
  }

  async findByJobPubKey(jobPubKey: PublicKey): Promise<Job> {
    let serJob: SerializableJob = await this.program.account.flow.fetch(
      jobPubKey
    );
    return Job.fromSerializableJob(serJob, jobPubKey);
  }

  async findByJobOwner(owner: PublicKey): Promise<Job[]> {
    let serJobs: SerializableJob = await this.program.account.flow.all([
      {
        memcmp: {
          offset: 8, // Discriminator
          bytes: owner.toBase58(),
        },
      },
    ]);
    return serJobs;
  }
}
