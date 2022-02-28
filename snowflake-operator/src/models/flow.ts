import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

export type FlowModel = {
  pubkey: PublicKey;
  triggerType: number;
  remainingRuns: number;
  nextExecutionTime: BN;
  retryWindow: number;
  owner: PublicKey;
  actions: any[];
};
