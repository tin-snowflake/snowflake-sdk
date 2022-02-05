import { Button, PageHeader } from 'antd';
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWallet, WalletContextState } from '@solana/wallet-adapter-react';
import { FlowList } from '../../components/FlowList';
import { NewAutomationButton } from '../../components/NewAutomationButton';
import { PublicKey } from '@solana/web3.js';
import { DEVNET_USDC_TOKEN, programIds } from '../../utils/ids';
import { fromLamportsDecimals, toLamportsByDecimal } from '../../utils/utils';
import { useConnectionConfig } from '../../contexts/connection';
import { createAssociatedTokenAccountIfNotExist, getAssociatedTokenAddress } from '../../utils/tokens';
import BN from 'bn.js';
import { SmartTxnClient } from '../../utils/smartTxnClient';
import { TokenAccountParser } from '../../contexts/accounts';
import { OnboardUserDevenet } from '../../components/OnboardUserDevnet';

export const HomeView = () => {
  const walletCtx: WalletContextState = useWallet();
  const connection = useConnectionConfig().connection;

  return (
    <div style={{ width: '100%' }}>
      <PageHeader ghost={false} title="Your Automations" extra={[<NewAutomationButton key={1} />]}></PageHeader>
      {walletCtx.publicKey && <FlowList owner={walletCtx.publicKey} />}
      {!walletCtx.publicKey && 'Connect your wallet to continue.'}
    </div>
  );
};
