import { PublicKey } from '@solana/web3.js';
import { FLOW_ACCOUNT_LAYOUT } from '../layouts/snowflakeLayouts';
import { Program } from '@project-serum/anchor';
import { Flow, RecurringUIOption, RETRY_WINDOW, TriggerType, UIFlow } from '../models/flow';
import * as flowActionUtil from './flowActionUtil';
import * as actionUtil from './flowActionUtil';
import _ from 'lodash';
import moment from 'moment';
import { ActionContext } from '../models/flowAction';
import { ConnectionConfig } from '../contexts/connection';
import { WalletContextState } from '@solana/wallet-adapter-react';
import BN from 'bn.js';
import { CustomAnchorClient } from './customAnchorClient';

function flowOwnedAccountsFilter(publicKey: PublicKey) {
  let filter = {
    memcmp: {
      offset: FLOW_ACCOUNT_LAYOUT.offsetOf('owner'),
      bytes: publicKey.toBase58(),
    },
  };
  return filter;
}

export const DEFAULT_FLOW_SIZE = 4994;
let dataSizeFilter = {
  dataSize: DEFAULT_FLOW_SIZE,
};

export async function fetchFlowsByOwner(program: Program, publicKey: PublicKey) {
  let ownerFilter = flowOwnedAccountsFilter(publicKey);

  // return program.account.flow.all([dataSizeFilter, ownerFilter]);

  const customAnchorClient = new CustomAnchorClient(program.account.flow);
  return customAnchorClient.queryAllIgnoreBadData([dataSizeFilter, ownerFilter]);
}

export async function fetchGlobalFlows(program: Program) {
  // return program.account.flow.all([dataSizeFilter]);

  const customAnchorClient = new CustomAnchorClient(program.account.flow);
  return customAnchorClient.queryAllIgnoreBadData([dataSizeFilter]);
}

export const templateAction = { name: 'basic_action', actionCode: actionUtil.ACTION_TYPES.customAction.code, accounts: [{ isSigner: false, isWritable: false }] };

export async function convertFlow(flow, connection: ConnectionConfig, wallet: WalletContextState, ignoreActions?): Promise<UIFlow> {
  let uiFlow = _.cloneDeep(flow);
  // convert unix timestamp to moment js time object
  if (uiFlow.nextExecutionTime) {
    uiFlow.nextExecutionTime = moment.unix(uiFlow.nextExecutionTime);
  }

  if (uiFlow.lastScheduledExecution) {
    uiFlow.lastScheduledExecution = uiFlow.lastScheduledExecution > 0 ? moment.unix(uiFlow.lastScheduledExecution) : null;
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
  let flow: Flow = _.cloneDeep(uiFlow);

  // convert next execution time to unix timestamp
  flow.nextExecutionTime = flow.nextExecutionTime ? new BN(uiFlow.nextExecutionTime.unix()) : new BN(0);

  flow.recurring = uiFlow.recurring == RecurringUIOption.Yes ? true : false;
  flow.retryWindow = uiFlow.retryWindow;
  // convert last execution time just so anchor is not failing, we're not going to save last execution time
  flow.lastScheduledExecution = flow.lastScheduledExecution ? new BN(uiFlow.lastScheduledExecution.unix()) : new BN(0);

  flow.userUtcOffset = new Date().getTimezoneOffset() * 60;
  flow.payFeeFrom = 0;
  flow.scheduleEndDate = new BN(0);
  flow.expiryDate = new BN(0);
  flow.expireOnComplete = false;
  flow.externalId = '';
  flow.extra = '';

  for (const [i, action] of flow.actions.entries()) {
    const actionType = flowActionUtil.actionTypeFromCode(action.actionCode);
    const actionContext: ActionContext = { action: action, connectionConfig: connection, wallet: wallet };
    flow.actions[i] = await actionType.convertUIAction(actionContext);
    flow.actions[i].extra = '';
  }

  // the flow that we send to the cluster doesn't need owner
  delete flow.owner;
  return flow;
}

export enum STATUS {
  COUNTDOWN,
  EXECUTING,
  COMPLETED,
  ERROR,
  NOT_SCHEDULED,
  MONITORING_EXECUTION,
  TOO_OLD,
  UNKNOWN,
}

export function getStatus(uiFlow: UIFlow | any): STATUS {
  // rule out NONE trigger
  if (uiFlow.triggerType == TriggerType.None) {
    return STATUS.NOT_SCHEDULED;
  } else if (uiFlow.triggerType == TriggerType.Time) {
    if (!uiFlow.nextExecutionTime) return STATUS.UNKNOWN; // should never get here
    if (uiFlow.nextExecutionTime.unix() == 0) return STATUS.COMPLETED;
    if (uiFlow.nextExecutionTime.unix() == -1) return STATUS.ERROR;

    if (uiFlow.nextExecutionTime.isAfter(moment())) return STATUS.COUNTDOWN;
    else if (uiFlow.nextExecutionTime.isBefore(moment()) && uiFlow.nextExecutionTime.isAfter(moment().subtract(RETRY_WINDOW, 'second'))) return STATUS.EXECUTING;
    else return STATUS.TOO_OLD;
  } else {
    // PROGRAM TRIGGER
    if (uiFlow.remainingRuns == 0 && uiFlow.lastScheduledExecution) return STATUS.COMPLETED;
    else return STATUS.MONITORING_EXECUTION;
  }

  return STATUS.UNKNOWN;
}
