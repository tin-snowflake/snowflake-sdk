import React, { useEffect, useState } from 'react';
import { FlowListItem } from '../FlowListItem';
import { useAnchorProgram } from '../../contexts/anchorContext';
import { PublicKey } from '@solana/web3.js';
import * as flowUtil from '../../utils/flowUtil';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, Empty, Form, Skeleton } from 'antd';

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
    setLoading(false);
  }

  useEffect(() => {
    init();
  }, []);
  let [loading, setLoading] = useState(true);
  return (
    <span style={{ width: '100%' }}>
      <Skeleton loading={loading} active>
        {flows.map(flow => (
          <span key={flow.publicKey}>
            <FlowListItem flowInfo={flow} />
          </span>
        ))}
        {flows.length == 0 && (
          <div>
            <div className="card">
              <div className="card-body" style={{ textAlign: 'center' }}>
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No Automation" />
              </div>
            </div>
          </div>
        )}
      </Skeleton>
    </span>
  );
};
