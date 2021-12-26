import { TransactionInstruction } from '@solana/web3.js';
import { FlowActionResolver } from '../models/flowAction';
import { CustomAction } from '../components/FlowActions/customAction';
import { PaymentAction } from '../components/FlowActions/paymentAction';
import { SaberPoolWithdrawAction } from '../components/FlowActions/saberPoolWithdrawAction';
import { BlankAction } from '../components/FlowActions/blankAction';
import { PriceCheckAction } from '../components/FlowActions/priceCheckAction'
export const ACTION_TYPES = {
  customAction: new CustomAction(),
  paymentAction: new PaymentAction(),
  saberPoolWithdrawActio: new SaberPoolWithdrawAction(),
  blankAction: new BlankAction(),
  priceCheckAction: new PriceCheckAction(),
  /*customAction: {
    code: 100,
    component: customAction.CustomAction,
    convertUIAction: customAction.convertUIAction,
    convertAction: customAction.convertAction,
    pushFlowInstructions: customAction.pushFlowInstructions,
    initNewAction: customAction.initNewAction,
  },
  tokenTransferAction: {
    code: 101,
    component: transferAction.TokenTransferAction,
    convertUIAction: transferAction.convertUIAction,
    convertAction: transferAction.convertAction,
    pushFlowInstructions: transferAction.pushFlowInstructions,
    initNewAction: transferAction.initNewAction,
  },
  saberPoolWithdraw: {
    code: 102,
    component: saberPoolWithdraw.SaberPoolWithdrawAction,
    convertUIAction: saberPoolWithdraw.convertUIAction,
    convertAction: saberPoolWithdraw.convertAction,
    pushFlowInstructions: saberPoolWithdraw.pushFlowInstructions,
    initNewAction: saberPoolWithdraw.initNewAction,
  },
  saberSwap: {
    code: 103,
    component: saberSwap.SaberPoolWithdrawAction,
    convertUIAction: saberSwap.convertUIAction,
    convertAction: saberSwap.convertAction,
    pushFlowInstructions: saberSwap.pushFlowInstructions,
    initNewAction: saberSwap.initNewAction,
  },
  priceCheckAction: {
    code: 104,
    component: priceCheckAction.priceCheckAction,
    convertUIAction: priceCheckAction.convertUIAction,
    convertAction: priceCheckAction.convertAction,
    pushFlowInstructions: priceCheckAction.pushFlowInstructions,
    initNewAction: priceCheckAction.initNewAction,
  }*/
};

export function actionTypeFromCode(code): FlowActionResolver {
  for (let key of Object.keys(ACTION_TYPES)) {
    let action: FlowActionResolver = ACTION_TYPES[key];
    if (action.code == code) return action;
  }
  return null;
}

export function cloneActionBase(action): any {
  return {
    actionCode: action.actionCode,
    name: action.name,
  };
}
export function pushInstruction(instruction: TransactionInstruction, action) {
  action.program = instruction.programId;
  action.instruction = new Buffer(instruction.data);
  action.accounts = instruction.keys;
  // in the user execution context, some account might be the signer,
  // however in the automated exection context, no accounts should be the signer
  action.accounts.forEach(account => {
    account.isSigner = false;
  });
}
