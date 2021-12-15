import { Button, PageHeader } from 'antd';
import React from 'react';
import { Link } from 'react-router-dom';
import { useWallet, WalletContextState } from '@solana/wallet-adapter-react';
import { FlowList } from '../../components/FlowList';

export const GlobalView = () => {
  const walletCtx: WalletContextState = useWallet();

  return (
    <div style={{ width: '100%' }}>
      <PageHeader ghost={false} title="Global"></PageHeader>

      {walletCtx.publicKey && <FlowList />}
    </div>
  );
};
