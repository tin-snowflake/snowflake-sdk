import React, { useState } from 'react';
import { Button, Menu, Popover } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { Settings } from '../Settings';
import { LABELS } from '../../constants';
import { WalletConnectButton, WalletModalButton, WalletMultiButton } from '@solana/wallet-adapter-ant-design';
import { useWallet } from '@solana/wallet-adapter-react';
import { ConnectButton } from '../ConnectButton';
import { AppstoreOutlined, MailOutlined } from '@ant-design/icons/lib';

export const AppBar = (props: { left?: JSX.Element; right?: JSX.Element }) => {
  const [current, setCurrent] = useState('mail');
  const handleClick = e => {
    console.log('click ', e);
    setCurrent(e.key);
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div className="App-Bar-right">
        <ConnectButton className="customWalletConnectButton" type="primary" shape="round" style={{ marginRight: '24px' }}></ConnectButton>

        <Popover placement="topRight" title={LABELS.SETTINGS_TOOLTIP} content={<Settings />} trigger="click">
          <Button shape="circle" size="small" type="text" style={{ border: 'none' }} icon={<SettingOutlined />} />
        </Popover>
        {props.right}
      </div>
    </div>
  );
};
