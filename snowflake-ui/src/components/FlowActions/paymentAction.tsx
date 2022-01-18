import { Action, ActionContext, FlowActionResolver, OutputIXSet, UIAction, UIContext } from '../../models/flowAction';
import { Checkbox, Form, Input, Select } from 'antd';
import _ from 'lodash';
import React, { useEffect } from 'react';
import * as flowActionUtil from '../../utils/flowActionUtil';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { TokenAccount } from '../../models';
import { MintParser, TokenAccountParser } from '../../contexts/accounts';
import BufferLayout from 'buffer-layout';
import * as Layout from '../../utils/layout';
import { fromLamports, toLamports } from '../../utils/utils';
import { programIds } from '../../utils/ids';
import { authorizeFullBalance, createAssociatedTokenAccountIfNotExist, getAssociatedTokenAddress } from '../../utils/tokens';
import { Token } from '@solana/spl-token';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '../../contexts/connection';
import { TokenInput } from '../TokenInput';
import { FieldIsPubKey, FieldRequire, FormItem } from '../FormItem';
import { useTokenName } from '../../hooks';

export class PaymentAction implements FlowActionResolver {
  code = 101;

  async convertAction(ctx: ActionContext): Promise<UIAction> {
    let connection = ctx.connectionConfig.connection;
    let action = ctx.action;
    let uiAction = flowActionUtil.cloneActionBase(action);
    uiAction.token = { mint: '', ata: action.accounts[0].pubkey.toString() };
    let senderAtaAccount = await connection.getAccountInfo(new PublicKey(uiAction.token.ata));
    let senderAtaInfo: TokenAccount = TokenAccountParser(uiAction.token.ata, senderAtaAccount);
    uiAction.token.mint = senderAtaInfo.info.mint.toString();

    uiAction.recipient = { wallet: '', ata: action.accounts[1].pubkey.toString() };
    let recipientAtaInfo: TokenAccount = TokenAccountParser(uiAction.token.ata, await connection.getAccountInfo(new PublicKey(uiAction.recipient.ata)));
    uiAction.recipient.wallet = recipientAtaInfo.info.owner.toString();

    const transferDataLayout = BufferLayout.struct([BufferLayout.u8('instruction'), Layout.uint64('amount')]);

    const data = Buffer.from(action.instruction);
    const transferInfo = transferDataLayout.decode(data);

    const lamportAmount = transferInfo.amount;
    let mint = MintParser(senderAtaInfo.info.mint, await connection.getAccountInfo(senderAtaInfo.info.mint));
    uiAction.amount = fromLamports(lamportAmount, mint.info);

    return uiAction;
  }

  async convertUIAction(ctx: ActionContext): Promise<Action> {
    let connection = ctx.connectionConfig.connection;
    let uiAction = ctx.action;
    const [pda, bump] = await PublicKey.findProgramAddress([ctx.wallet.publicKey.toBuffer()], new PublicKey(programIds().snowflake));
    let recipientAta = await getAssociatedTokenAddress(uiAction.token.mint, uiAction.recipient.wallet);
    let mint = MintParser(new PublicKey(uiAction.token.mint), await connection.getAccountInfo(new PublicKey(uiAction.token.mint)));
    console.log('recipientAta', recipientAta.toString());
    let lamportAmount = toLamports(+uiAction.amount, mint.info);
    let ix: TransactionInstruction = Token.createTransferInstruction(
      programIds().token,
      new PublicKey(uiAction.token.ata),
      recipientAta,
      pda, // authority
      [],
      lamportAmount
    );
    let action = flowActionUtil.cloneActionBase(uiAction);

    flowActionUtil.pushInstruction(ix, action);
    return action;
  }

  editComponent = ({ uiFlow, action, updateState }: UIContext) => {
    const { Option } = Select;
    const uiAction = action;
    const handleChange = (obj, fieldType?) => e => {
      _.set(obj, e.target.name, e.target.value);
      updateState();
    };

    const walletCtx = useWallet();
    const connection = useConnection();
    useEffect(() => {
      if (!action.token) uiAction.token = {};
      if (!action.recipient) uiAction.recipient = {};
      updateState();
    }, []);

    return (
      <span>
        <FormItem label="Amount" validators={[new FieldRequire('Amount is required.')]} validate={uiAction.amount}>
          <div style={{ display: 'flex' }}>
            <Input name="amount" value={uiAction.amount} onChange={handleChange(uiAction)} />
            &nbsp;
            <TokenInput token={uiAction.token} handleChange={updateState} showNativeSol={false} />
          </div>
        </FormItem>
        <FormItem label="Pay To" validators={[new FieldRequire('Recipient is required.'), new FieldIsPubKey()]} validate={uiAction.recipient.wallet}>
          <Input name="wallet" value={uiAction.recipient.wallet} onChange={handleChange(uiAction.recipient)} />
        </FormItem>
        <Form.Item label=" " className="blankLabel" wrapperCol={{ span: 20 }}>
          <Checkbox checked={true} disabled /> <span style={{ color: 'grey' }}>Approve for Snowflake program to perform future transfers of your {useTokenName(uiAction.token.mint)} token.</span>
        </Form.Item>
      </span>
    );
  };

  initNewAction(action) {
    if (!action.recipient) action.recipient = {};
    if (!action.token) action.token = { mint: 'So11111111111111111111111111111111111111112' };
  }

  async outputInstructions(ctx: ActionContext): Promise<OutputIXSet[]> {
    let outputIxs: OutputIXSet[] = [];
    const [sourceAta, createSourceAta] = await createAssociatedTokenAccountIfNotExist(ctx.wallet.publicKey, ctx.wallet.publicKey, new PublicKey(ctx.action.token.mint), ctx.connectionConfig.connection);
    outputIxs.push(OutputIXSet.fromAtaIx(sourceAta, createSourceAta));

    const [recepientAta, createReceipientAta] = await createAssociatedTokenAccountIfNotExist(
      new PublicKey(ctx.action.recipient.wallet),
      ctx.wallet.publicKey,
      new PublicKey(ctx.action.token.mint),
      ctx.connectionConfig.connection
    );
    outputIxs.push(OutputIXSet.fromAtaIx(recepientAta, createReceipientAta));

    const authorizeSourceAta = await authorizeFullBalance(ctx.wallet.publicKey, sourceAta, ctx.connectionConfig.connection);
    outputIxs.push(OutputIXSet.fromAuthorizeIx(sourceAta, 'max', authorizeSourceAta));
    return outputIxs;
  }
}
