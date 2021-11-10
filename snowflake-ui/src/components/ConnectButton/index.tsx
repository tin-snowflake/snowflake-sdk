import { CopyOutlined as CopyIcon, DisconnectOutlined as DisconnectIcon, SwapOutlined as SwitchIcon } from '@ant-design/icons';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button, ButtonProps, Dropdown, Menu } from 'antd';
import React, { FC, useMemo } from 'react';
import { useWalletModal, WalletConnectButton, WalletIcon, WalletModalButton } from '@solana/wallet-adapter-ant-design';

export const ConnectButton: FC<ButtonProps> = ({ type = 'primary', size = 'large', children, disabled, onClick, ...props }) => {
  const { publicKey, wallet, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  const base58 = useMemo(() => publicKey?.toBase58(), [publicKey]);
  const content = useMemo(() => {
    if (children) return children;
    if (!wallet || !base58) return null;
    return base58.substr(0, 4) + '..' + base58.substr(-4, 4);
  }, [children, wallet, base58]);

  props['size'] = 'middle';
  if (!wallet) {
    props['children'] = 'Connect Wallet';

    return <WalletModalButton {...props} />;
  }

  if (!base58) {
    return <WalletConnectButton {...props} />;
  }

  return (
    <Dropdown
      overlay={
        <Menu style={{ padding: 0, marginTop: '8px' }}>
          <Menu.Item
            onClick={async () => {
              await navigator.clipboard.writeText(base58);
            }}
            icon={<CopyIcon style={{ fontSize: 20, marginRight: 12 }} />}
            style={{ padding: 0, paddingLeft: 12, paddingRight: 16, paddingTop: 8, paddingBottom: 8 }}>
            Copy address
          </Menu.Item>
          <Menu.Item
            onClick={() => setTimeout(() => setVisible(true), 100)}
            icon={<SwitchIcon style={{ fontSize: 20, marginRight: 12 }} />}
            style={{ padding: 0, paddingLeft: 12, paddingRight: 16, paddingTop: 8, paddingBottom: 8 }}>
            Connect a different wallet
          </Menu.Item>
          <Menu.Item
            onClick={() => {
              // eslint-disable-next-line @typescript-eslint/no-empty-function
              disconnect().catch(() => {});
            }}
            icon={<DisconnectIcon style={{ fontSize: 20, marginRight: 12 }} />}
            style={{ padding: 0, paddingLeft: 12, paddingRight: 16, paddingTop: 8, paddingBottom: 8 }}>
            Disconnect
          </Menu.Item>
        </Menu>
      }
      trigger={['click']}>
      <Button type={type} size="middle" {...props} shape="round" style={{ paddingLeft: '24px', paddingRight: '24px', marginRight: '16px' }}>
        <span style={{ color: 'grey', marginRight: '10px' }}>{wallet.name} </span>
        {content}
      </Button>
    </Dropdown>
  );
};
