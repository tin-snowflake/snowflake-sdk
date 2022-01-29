import React from 'react';
import './App.less';
import { Routes } from './routes';
import { Helmet } from 'react-helmet';
import { LABELS } from './constants';
import { IntercomProvider } from 'react-use-intercom';

function App() {
  return (
    <div className="App">
      <Helmet>
        <title>{LABELS.APP_TITLE}</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Commissioner" />
      </Helmet>
      <Routes />
      <IntercomProvider appId="fthmb1qz" autoBoot>
        <div></div>
      </IntercomProvider>
    </div>
  );
}

export default App;
