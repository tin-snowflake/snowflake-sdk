import BufferLayout from 'buffer-layout';
import * as Layout from '../../utils/layout';
import { ENV } from '../../utils/web3';
import { PublicKey } from '@solana/web3.js';
import { Network, ORCA_TOKEN_SWAP_ID, ORCA_TOKEN_SWAP_ID_DEVNET, OrcaPool, OrcaPoolConfig } from '@orca-so/sdk';
import { OrcaPoolConfig as OrcaPoolConfigDevnet } from '@orca-so/sdk/dist/public/devnet/pools/config';
import { ConnectionConfig } from '../../contexts/connection';
import { OrcaPoolImpl } from '@orca-so/sdk/dist/model/orca/pool/orca-pool';

import { orcaPoolConfigs } from '@orca-so/sdk/dist/constants';
import { orcaDevnetPoolConfigs } from '@orca-so/sdk/dist/constants/devnet';
import { getDevnetPool } from '@orca-so/sdk/dist/public/devnet';
import { OrcaPoolParams } from '@orca-so/sdk/dist/model/orca/pool/pool-types';
export type Pool = {
  pairKey: string;
  tokenASymbol: string;
  tokenBSymbol: string;
  poolId: string; // poolId is same as poolMint
};

class OrcaClient {
  connectionConfig: ConnectionConfig;
  pools;
  constructor(connectionConfig: ConnectionConfig) {
    this.connectionConfig = connectionConfig;
  }

  getPools(): Pool[] {
    if (!this.pools) {
      let orcaPoolConfig = this.connectionConfig.env == ENV.devnet ? OrcaPoolConfigDevnet : OrcaPoolConfig;
      let poolKeys = Object.keys(orcaPoolConfig).filter(x => !(parseInt(x) >= 0));

      if (this.connectionConfig.env == ENV.devnet) {
        // orca has issues with some pools in devnet, only the ones specified below work
        poolKeys = poolKeys.filter(x => ['ORCA_SOL', 'ORCA_USDC'].indexOf(x) >= 0);
      }

      this.pools = poolKeys.map(x => {
        var tokens = x.split('_');
        return {
          pairKey: x,
          poolId: orcaPoolConfig[x],
          tokenASymbol: tokens[0] == 'SOL' ? 'WSOL' : tokens[0],
          tokenBSymbol: tokens[1] == 'SOL' ? 'WSOL' : tokens[1],
        };
      });
    }
    return this.pools;
  }

  orcaPoolByPoolMint(poolMint: string): Pool {
    return this.pools.filter(x => x.poolId == poolMint)[0];
  }

  orcaPoolByPairKey(pairkey: string): Pool {
    return this.pools.filter(x => x.pairKey == pairkey)[0];
  }

  decodeSwapAction(action): { amountIn: number; poolMint: PublicKey } {
    const data = action.instruction;

    const dataLayout = layouts.swapInstruction;
    const info = dataLayout.decode(data);

    const accounts = action.accounts;
    const poolMint = accounts[7].pubkey;
    return { amountIn: info.amountIn, poolMint: poolMint };
  }

  getOrcaPool(poolMint: string): OrcaPool {
    if (this.connectionConfig.env === ENV.devnet) {
      return new OrcaPoolImpl(this.connectionConfig.connection, Network.DEVNET, orcaDevnetPoolConfigs[poolMint]);
    }

    return new OrcaPoolImpl(this.connectionConfig.connection, Network.MAINNET, orcaPoolConfigs[poolMint]);
  }

  getOrcaConfig(poolMint: string): OrcaConfig {
    const poolConfig = this.connectionConfig.env === ENV.devnet ? orcaDevnetPoolConfigs[poolMint] : orcaPoolConfigs[poolMint];
    const orcaTokenSwapId = this.connectionConfig.env === ENV.devnet ? ORCA_TOKEN_SWAP_ID_DEVNET : ORCA_TOKEN_SWAP_ID;
    return {
      orcaTokenSwapId: orcaTokenSwapId,
      poolParams: poolConfig,
    };
  }
}

type OrcaConfig = {
  poolParams: OrcaPoolParams;
  orcaTokenSwapId: any;
};

let orcaClient: OrcaClient;
export function getOrcaClient(connectionConfig: ConnectionConfig) {
  if (!orcaClient) orcaClient = new OrcaClient(connectionConfig);
  return orcaClient;
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
