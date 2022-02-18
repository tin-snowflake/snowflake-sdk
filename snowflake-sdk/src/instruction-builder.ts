import { InstructionsAndSigners, Job } from "./model";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { Program } from "@project-serum/anchor";

export class InstructionBuilder {
  program: Program;
  constructor(program: Program) {
    this.program = program;
  }

  buildCreateJobInstruction(job: Job): InstructionsAndSigners {
    const serializableJob = job.toSerializableJob();
    let newFlowKeyPair = Keypair.generate();

    let createContext: any = {
      accounts: {
        flow: newFlowKeyPair.publicKey,
        flowOwner: this.program.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
    };

    const createIx = this.program.instruction.createFlow(
      serializableJob,
      createContext
    );
    return { instructions: [createIx], signers: [newFlowKeyPair] };
  }

  buildUpdateJobInstruction(job: Job) {
    const serializableJob = job.toSerializableJob();
    let updateContext: any = {
      accounts: {
        flow: job.pubKey,
        caller: this.program.provider.wallet.publicKey,
      },
      signers: [],
    };

    const updateIx = this.program.instruction.updateFlow(
      serializableJob,
      updateContext
    );
    return { instructions: [updateIx], signers: [] };
  }
}
