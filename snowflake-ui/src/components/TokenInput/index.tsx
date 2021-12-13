import React, { useEffect, useState } from 'react';
import { useMint, useAccountByMint } from '../../contexts/accounts';
import { TokenIcon } from '../TokenIcon';
import { Select } from 'antd';
import { useConnectionConfig } from '../../contexts/connection';
import EllipsisText from 'react-ellipsis-text';
import { findAssociatedTokenAddress } from '../../utils/web3';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { SizeType } from 'antd/lib/config-provider/SizeContext';
import { SOL_MINT } from '../../utils/ids';

export const TokenInput = ({ token, handleChange, disableTokenSelect = false, showNativeSol = true }) => {
  const { Option } = Select;
  let { tokens } = useConnectionConfig();
  let [tokenList, setTokenList] = useState(tokens);
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
    if (!showNativeSol) {
      setTokenList(tokenList.filter(a => a.address != SOL_MINT.toString()));
    }
  }, []);

  return (
    <div className="tokenInput">
      <Select
        onChange={updateToken}
        defaultValue={token.mint}
        showSearch
        disabled={disableTokenSelect}
        optionLabelProp="label"
        dropdownMatchSelectWidth={false}
        placeholder="Token"
        optionFilterProp="searchvalue"
        filterOption={(input, option) => option.searchvalue.toLowerCase().indexOf(input.toLowerCase()) >= 0}>
        {tokenList.map(function (token, i) {
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
                <EllipsisText text={token.name} length={20} style={{ marginRight: '20px' }} />
              </div>
            </Option>
          );
        })}
      </Select>
    </div>
  );
};
