import React, { useEffect, useState } from 'react';
import { FlowListItem } from '../FlowListItem';
import { useAnchorProgram } from '../../contexts/anchorContext';
import { GetProgramAccountsFilter } from '@solana/web3.js';
import * as flowUtil from '../../utils/flowUtil';
import { useWallet } from '@solana/wallet-adapter-react';
import { localCronToUTCCron } from '../../utils/cronTzConverter';

export const FlowList = (props: {}) => {
  const program = useAnchorProgram();
  const walletCtx = useWallet();

  let [flows, setFlows] = useState([]);
  function convertCron() {
    console.log(localCronToUTCCron('53 11 * * *'));
  }
  async function init() {
    /*let flowsByOwner = await flowUtil.fetchFlowsByOwner(program, walletCtx.publicKey);
    console.log('flows by owner = ', flowsByOwner);*/
    convertCron();
    let flows = await flowUtil.fetchGlobalFlows(program);
    setFlows(flows);
    console.log('global flows = ', flows);
  }

  useEffect(() => {
    init();
  }, []);

  async function getFlows() {
    let flowOwnerFilter: GetProgramAccountsFilter = {
      memcmp: { bytes: '', offset: 8 },
    };
    let allFlows = await program.account.flow.all();
    console.log('all flows', allFlows);
  }

  return (
    <span style={{ width: '100%' }}>
      {flows.map(flow => (
        <span>
          <FlowListItem flowInfo={flow} />
        </span>
      ))}
    </span>
  );
};
