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

    // const publicKey = new PublicKey(oraclePublicKey);
    // const accountInfo = await connection.getAccountInfo(publicKey);

    // if (accountInfo && accountInfo.data) {
    //     const {productAccountKeys, nextMappingAccount,} = parseMappingData(accountInfo.data);

    //     let i = 0;

    //     for (let productKey of productAccountKeys) {
    //         const productInfo = await connection.getAccountInfo(productKey);
    //         if (productInfo && productInfo.data) {
    //             let productData = parseProductData(productInfo.data);
    //             console.log("Product: ", productData.product.symbol);
    //             console.log("Price Key: ", productData.priceAccountKey.toBase58());
    //             productData.priceAccountKey
    //             // const priceInfo = await connection.getAccountInfo(productData.priceAccountKey);
    //             // if (priceInfo && priceInfo.data) {
    //             //     let priceData = parsePriceData(priceInfo.data);
    //             //     console.log("Price: ", priceData);
    //             // }

    //         }

    //         i++;
    //         if (i > 50) {
    //             break;
    //         }
    //     }
    // } 
    const priceAccounts = [
        {label:'BTC/USD', value:'HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J'},
        {label:'ETH/USD', value:'EdVCmQ9FSPcVe5YySXDPCRmc8aDQLKJ9xvYBMZPie1Vw'},
        {label:'SOL/USD', value:'J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix'},
        {label:'USDC/USD', value:'5SSkXsEKQepHHAewytPVwdej4epN1nxgLVM84L4KXgy7'},
        {label:'USDT/USD', value:'38xoQ4oeJCBrcVvca2cGk7iV1dAfrmTR1kmhSCJQ8Jto'},
        {label:'UST/USD', value:'AUKjh1oVPZyudi3nzYSsdZxSjq42afUCvsdbKFc5CbD'},
        {label:'BCH/USD', value:'4EQrNZYk5KR1RnjyzbaaRbHsv8VqZWzSUtvx58wLsZbj'},
        {label:'LTC/USD', value:'BLArYBCUYhdWiY8PCUTpvFE21iaJq85dvxLk9bYMobcU'},
        {label:'RAY/USD', value:'EhgAdTrgxi4ZoVZLQx1n93vULucPpiFi2BQtz9RJr1y6'},
        {label:'ORCA/USD', value:'A1WttWF7X3Rg6ZRpB2YQUFHCRh1kiXV8sKKLV3S9neJV'},
        {label:'SRM/USD', value:'992moaMQKs32GKZ9dxi8keyM2bUmbrwBZpK4p2K6X5Vs'},
        {label:'BNB/USD', value:'GwzBgrXb4PG59zjce24SF2b9JXbLEjJJTBkmytuEZj1b'},
        {label:'DOGE/USD', value:'4L6YhY8VvUgmqG5MvJkUJATtzB2rFqdrJwQCmFLv4Jzy'},
        {label:'LUNA/USD', value:'8PugCXTAHLM9kfLSQWe2njE5pzAgUdpPk3Nx5zSm7BD3'},
        {label:'MER/USD', value:'6Z3ejn8DCWQFBuAcw29d3A5jgahEpmycn7YDMX7yRNrn'},
        {label:'FTT/USD', value:'6vivTRs5ZPeeXbjo7dfburfaYDWoXjBtdtuYgQRuGfu'},
        {label:'SBR/USD', value:'4WSN3XDSTfBX9A1YXGg8HJ7n2GtWMDNbtz1ab6aGGXfG'},
        {label:'HXRO/USD', value:'6VrSw4Vxg5zs9shfdCxLqfUy2qSD3NCS9AsdBQUgbjnt'},
        {label:'COPE/USD', value:'BAXDJUXtz6P5ARhHH1aPwgv4WENzHwzyhmLYK4daFwiM'},
        {label:'MIR/USD', value:'4BDvhA5emySfqyyTHPHofTJqRw1cwDabK1yiEshetPv9'},
        {label:'SNY/USD', value:'DEmEX28EgrdQEBwNXdfMsDoJWZXCHRS5pbgmJiTkjCRH'},
        {label:'MNGO/USD', value:'DCNw5mwZgjfTcoNsSZWUiXqU61ushNvr3JRQJRi1Nf95'},
        {label:'ATOM/USD', value:'7YAze8qFUMkBnyLVdKT4TFUUFui99EwS5gfRArMcrvFk'},
        {label:'ADA/USD', value:'8oGTURNmSQkrBS1AQ5NjB2p8qY34UVmMA9ojrw8vnHus'},
        {label:'DOT/USD', value:'4dqq5VBpN4EwYb7wyywjjfknvMKu7m78j9mKZRXTj462'},
        {label:'MSOL/USD', value:'9a6RNx3tCu1TSs6TBSfV2XRXEPEZXQ6WB7jRojZRvyeZ'},
        {label:'PAI/USD', value:'8EjmYPrH9oHxLqk2oFG1qwY6ert7M9cv5WpXyWHxKiMb'},
    ];

    for (let i = 0; i< priceAccounts.length; i++) {
        console.log(priceAccounts[i].label, ' - ', priceAccounts[i].value);
        let pubKey = new PublicKey(priceAccounts[i].value);
        
        const priceInfo = await connection.getAccountInfo(pubKey);
        if (priceInfo && priceInfo.data) {
            let priceData = parsePriceData(priceInfo.data);
            console.log("Price status: ", priceData.aggregate.status);
        }
        
    }
 
       
}

main().then(() => console.log('Success'));