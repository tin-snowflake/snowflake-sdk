import { PublicKey } from '@solana/web3.js';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from './ids';
import { Token } from '@solana/spl-token';
export enum ENV {
  mainnet = 'mainnet-beta',
  testnet = 'testnet',
  devnet = 'devnet',
  localnet = 'localnet',
}

// below method should move to tokens util
export async function findAssociatedTokenAddress(walletAddress: PublicKey, tokenMintAddress: PublicKey) {
  const publicKey = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, tokenMintAddress, walletAddress);
  return publicKey;
}
