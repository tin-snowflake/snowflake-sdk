import React from 'react';

import { FormValidatorProvider } from '../FormValidator';
import { EditFlow } from '../EditFlow';
import { useWallet } from '@solana/wallet-adapter-react';

export function EditFlowWrapper(props) {
  const walletCtx = useWallet();
  return (
    <span style={{ width: '100%' }}>
      {walletCtx.publicKey && (
        <FormValidatorProvider>
          <EditFlow />
        </FormValidatorProvider>
      )}

      {!walletCtx.publicKey && 'Connect your wallet to continue.'}
    </span>
  );
}
