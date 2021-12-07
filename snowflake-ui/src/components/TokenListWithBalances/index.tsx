import React, { useEffect, useState } from 'react';
import { Button, Table } from 'antd';
import { smartClick } from '../../utils/reactUtil';
import { useConnectionConfig } from '../../contexts/connection';
import { programIds } from '../../utils/ids';
import { PublicKey } from '@solana/web3.js';
import { TokenAccount } from '../../models';
import { MintParser, TokenAccountParser } from '../../contexts/accounts';
import { fromLamports, fromLamportsDecimals } from '../../utils/utils';
import { TokenIcon } from '../TokenIcon';

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

    let list = accounts.map(a => {
      let tokenInfo = tokenMap.get(a.info.mint.toString());
      let tokenName = tokenInfo ? tokenInfo.name : 'unknown';

      let tokenAmount = fromLamportsDecimals(a, tokenInfo ? tokenInfo.decimals : 6);
      let tokenIcon = tokenInfo ? tokenInfo.logoURI : '';
      return {
        key: a.info.mint,
        mint: a.info.mint,
        name: tokenName,
        amount: tokenAmount,
        tokenIcon: tokenIcon,
      };
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
    },
    {
      title: 'Balance',
      dataIndex: 'amount',
      key: 'amount',
    },
  ];

  return (
    <span>
      <Table dataSource={tokenList} columns={columns} pagination={false} />
      {/*  {tokenList.map(a => (
        <span key={a.mint}>
          <TokenIcon mintAddress={a.mint} /> {a.name} - {a.amount}
          <br />
        </span>
      ))}*/}
    </span>
  );
}
