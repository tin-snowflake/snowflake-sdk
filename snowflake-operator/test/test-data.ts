import { PublicKey } from "@solana/web3.js";
import { BN } from "@project-serum/anchor";
import { FlowModel } from "src/models/flow";

const flowAccountsData: FlowModel[] = [
  {
    owner: new PublicKey("BxUeMg5etjmiDX25gbGi2pn1MyzkcQx3ZCCiUifTUhyj"),
    triggerType: 3,
    nextExecutionTime: new BN(0),
    retryWindow: 300,
    remainingRuns: 0,
    actions: [],
    pubkey: new PublicKey("BxUeMg5etjmiDX25gbGi2pn1MyzkcQx3ZCCiUifTUhyj"),
  },
];

export { flowAccountsData };
