import { PublicKey } from '@solana/web3.js';
import { FLOW_ACCOUNT_LAYOUT } from '../layouts/snowflakeLayouts';
import { Program } from '@project-serum/anchor';
import { Flow, RecurringUIOption, UIFlow } from '../models/flow';
import * as flowActionUtil from './flowActionUtil';
import * as actionUtil from './flowActionUtil';
import _ from 'lodash';
import moment from 'moment';
import { ActionContext } from '../models/flowAction';
import { ConnectionConfig } from '../contexts/connection';
import { WalletContextState } from '@solana/wallet-adapter-react';
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

export const templateAction = { name: 'basic_action', actionCode: actionUtil.ACTION_TYPES.customAction.code, accounts: [{ isSigner: false, isWritable: false }] };

export async function convertFlow(flow, connection: ConnectionConfig, wallet: WalletContextState, ignoreActions?): Promise<UIFlow> {
  let uiFlow = _.cloneDeep(flow);
  // convert unix timestamp to moment js time object
  if (uiFlow.nextExecutionTime) {
    uiFlow.nextExecutionTime = uiFlow.nextExecutionTime > 0 ? moment.unix(uiFlow.nextExecutionTime) : null;
  }

  if (uiFlow.lastExecutionTime) {
    uiFlow.lastExecutionTime = moment.unix(uiFlow.lastExecutionTime);
  }

  uiFlow.recurring = uiFlow.recurring ? RecurringUIOption.Yes : RecurringUIOption.No;

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

  // convert next execution time to unix timestamp
  flow.nextExecutionTime = flow.nextExecutionTime ? new BN(flow.nextExecutionTime.unix()) : new BN(0);

  flow.recurring = flow.recurring == RecurringUIOption.Yes ? true : false;

  // convert last execution time just so anchor is not failing, we're not going to save last execution time
  flow.lastExecutionTime = flow.lastExecutionTime ? new BN(flow.lastExecutionTime.unix()) : new BN(0);
  for (const [i, action] of flow.actions.entries()) {
    const actionType = flowActionUtil.actionTypeFromCode(action.actionCode);
    const actionContext: ActionContext = { action: action, connectionConfig: connection, wallet: wallet };
    flow.actions[i] = await actionType.convertUIAction(actionContext);
  }

  // the flow that we send to the cluster doesn't need owner
  delete flow.flowOwner;
  return flow;
}

export enum STATUS {
  COUNTDOWN,
  EXECUTING,
  EXECUTED,
  NO_EXECUTE,
  UNKNOWN,
}

const EXECUTION_THRESHOLD = 120; // seconds

export function getStatus(uiFlow: UIFlow & any): STATUS {
  if (uiFlow.nextExecutionTime && uiFlow.nextExecutionTime.unix() > 0) {
    if (uiFlow.nextExecutionTime.isAfter(moment())) return STATUS.COUNTDOWN;
    else if (uiFlow.nextExecutionTime.isBefore(moment()) && uiFlow.nextExecutionTime.isAfter(moment().subtract(EXECUTION_THRESHOLD, 'second'))) return STATUS.EXECUTING;
    else if (uiFlow.nextExecutionTime.isBefore(moment().subtract(EXECUTION_THRESHOLD, 'second'))) return STATUS.NO_EXECUTE;
  } else {
    if (uiFlow.lastExecutionTime && uiFlow.lastExecutionTime > 0) {
      return STATUS.EXECUTED;
    }
  }
  return STATUS.UNKNOWN;
}
