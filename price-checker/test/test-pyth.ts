import {
    Connection,
    PublicKey
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

    const publicKey = new PublicKey(oraclePublicKey);
    const accountInfo = await connection.getAccountInfo(publicKey);

    if (accountInfo && accountInfo.data) {
        const {productAccountKeys, nextMappingAccount,} = parseMappingData(accountInfo.data);

        let i = 0;

        for (let productKey of productAccountKeys) {
            const productInfo = await connection.getAccountInfo(productKey);
            if (productInfo && productInfo.data) {
                let productData = parseProductData(productInfo.data);
                console.log("Product: ", productData.product.symbol);
                console.log("Price Key: ", productData.priceAccountKey.toBase58());
                // const priceInfo = await connection.getAccountInfo(productData.priceAccountKey);
                // if (priceInfo && priceInfo.data) {
                //     let priceData = parsePriceData(priceInfo.data);
                //     console.log("Price: ", priceData);
                // }

            }

            i++;
            if (i > 12) {
                break;
            }
        }
    } 
    
       
}

main().then(() => console.log('Success'));