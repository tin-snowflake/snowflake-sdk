import devNetRegistry from '../../integrations/saber/data/saber-registry-devnet.json';
import { Connection, PublicKey } from '@solana/web3.js';
import { ENV } from '../../utils/web3';
import BufferLayout from 'buffer-layout';
import * as Layout from '../../utils/layout';

class SaberClient {
  private registry;

  constructor(registry) {
    this.registry = registry;
  }

  getPools() {
    return this.registry.pools;
  }

  findPoolByLPToken(lpToken: PublicKey) {
    return this.getPools().find(pool => pool.lpToken.address == lpToken.toString());
  }

  findPoolById(poolId: string) {
    return this.getPools().find(pool => pool.id == poolId);
  }

  decodePoolWithdrawData(data: Buffer): { poolTokenAmount: number } {
    const dataLayout = layouts.poolWithdraw;
    const info = dataLayout.decode(data);
    return { poolTokenAmount: info.poolTokenAmount };
  }
}

const clients = {
  [ENV.localnet]: new SaberClient(devNetRegistry),
  [ENV.devnet]: new SaberClient(devNetRegistry),
};

export function getSaberClient(env: ENV) {
  return clients[env];
}

const layouts = {
  poolWithdraw: BufferLayout.struct([BufferLayout.u8('instruction'), Layout.uint64('poolTokenAmount'), Layout.uint64('minimumTokenA'), Layout.uint64('minimumTokenB')]),
};
