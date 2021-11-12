import { Action, ActionContext, FlowActionResolver, OutputIXSet, UIAction, UIContext } from '../../models/flowAction';
import { Button, Form, Input, Select } from 'antd';
import _ from 'lodash';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons/lib';
import React, { useEffect } from 'react';
import { toPublicKey } from '../../utils/snowUtils';
import * as flowActionUtil from '../../utils/flowActionUtil';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { TokenAccount } from '../../models';
import { MintParser, TokenAccountParser } from '../../contexts/accounts';
import BufferLayout from 'buffer-layout';
import * as Layout from '../../utils/layout';
import { fromLamports, toLamports } from '../../utils/utils';
import { programIds } from '../../utils/ids';
import { authorizeMax, createAssociatedTokenAccountIfNotExist, getAssociatedTokenAddress } from '../../utils/tokens';
import { Token } from '@solana/spl-token';
import { useWallet } from '@solana/wallet-adapter-react';
import { sendTransaction, useConnection } from '../../contexts/connection';
import { notify } from '../../utils/notifications';
import { TokenInput } from '../TokenInput';
import * as actionUtil from '../../utils/flowActionUtil';

export class PaymentAction implements FlowActionResolver {
  code = 101;

  async convertAction(ctx: ActionContext): Promise<UIAction> {
    let connection = ctx.connectionConfig.connection;
    let action = ctx.action;
    let uiAction = flowActionUtil.cloneActionBase(action);
    uiAction.token = { mint: '', ata: action.accounts[0].pubkey.toString() };
    let senderAtaAccount = await connection.getAccountInfo(new PublicKey(uiAction.token.ata));
    console.log('senderAtaAccount', senderAtaAccount);
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

    async function authorise() {
      let approveIx = await createAuthorizeInstruction(walletCtx, uiAction);
      let instructions: TransactionInstruction[] = [approveIx];
      let txn = await sendTransaction(connection, walletCtx, instructions, []);
      notify({
        message: 'Sucess !',
        type: 'success',
        description: 'Transaction ' + txn,
      });
    }
    return (
      <span>
        <Form.Item label="Amount" rules={[{ required: false, message: 'Instruction is required' }]}>
          <div style={{ display: 'flex' }}>
            <Input name="amount" value={uiAction.amount} onChange={handleChange(uiAction)} />
            &nbsp;
            <TokenInput token={uiAction.token} handleChange={updateState} />
          </div>
        </Form.Item>
        <Form.Item label="Pay To" rules={[{ required: false, message: 'Instruction is required' }]}>
          <Input name="wallet" value={uiAction.recipient.wallet} onChange={handleChange(uiAction.recipient)} />
        </Form.Item>

        {/*<Button type="default" size="large" onClick={authorise}>
        Authorise
      </Button>*/}
      </span>
    );
  };

  initNewAction(action) {
    if (!action.recipient) action.recipient = {};
    if (!action.token) action.token = {};
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

    const authorizeSourceAta = await authorizeMax(ctx.wallet.publicKey, sourceAta);
    outputIxs.push(OutputIXSet.fromAuthorizeIx(sourceAta, 'max', authorizeSourceAta));
    return outputIxs;
  }
}

async function createAuthorizeInstruction(wallet, uiAction) {
  const [pda, bump] = await PublicKey.findProgramAddress([wallet.publicKey.toBuffer()], new PublicKey(programIds().snowflake));
  let maxAmount = Math.floor(9 * Math.pow(10, 12));
  let approveIx = Token.createApproveInstruction(programIds().token, new PublicKey(uiAction.token.ata), pda, wallet.publicKey, [], maxAmount);
  return approveIx;
}
