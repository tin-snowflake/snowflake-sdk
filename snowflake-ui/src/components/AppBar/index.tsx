import React from 'react';
import { Button, Popover } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { Settings } from '../Settings';
import { LABELS } from '../../constants';
import { WalletConnectButton, WalletModalButton, WalletMultiButton } from '@solana/wallet-adapter-ant-design';
import { useWallet } from '@solana/wallet-adapter-react';
import { ConnectButton } from '../ConnectButton';

export const AppBar = (props: { left?: JSX.Element; right?: JSX.Element }) => {
  const { connected } = useWallet();
  const TopBar = (
    <div className="App-Bar-right">
      <ConnectButton className="customWalletConnectButton" type="primary" shape="round" style={{ marginRight: '24px' }}></ConnectButton>

      <Popover placement="topRight" title={LABELS.SETTINGS_TOOLTIP} content={<Settings />} trigger="click">
        <Button shape="circle" size="small" type="text" style={{ border: 'none' }} icon={<SettingOutlined />} />
      </Popover>
      {props.right}
    </div>
  );

  return TopBar;
};
