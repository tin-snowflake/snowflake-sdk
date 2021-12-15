import React, { useEffect, useState } from 'react';
import { FlowListItem } from '../FlowListItem';
import { useAnchorProgram } from '../../contexts/anchorContext';
import { PublicKey } from '@solana/web3.js';
import * as flowUtil from '../../utils/flowUtil';
import { useWallet } from '@solana/wallet-adapter-react';

export const FlowList = (props: { owner?: PublicKey }) => {
  const program = useAnchorProgram();
  const walletCtx = useWallet();

  let [flows, setFlows] = useState([]);

  async function init() {
    let flowList = [];
    if (props.owner) {
      flowList = await flowUtil.fetchFlowsByOwner(program, props.owner);
    } else {
      flowList = await flowUtil.fetchGlobalFlows(program);
    }

    setFlows(flowList);
    console.log('global flows = ', flowList);
  }

  useEffect(() => {
    init();
  }, []);

  return (
    <span style={{ width: '100%' }}>
      {flows.map(flow => (
        <span key={flow.publicKey}>
          <FlowListItem flowInfo={flow} />
        </span>
      ))}
    </span>
  );
};
