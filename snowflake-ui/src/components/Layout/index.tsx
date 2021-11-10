import React from 'react';
import './../../App.less';
import { Layout } from 'antd';
import { Link } from 'react-router-dom';
import { WalletModalProvider } from '@solana/wallet-adapter-ant-design';

import { LABELS } from '../../constants';
import { AppBar } from '../AppBar';

const { Header, Content, Footer } = Layout;

export const AppLayout = React.memo(({ children }) => {
  return (
    <WalletModalProvider>
      <div className="App wormhole-bg">
        <Layout title={LABELS.APP_TITLE}>
          <Header className="App-Bar">
            <div style={{ maxWidth: '1100px', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginLeft: 'auto', marginRight: 'auto' }}>
              <Link to="/">
                <div className="app-title" style={{ display: 'flex' }}>
                  <img src="snowflake-blue.svg" style={{ marginRight: '-8px', marginLeft: '-30px' }} />
                  <h2 style={{ fontSize: '26px', fontWeight: 'bold' }}>{LABELS.APP_TITLE}</h2>
                </div>
              </Link>
              <AppBar />
            </div>
          </Header>
          <Content style={{ maxWidth: '1100px', width: '100%', margin: 'auto', marginTop: '30px' }}>{children}</Content>
          <Footer />
        </Layout>
      </div>
    </WalletModalProvider>
  );
});
