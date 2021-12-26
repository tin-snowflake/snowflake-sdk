import fs from 'fs';
import {Keypair} from "@solana/web3.js";
import BN = require("bn.js");

export async function readKeypair(keyPath: string): Promise<Keypair> {
    const keyString = await fs.readFileSync(keyPath, 'utf8');
    const key = Uint8Array.from(JSON.parse(keyString));
    return Keypair.fromSecretKey(key);
}

export function instructionToPriceCondition(instruction: Buffer): {price: number, condition: number} | null {
    if (instruction.length != 10) {
      return null;
    }
    
    let priceSlice = new Uint8Array(instruction.slice(0,8));
    let priceBn = new BN(priceSlice, "le");

    let remainingBytes = new Int8Array(instruction.slice(8));
    let exponent = remainingBytes[0];
    let condition = remainingBytes[1];
    
    let price = priceBn.toNumber() * Math.pow(10, exponent);
    return {price, condition};
}

export function priceConditionToInstruction(price: number, condition: number): Buffer {
    let parts = price.toString().split('.');
    let exponent = 0;
    if (parts.length == 2) {
      exponent = -parts[1].length;
    }

    let priceBn = price * Math.pow(10, -exponent);

    return Buffer.from(Int8Array.of(...new BN(priceBn).toArray("le", 8), exponent, condition));
}