import React, { useEffect, useState } from 'react';
import { Button, Table } from 'antd';
import { smartClick } from '../../utils/reactUtil';
import { useConnectionConfig } from '../../contexts/connection';
import { programIds, SOL_MINT } from '../../utils/ids';
import { PublicKey } from '@solana/web3.js';
import { TokenAccount } from '../../models';
import { cachebleMintByKey, MintParser, TokenAccountParser } from '../../contexts/accounts';
import { fromLamports, fromLamportsDecimals } from '../../utils/utils';
import { TokenIcon } from '../TokenIcon';
import * as snowUtil from '../../utils/snowUtils';

export function TokenListWithBalances({ owner, balanceRefresh }) {
  const connection = useConnectionConfig().connection;
  let [tokenList, setTokenList] = useState([]);
  const { tokenMap } = useConnectionConfig();

  async function queryTokenList(): Promise<any[]> {
    if (!owner) return [];
    if (!tokenMap || tokenMap.size == 0) return [];
    const accounts = (
      await connection.getTokenAccountsByOwner(owner, {
        programId: programIds().token,
      })
    ).value.map(a => TokenAccountParser(a.pubkey, a.account));

    let list = await Promise.all(
      accounts
        .filter(a => a.info.amount.toNumber() > 0)
        .map(async a => {
          let tokenInfo = tokenMap.get(a.info.mint.toString());
          let tokenName = tokenInfo ? tokenInfo.name : 'unknown';

          let decimals = 0;
          if (tokenInfo) {
            decimals = tokenInfo.decimals;
          } else {
            const mintInfo = await cachebleMintByKey(connection, new PublicKey(a.info.mint));
            decimals = mintInfo.decimals;
          }

          let tokenAmount = fromLamportsDecimals(a, decimals);
          let tokenIcon = tokenInfo ? tokenInfo.logoURI : '';
          let tokenSymbol = tokenInfo ? tokenInfo.symbol : 'unknown';
          return {
            key: a.info.mint,
            mint: a.info.mint,
            symbol: tokenSymbol,
            name: tokenName,
            amount: tokenAmount,
            tokenIcon: tokenIcon,
          };
        })
    );

    // add native SOL balance to the list
    const solBalance = await connection.getBalance(owner);
    list.push({
      key: SOL_MINT,
      mint: SOL_MINT,
      symbol: 'SOL',
      name: 'SOL',
      amount: fromLamportsDecimals(solBalance, 9),
      tokenIcon: '',
    });

    return list;
  }

  async function init() {
    setTokenList(await queryTokenList());
  }

  useEffect(() => {
    init();
  }, [owner, tokenMap, balanceRefresh]);

  const columns = [
    {
      title: 'Token',
      dataIndex: 'name',
      key: 'name',
      render: (text, token) => {
        return (
          <span>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <TokenIcon mintAddress={token.mint} /> <div>{token.symbol}</div>
            </div>

            {token.symbol == 'unknown' && <div style={{ color: 'dimgrey', marginLeft: '26px' }}>mint: {token.mint.toString()}</div>}
          </span>
        );
      },
    },
    {
      title: 'Balance',
      dataIndex: 'amount',
      key: 'amount',
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.amount - b.amount,
    },
  ];

  return (
    <span>
      <Table rowKey="key" dataSource={tokenList} columns={columns as any} pagination={false} />
    </span>
  );
}
