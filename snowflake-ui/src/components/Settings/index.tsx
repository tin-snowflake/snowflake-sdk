import React from 'react';
import { Button, Select } from 'antd';
import { ENDPOINTS, useConnectionConfig } from '../../contexts/connection';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-ant-design';

export const Settings = () => {
  const { connected, disconnect, wallet } = useWallet();
  const { endpoint, setEndpoint } = useConnectionConfig();
  const { setVisible } = useWalletModal();
  return (
    <>
      <div style={{ display: 'grid' }}>
        Network:{' '}
        <Select onSelect={setEndpoint} value={endpoint} style={{ marginBottom: 20 }}>
          {ENDPOINTS.map(({ name, endpoint }) => (
            <Select.Option value={endpoint} key={endpoint}>
              {name}
            </Select.Option>
          ))}
        </Select>
        {connected && (
          <Button type="primary" onClick={disconnect}>
            Disconnect
          </Button>
        )}
        {!connected && wallet && (
          <Button
            type="primary"
            onClick={() => {
              setVisible(true);
            }}>
            Change Wallet
          </Button>
        )}
      </div>
    </>
  );
};
