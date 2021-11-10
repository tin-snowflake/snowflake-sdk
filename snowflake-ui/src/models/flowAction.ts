import { WalletContextState } from '@solana/wallet-adapter-react';
import { ConnectionConfig } from '../contexts/connection';
import { UIFlow } from './flow';

import { ReactElement } from 'react';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';

export type Action = any;

export type UIAction = any;

export interface ActionContext {
  action: any;
  wallet: WalletContextState;
  connectionConfig: ConnectionConfig;
}

export interface UIContext {
  uiFlow: UIFlow;
  action: UIAction;
  updateState: () => void;
}

export class OutputIXSet {
  type: string;
  token: string;
  amount: string;
  ixs: TransactionInstruction[];

  constructor(type, token, amount, ixs) {
    this.token = token;
    this.type = type;
    this.amount = amount;
    this.ixs = ixs;
  }
  static fromAtaIx(ata: PublicKey, ixs: TransactionInstruction[]): OutputIXSet {
    return new OutputIXSet('ata', ata.toString(), 0, ixs);
  }

  static fromAuthorizeIx(ata: PublicKey, amount: string, ixs: TransactionInstruction[]): OutputIXSet {
    return new OutputIXSet('authorize', ata.toString(), amount, ixs);
  }
}

export interface FlowActionResolver {
  code: number;
  editComponent: (UIContext) => ReactElement;
  convertUIAction: (ActionContext) => {};
  convertAction: (ActionContext) => Promise<UIAction>;
  outputInstructions: (ActionContext) => Promise<OutputIXSet[]>;
  initNewAction: (action: Action) => void;
}
