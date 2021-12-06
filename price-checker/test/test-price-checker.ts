import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    Transaction,
    TransactionInstruction,
} from "@solana/web3.js";
import BN = require("bn.js");
import {readKeypair} from './utils';


async function main() {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    let signer = await readKeypair('/home/minh/.config/solana/id.json');

    let keys = [
        {
          // GOOG - price - CZDpZ7KeMansnszdEGZ55C4HjGsMSQBzxPu6jqRm6ZrU
          pubkey: new PublicKey(
            "CZDpZ7KeMansnszdEGZ55C4HjGsMSQBzxPu6jqRm6ZrU"
          ),
          isSigner: false,
          isWritable: false,
        }
    ];

    const initIx = new TransactionInstruction({
        programId: new PublicKey('8BVA9L8pTTPxcrP7AS9M9957Qy8WUBSLmgh37vUvUdRe'),
        keys,
        data: Buffer.from(
            Int8Array.of(...new BN(200000).toArray("le", 8), -5, 0)
        ),
    });

    const tx = new Transaction().add(initIx);

    console.log("Sending Test transaction...");
    await connection.sendTransaction(
        tx,
        [signer],
        { skipPreflight: false, preflightCommitment: "confirmed" }
    );

}


main().then(() => console.log('Success'));