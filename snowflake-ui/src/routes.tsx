import {HashRouter, Route, Switch} from 'react-router-dom';
import React, {useMemo} from 'react';
import {WalletProvider} from '@solana/wallet-adapter-react';
import {ConnectionProvider} from './contexts/connection';
import {AccountsProvider} from './contexts/accounts';
import {MarketProvider} from './contexts/market';
import {AppLayout} from './components/Layout';

import {FaucetView, HomeView} from './views';
import {
    getLedgerWallet,
    getMathWallet,
    getPhantomWallet,
    getSolflareWallet,
    getSolletWallet,
    getSolongWallet,
    getTorusWallet
} from '@solana/wallet-adapter-wallets';
import {FlowDetail} from './components/FlowDetail';
import {Test} from './components/Test';
import {EditFlowWrapper} from './components/EditFlowWrapper';
import {SnowSettings} from './components/SnowSettings';

export function Routes() {
  const wallets = useMemo(
    () => [
      getPhantomWallet(),
      getSolflareWallet(),
      getTorusWallet({
        options: {
          // TODO: Get your own tor.us wallet client Id
          clientId: 'BOM5Cl7PXgE9Ylq1Z1tqzhpydY0RVr8k90QQ85N7AKI5QGSrr9iDC-3rvmy0K_hF0JfpLMiXoDhta68JwcxS1LQ',
        },
      }),
      getLedgerWallet(),
      getSolongWallet(),
      getMathWallet(),
      getSolletWallet(),
    ],
    []
  );

  return (
    <HashRouter basename={'/'}>
      <ConnectionProvider>
        <WalletProvider wallets={wallets} autoConnect={true}>
          <AccountsProvider>
            <MarketProvider>
              <AppLayout>
                <Switch>
                  <Route exact path="/" component={() => <HomeView />} />
                  <Route exact path="/flowDetail/:flowKey" component={() => <FlowDetail />} />
                  <Route exact path="/flowDetail" component={() => <FlowDetail />} />
                  <Route exact path="/editflow/:flowKey" component={() => <EditFlowWrapper />} />
                  <Route exact path="/editflow" component={() => <EditFlowWrapper />} />
                  <Route exact path="/settings" component={() => <SnowSettings />} />
                  <Route exact path="/test" component={() => <Test />} />
                  <Route exact path="/faucet" children={<FaucetView />} />
                </Switch>
              </AppLayout>
            </MarketProvider>
          </AccountsProvider>
        </WalletProvider>
      </ConnectionProvider>
    </HashRouter>
  );
}
