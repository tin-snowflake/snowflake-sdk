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
        {// GOOG
          pubkey: new PublicKey("CZDpZ7KeMansnszdEGZ55C4HjGsMSQBzxPu6jqRm6ZrU"),
          isSigner: false,
          isWritable: false,
        },
        // {// AAPL
        //     pubkey: new PublicKey("CqFJLrT4rSpA46RQkVYWn8tdBDuQ7p7RXcp6Um76oaph"),
        //     isSigner: false,
        //     isWritable: false,
        // },
        // {// TSLA
        //     pubkey: new PublicKey("9TaWcpX3kdfdWQQdNtAjW12fNEKdiicmVXuourqn3xJh"),
        //     isSigner: false,
        //     isWritable: false,
        // },
        // {// BTC
        //     pubkey: new PublicKey("HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J"),
        //     isSigner: false,
        //     isWritable: false,
        // },
        // {// ETH
        //     pubkey: new PublicKey("EdVCmQ9FSPcVe5YySXDPCRmc8aDQLKJ9xvYBMZPie1Vw"),
        //     isSigner: false,
        //     isWritable: false,
        // }
    ];

    const initIx = new TransactionInstruction({
        programId: new PublicKey('8BVA9L8pTTPxcrP7AS9M9957Qy8WUBSLmgh37vUvUdRe'),
        keys,
        data: Buffer.from(
            Int8Array.of(
                ...new BN(290680500).toArray("le", 8), -5, -1)
                // ...new BN(16820000).toArray("le", 8), -5, 1)
                // ...new BN(200000).toArray("le", 8), -5, 0,
                // ...new BN(200000).toArray("le", 8), -5, 0,
                // ...new BN(200000).toArray("le", 8), -5, 0)
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