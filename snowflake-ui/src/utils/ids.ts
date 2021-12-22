import { PublicKey } from '@solana/web3.js';

export const PROGRAM_IDS = [
  {
    name: 'mainnet-beta',
  },
  {
    name: 'testnet',
  },
  {
    name: 'devnet',
  },
  {
    name: 'localnet',
  },
];

export const setProgramIds = (envName: string) => {
  let instance = PROGRAM_IDS.find(env => env.name === envName);
  if (!instance) {
    return;
  }
};

export const programIds = () => {
  return {
    token: TOKEN_PROGRAM_ID,
    snowflake: SNOWFLAKE_PROGRAM_ID,
    associatedToken: ASSOCIATED_TOKEN_PROGRAM_ID,
    memo: MEMO_PROGRAM_ID,
    system: SYSTEM_PROGRAM_ID,
    rent: RENT_PROGRAM_ID,
    clock: CLOCK_PROGRAM_ID,
    priceChecker: PRICE_CHECKER_PROGRAM_ID,
  };
};

export const WRAPPED_SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
export const SOL_MINT = new PublicKey('Ejmc1UB4EsES5oAaRN63SpoxMJidt3ZGBrqrZk49vjTZ');
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const SNOWFLAKE_PROGRAM_ID = new PublicKey('86G3gad5tVjJxdQmmdQ6E3rLQNnDNh4KYcqiiSd7Az63');
export const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');
export const MEMO_PROGRAM_ID = new PublicKey('Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo');
export const RENT_PROGRAM_ID = new PublicKey('SysvarRent111111111111111111111111111111111');
export const CLOCK_PROGRAM_ID = new PublicKey('SysvarC1ock11111111111111111111111111111111');
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
export const PRICE_CHECKER_PROGRAM_ID = new PublicKey('8BVA9L8pTTPxcrP7AS9M9957Qy8WUBSLmgh37vUvUdRe');
