import { Button, PageHeader } from 'antd';
import React from 'react';
import { Link } from 'react-router-dom';
import { useWallet, WalletContextState } from '@solana/wallet-adapter-react';
import { FlowList } from '../../components/FlowList';
import { NewAutomationButton } from '../../components/NewAutomationButton';

export const HomeView = () => {
  const walletCtx: WalletContextState = useWallet();

  return (
    <div style={{ width: '100%' }}>
      <PageHeader ghost={false} title="Your Automations" extra={[<NewAutomationButton />]}></PageHeader>

      {walletCtx.publicKey && <FlowList owner={walletCtx.publicKey} />}
      {!walletCtx.publicKey && 'Connect your wallet to continue.'}
    </div>
  );
};
