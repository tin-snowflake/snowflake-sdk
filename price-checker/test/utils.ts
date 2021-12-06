import fs from 'fs';
import {Keypair} from "@solana/web3.js";

export async function readKeypair(keyPath: string): Promise<Keypair> {
    const keyString = await fs.readFileSync(keyPath, 'utf8');
    const key = Uint8Array.from(JSON.parse(keyString));
    return Keypair.fromSecretKey(key);
}