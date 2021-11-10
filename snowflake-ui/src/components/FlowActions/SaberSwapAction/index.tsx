import React, { useEffect, useState } from 'react';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons/lib';
import { Button, Form, Input, Select } from 'antd';
import _ from 'lodash';
import { toPublicKey } from '../../../utils/snowUtils';
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { ASSOCIATED_TOKEN_PROGRAM_ID, programIds, TOKEN_PROGRAM_ID } from '../../../utils/ids';
import * as BufferLayout from 'buffer-layout';
import * as Layout from '../../../utils/layout';
import { MintInfo, Token, u64 } from '@solana/spl-token';
import { useWallet, WalletContextState } from '@solana/wallet-adapter-react';
import * as flowActionUtil from '../../../utils/flowActionUtil';
import { sendTransaction, useConnection } from '../../../contexts/connection';
import { notify } from '../../../utils/notifications';
import BN from 'bn.js';
import { TokenIcon } from '../../TokenIcon';
import { TokenInput } from '../../TokenInput';
import { createAssociatedTokenAccountIfNotExist, getAssociatedTokenAddress } from '../../../utils/tokens';
import { cache, MintParser, TokenAccountParser } from '../../../contexts/accounts';
import { TokenAccount } from '../../../models';
import { fromLamports, toLamports } from '../../../utils/utils';
import { StableSwap } from '@saberhq/stableswap-sdk/dist';

export async function convertAction(action, connection: Connection): Promise<any> {
  return action;
}

export async function convertUIAction(uiAction, walletContext: WalletContextState, connection: Connection): Promise<any> {
  const [pda, bump] = await PublicKey.findProgramAddress([walletContext.publicKey.toBuffer()], new PublicKey(programIds().snowflake));
  const userAuthority = pda; // current phantom wallet: EpmRY1vzTajbur4hkipMi3MbvjbJHKzqEAAqXj12ccZQ
  const userSource = new PublicKey('9j4RxLU5wyQpvSvYimtyHDLNH8cExaUn6bSBV1QaEJUE');
  const userDestination = new PublicKey('CeWNyMAXugv5zvghNXP4uM11ekcVL9kNV8yp11YG8YYn');
  const poolSource = new PublicKey('6aFutFMWR7PbWdBQhdfrcKrAor9WYa2twtSinTMb9tXv');
  const poolDestination = new PublicKey('HXbhpnLTxSDDkTg6deDpsXzJRBf8j7T6Dc3GidwrLWeo');
  let lpMint = new PublicKey('2tWC4JAdL4AxEFJySziYJfsAnW2MHKRo98vbAPiRDSk8');
  let mint = MintParser(lpMint, await connection.getAccountInfo(lpMint));
  const amountIn = new u64(toLamports(0.2, mint.info));
  const minimumAmountOut = new u64(0);

  const swapAccount = new PublicKey('VeNkoB1HvSP6bSeGybQDnx9wTWFsQb2NBCemeCDSuKL');
  const swapProgram = new PublicKey('SSwpkEEcbUqx4vtoEByFjSkhKdCT862DNVb52nZg1UZ');
  const stableSwap = await StableSwap.load(connection, swapAccount, swapProgram);
  const ix = stableSwap.swap({ userAuthority, userSource, userDestination, poolSource, poolDestination, amountIn, minimumAmountOut });

  let action = flowActionUtil.cloneActionBase(uiAction);
  flowActionUtil.pushInstruction(ix, action);
  return action;
}

export async function pushFlowInstructions(uiAction, wallet, connection, instructions) {
  instructions.push(await createAuthorizeInstruction(wallet, uiAction));
}

async function createAuthorizeInstruction(wallet, uiAction) {
  const [pda, bump] = await PublicKey.findProgramAddress([wallet.publicKey.toBuffer()], new PublicKey(programIds().snowflake));
  let maxAmount = Math.floor(9 * Math.pow(10, 12));
  let approveIx = Token.createApproveInstruction(programIds().token, new PublicKey('9j4RxLU5wyQpvSvYimtyHDLNH8cExaUn6bSBV1QaEJUE'), pda, wallet.publicKey, [], maxAmount);
  return approveIx;
}

export function initNewAction(action) {}

export const SaberPoolWithdrawAction = ({ uiFlow, action: uiAction, updateState }) => {
  const { Option } = Select;
  const handleChange = (obj, fieldType?) => e => {
    _.set(obj, e.target.name, e.target.value);
    updateState();
  };

  const walletCtx = useWallet();
  const connection = useConnection();
  useEffect(() => {
    updateState();
  }, []);

  return <span>SABER Swap UI</span>;
};
