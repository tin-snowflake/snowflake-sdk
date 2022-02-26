import { Program, ProgramAccount } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { Job, SerializableJob } from "./model";
import { JOB_ACCOUNT_LAYOUT } from "./job-layout";

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
    let ownerFilter = this.getOwnerFilter(owner);
    let serJobs: ProgramAccount<SerializableJob>[] =
      await this.program.account.flow.all([ownerFilter]);
    return serJobs.map((v) => Job.fromSerializableJob(v.account, v.publicKey));
  }

  async findAll(): Promise<Job[]> {
    let serJobs: ProgramAccount<SerializableJob>[] =
      await this.program.account.flow.all([]);
    return serJobs.map((v) => Job.fromSerializableJob(v.account, v.publicKey));
  }

  private getOwnerFilter(publicKey: PublicKey): any {
    return {
      memcmp: {
        offset: JOB_ACCOUNT_LAYOUT.offsetOf("owner"),
        bytes: publicKey.toBase58(),
      },
    };
  }
}
