import BufferLayout from 'buffer-layout';
import * as Layout from '../../utils/layout';
import { ENV } from '../../utils/web3';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { OrcaPoolConfig } from '@orca-so/sdk';
import { OrcaPoolConfig as OrcaPoolConfigDevnet } from '@orca-so/sdk/dist/public/devnet/pools/config';

export type Pool = {
  pairKey: string;
  tokenASymbol: string;
  tokenBSymbol: string;
  poolId: string; // poolId is same as poolMint
};

class OrcaClient {
  env: ENV;
  orcaPools;
  constructor(env: ENV) {
    this.env = env;
  }

  getOrcaPools(): Pool[] {
    if (!this.orcaPools) {
      let orcaPoolConfig = this.env == ENV.devnet ? OrcaPoolConfigDevnet : OrcaPoolConfig;
      let poolKeys = Object.keys(orcaPoolConfig).filter(x => !(parseInt(x) >= 0));

      if (this.env == ENV.devnet) {
        // orca has issues with some pools in devnet, only the ones specified below work
        poolKeys = poolKeys.filter(x => ['SOL_USDC', 'ORCA_SOL', 'ORCA_USDC'].indexOf(x) >= 0);
      }

      this.orcaPools = poolKeys.map(x => {
        var tokens = x.split('_');
        return {
          pairKey: x,
          poolId: orcaPoolConfig[x],
          tokenASymbol: tokens[0],
          tokenBSymbol: tokens[1],
        };
      });
    }
    return this.orcaPools;
  }

  orcaPoolByPoolMint(poolMint: string): Pool {
    return this.orcaPools.filter(x => x.poolId == poolMint)[0];
  }

  decodeSwapAction(action): { amountIn: number; poolMint: PublicKey } {
    const data = action.instruction;

    const dataLayout = layouts.swapInstruction;
    const info = dataLayout.decode(data);

    const accounts = action.accounts;
    const poolMint = accounts[7].pubkey;
    return { amountIn: info.amountIn, poolMint: poolMint };
  }
}

const clients = {
  [ENV.localnet]: new OrcaClient(ENV.localnet),
  [ENV.devnet]: new OrcaClient(ENV.devnet),
  [ENV.mainnet]: new OrcaClient(ENV.mainnet),
};

export function getOrcaClient(env: ENV) {
  return clients[env];
}

const layouts = {
  swapInstruction: BufferLayout.struct([BufferLayout.u8('instruction'), Layout.uint64('amountIn'), Layout.uint64('minimumAmountOut')]),
  /*
    SwapInstruction accounts, taken from tokenSwap.swapInstructions
    const keys = [
    {pubkey: tokenSwap, isSigner: false, isWritable: false},
    {pubkey: authority, isSigner: false, isWritable: false},
    {pubkey: userTransferAuthority, isSigner: true, isWritable: false},
    {pubkey: userSource, isSigner: false, isWritable: true},
    {pubkey: poolSource, isSigner: false, isWritable: true},
    {pubkey: poolDestination, isSigner: false, isWritable: true},
    {pubkey: userDestination, isSigner: false, isWritable: true},
    {pubkey: poolMint, isSigner: false, isWritable: true},
    {pubkey: feeAccount, isSigner: false, isWritable: true},
    {pubkey: tokenProgramId, isSigner: false, isWritable: false},
  ];*/
};
