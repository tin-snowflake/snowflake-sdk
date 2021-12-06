import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    Transaction,
    TransactionInstruction,
} from "@solana/web3.js";

import {
    parseMappingData,
    parsePriceData,
    parseProductData,
} from "@pythnetwork/client";

import {readKeypair} from './utils';

const oraclePublicKey = "BmA9Z6FjioHJPpjT39QazZyhDRUdZy2ezwx4GiDdE2u2";
const BAD_SYMBOLS = ["BCH/USD", "LTC/USD"];


async function main() {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const signer = await readKeypair('/home/minh/.config/solana/id.json');

    const publicKey = new PublicKey(oraclePublicKey);
    const accountInfo = await connection.getAccountInfo(publicKey);
    console.log("Account Infor: ", accountInfo);
    
    // const {productAccountKeys, nextMappingAccount,} = parseMappingData(accountInfo.data);
    // let allProductAccountKeys = [...productAccountKeys];
    // console.log('Production Account Keys: ', allProductAccountKeys);
       
}

main().then(() => console.log('Success'));