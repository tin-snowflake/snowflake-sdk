import { PublicKey } from '@solana/web3.js';
import { FLOW_ACCOUNT_LAYOUT } from '../layouts/snowflakeLayouts';
import { Program } from '@project-serum/anchor';
import { Flow, UIFlow } from '../models/flow';
import * as flowActionUtil from './flowActionUtil';
import _ from 'lodash';
import moment from 'moment';
import { ActionContext } from '../models/flowAction';
import { ConnectionConfig } from '../contexts/connection';
import { WalletContextState } from '@solana/wallet-adapter-react';
import * as actionUtil from './flowActionUtil';
import BN from 'bn.js';

function flowOwnedAccountsFilter(publicKey: PublicKey) {
  let filter = {
    memcmp: {
      offset: FLOW_ACCOUNT_LAYOUT.offsetOf('owner'),
      bytes: publicKey.toBase58(),
    },
  };
  return filter;
}

let dataSizeFilter = {
  dataSize: 5000,
};

export async function fetchFlowsByOwner(program: Program, publicKey: PublicKey) {
  let ownerFilter = flowOwnedAccountsFilter(publicKey);
  console.log('ownerFilter = ', ownerFilter);
  return program.account.flow.all([dataSizeFilter, ownerFilter]);
}

export async function fetchGlobalFlows(program: Program) {
  return program.account.flow.all([dataSizeFilter]);
}

export const templateAccount = { isSigner: false, isWritable: false };
export const templateAction = { name: 'basic_action', actionCode: actionUtil.ACTION_TYPES.customAction.code, accounts: [templateAccount] };
export async function convertFlow(flow, connection: ConnectionConfig, wallet: WalletContextState, ignoreActions?): Promise<UIFlow> {
  let uiFlow = _.cloneDeep(flow);
  // convert unix timestamp to moment js time
  if (uiFlow.nextExecutionTime) {
    uiFlow.nextExecutionTime = moment.unix(uiFlow.nextExecutionTime);
  }
  if (ignoreActions) {
    uiFlow.actions = [templateAction];
    return uiFlow;
  }
  for (const [i, action] of uiFlow.actions.entries()) {
    const actionType = flowActionUtil.actionTypeFromCode(action.actionCode);
    const actionContext: ActionContext = { action: action, connectionConfig: connection, wallet: wallet };
    uiFlow.actions[i] = await actionType.convertAction(actionContext);
  }

  return uiFlow;
}

export async function convertUIFlow(uiFlow, connection: ConnectionConfig, wallet: WalletContextState): Promise<Flow> {
  let flow = _.cloneDeep(uiFlow);

  // convert schedule time to unix timestamp
  flow.nextExecutionTime = new BN(flow.nextExecutionTime.unix());

  for (const [i, action] of flow.actions.entries()) {
    const actionType = flowActionUtil.actionTypeFromCode(action.actionCode);
    const actionContext: ActionContext = { action: action, connectionConfig: connection, wallet: wallet };
    flow.actions[i] = await actionType.convertUIAction(actionContext);
  }

  // the flow that we send to the cluster doesn't need owner
  delete flow.flowOwner;
  return flow;
}
