import { AccountClient, ProgramAccount } from '@project-serum/anchor';
import { GetProgramAccountsFilter } from '@solana/web3.js';

import * as bs58 from 'bs58';
import { sha256 } from 'js-sha256';

export class CustomAnchorClient {
  client: AccountClient;
  constructor(client: AccountClient) {
    this.client = client;
  }
  async queryAllIgnoreBadData(filters?: Buffer | GetProgramAccountsFilter[]): Promise<ProgramAccount[]> {
    const discriminator = this.accountDiscriminator((this.client as any)._idlAccount.name);

    let resp = await this.client.provider.connection.getProgramAccounts(this.client.programId, {
      commitment: this.client.provider.connection.commitment,
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: bs58.encode(filters instanceof Buffer ? Buffer.concat([discriminator, filters]) : discriminator),
          },
        },
        ...(Array.isArray(filters) ? filters : []),
      ],
    });
    return resp
      .map(({ pubkey, account }) => {
        try {
          const decodedAccount = this.client.coder.accounts.decode((this.client as any)._idlAccount.name, account.data);
          return {
            publicKey: pubkey,
            account: this.client.coder.accounts.decode((this.client as any)._idlAccount.name, account.data),
          };
        } catch (e) {
          return undefined;
        }
      })
      .filter(v => v != undefined);
  }

  accountDiscriminator(name: string): Buffer {
    return Buffer.from(sha256.digest(`account:${name}`)).slice(0, 8);
  }
}
