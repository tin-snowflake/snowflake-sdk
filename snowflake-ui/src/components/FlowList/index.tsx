import React, { useEffect, useState } from 'react';
import { FlowListItem } from '../FlowListItem';
import { useAnchorProgram } from '../../contexts/anchorContext';
import { GetProgramAccountsFilter } from '@solana/web3.js';
import * as flowUtil from '../../utils/flowUtil';
import { useWallet } from '@solana/wallet-adapter-react';

export const FlowList = (props: {}) => {
  const program = useAnchorProgram();
  const walletCtx = useWallet();

  let [flows, setFlows] = useState([]);

  async function init() {
    /*let flowsByOwner = await flowUtil.fetchFlowsByOwner(program, walletCtx.publicKey);
    console.log('flows by owner = ', flowsByOwner);*/

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
    // let poolInfo = await program().account.flow.fetch('6sk7d3te2eFKzmoZqELCxfP4JqeN9X9owcP2sgTVgcUT');
    console.log('all flows', allFlows);
  }

  return (
    <span style={{ width: '100%' }}>
      {flows.map(flow => (
        <span>
          {/*{JSON.stringify(flow, null, 2)}*/}
          <FlowListItem key={flow.publicKey} name={flow.account.name} flowKey={flow.publicKey} schedule={flow.account.nextExecutionTime} actions="custom" />
        </span>
      ))}

      <FlowListItem key="101" name="Alex monthly payment" flowKey="" schedule="Onchain Price Triggerred" actions="custom" />
      <FlowListItem key="102" name="Withdraw RAY liquidity from Orca" flowKey="" schedule="Onchain Event Triggered" actions="Raydium, Orca" />
      <FlowListItem key="103" name="Dollar Cost Average Buy of SOL" flowKey="" schedule="Daily, 12:00 PM" actions="custom" />
      <FlowListItem key="104" name="Sell ETH if price reaches 5000" flowKey="" schedule="Monthly, 6th, 12:00 PM" actions="Saber, Serum" />
    </span>
  );
};
