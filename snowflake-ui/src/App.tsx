import React from 'react';
import './App.less';
import { Routes } from './routes';
import { Helmet } from 'react-helmet';
import { LABELS } from './constants';
function App() {
  return (
    <div className="App">
      <Helmet>
        <title>{LABELS.APP_TITLE}</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Commissioner" />
      </Helmet>
      <Routes />
    </div>
  );
}

export default App;
