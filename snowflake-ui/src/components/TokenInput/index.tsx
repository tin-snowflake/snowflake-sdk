import React, { useEffect } from 'react';
import { useMint, useAccountByMint } from '../../contexts/accounts';
import { TokenIcon } from '../TokenIcon';
import { Select } from 'antd';
import { useConnectionConfig } from '../../contexts/connection';
import EllipsisText from 'react-ellipsis-text';
import { findAssociatedTokenAddress } from '../../utils/web3';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

export const TokenInput = ({ token, handleChange }) => {
  const { Option } = Select;
  const { tokens } = useConnectionConfig();
  const wallet = useWallet();
  async function updateToken(value) {
    const mint = value;
    const ata = await findAssociatedTokenAddress(wallet.publicKey, new PublicKey(mint));
    token.mint = mint;
    token.ata = ata.toString();
    handleChange();
  }

  useEffect(() => {
    if (token.mint) updateToken(token.mint);
  }, []);

  return (
    <div className="tokenInput">
      <Select
        onChange={updateToken}
        defaultValue={token.mint}
        showSearch
        optionLabelProp="label"
        dropdownMatchSelectWidth={false}
        placeholder="Token"
        optionFilterProp="searchvalue"
        filterOption={(input, option) => option.searchvalue.toLowerCase().indexOf(input.toLowerCase()) >= 0}>
        {tokens.map(function (token, i) {
          return (
            <Option
              key={token.address}
              value={token.address}
              searchvalue={token.symbol + token.name}
              label={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <TokenIcon mintAddress={token.address} /> {token.symbol}
                </div>
              }>
              <div style={{ display: 'flex' }}>
                <TokenIcon mintAddress={token.address} /> {token.symbol} - &nbsp;
                <EllipsisText text={token.name} length={'20'} style={{ marginRight: '20px' }} />
              </div>
            </Option>
          );
        })}
      </Select>
    </div>
  );
};
