import { Action, ActionContext, FlowActionResolver, OutputIXSet, UIAction, UIContext } from '../../models/flowAction';
import { Form, Input, Select } from 'antd';
import React from 'react';
import * as flowActionUtil from '../../utils/flowActionUtil';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { useConnectionConfig } from '../../contexts/connection';
import { getSaberClient } from '../../integrations/saber/saberClient';
import BufferLayout from 'buffer-layout';
import * as Layout from '../../utils/layout';
import { MintParser } from '../../contexts/accounts';
import { fromLamports, toLamports } from '../../utils/utils';
import { programIds } from '../../utils/ids';
import { Token, u64 } from '@solana/spl-token';
import { StableSwap } from '@saberhq/stableswap-sdk/dist';
import { authorizeMax, createAssociatedTokenAccountIfNotExist, getAssociatedTokenAddress } from '../../utils/tokens';
import _ from 'lodash';
import { handleInputChange, handleSelectChange } from '../../utils/reactUtil';

export class SaberPoolWithdrawAction implements FlowActionResolver {
  code = 102;

  async convertAction(ctx: ActionContext): Promise<UIAction> {
    let connection = ctx.connectionConfig.connection;
    let uiAction = flowActionUtil.cloneActionBase(ctx.action);

    // conversion code
    const lpTokenPubKey = ctx.action.accounts[3].pubkey;

    let saberClient = getSaberClient(ctx.connectionConfig.env);
    uiAction.selectedPoolId = saberClient.findPoolByLPToken(lpTokenPubKey).id;

    const data = Buffer.from(ctx.action.instruction);
    const info = saberClient.decodePoolWithdrawData(data);
    let mint = MintParser(lpTokenPubKey, await connection.getAccountInfo(lpTokenPubKey));
    uiAction.amount = fromLamports(info.poolTokenAmount, mint.info);
    return uiAction;
  }

  async convertUIAction(ctx: ActionContext): Promise<Action> {
    let connection = ctx.connectionConfig.connection;
    let uiAction = ctx.action;
    // conversion code

    let saberClient = getSaberClient(ctx.connectionConfig.env);
    let pool = saberClient.findPoolById(uiAction.selectedPoolId);

    const [pda, bump] = await PublicKey.findProgramAddress([ctx.wallet.publicKey.toBuffer()], new PublicKey(programIds().snowflake));
    const userAuthority = pda;
    let userAccountA = await getAssociatedTokenAddress(pool.tokens[0].address, ctx.wallet.publicKey.toString());
    const userAccountB = await getAssociatedTokenAddress(pool.tokens[1].address, ctx.wallet.publicKey.toString());
    const sourceAccount = await getAssociatedTokenAddress(pool.lpToken.address, ctx.wallet.publicKey.toString());
    let lpMint = new PublicKey(pool.lpToken.address);
    let mint = MintParser(lpMint, await connection.getAccountInfo(lpMint));

    const poolTokenAmount = new u64(toLamports(+uiAction.amount, mint.info));
    const minimumTokenA = new u64(0);
    const minimumTokenB = new u64(0);
    const params = { userAuthority, userAccountA, userAccountB, sourceAccount, poolTokenAmount, minimumTokenA, minimumTokenB };
    const stableSwap = await StableSwap.load(connection, new PublicKey(pool.swap.config.swapAccount), new PublicKey(pool.swap.config.swapProgramID));
    const ix = stableSwap.withdraw(params);

    let action = flowActionUtil.cloneActionBase(uiAction);
    flowActionUtil.pushInstruction(ix, action);
    return action;
  }

  initNewAction(action) {}

  async outputInstructions(ctx: ActionContext): Promise<OutputIXSet[]> {
    let outputIxs: OutputIXSet[] = [];
    let uiAction = ctx.action;
    let connection = ctx.connectionConfig.connection;
    let saberClient = getSaberClient(ctx.connectionConfig.env);
    let pool = saberClient.findPoolById(uiAction.selectedPoolId);

    const [ataA, createTokenA] = await createAssociatedTokenAccountIfNotExist(ctx.wallet.publicKey, ctx.wallet.publicKey, new PublicKey(pool.tokens[0].address), connection);
    outputIxs.push(OutputIXSet.fromAtaIx(ataA, createTokenA));

    const [ataB, createTokenB] = await createAssociatedTokenAccountIfNotExist(ctx.wallet.publicKey, ctx.wallet.publicKey, new PublicKey(pool.tokens[1].address), connection);
    outputIxs.push(OutputIXSet.fromAtaIx(ataB, createTokenB));

    const [ataLp, createLP] = await createAssociatedTokenAccountIfNotExist(ctx.wallet.publicKey, ctx.wallet.publicKey, new PublicKey(pool.lpToken.address), connection);
    outputIxs.push(OutputIXSet.fromAtaIx(ataLp, createLP));

    const authorizeLPToken = await authorizeMax(ctx.wallet.publicKey, ataLp);
    outputIxs.push(OutputIXSet.fromAuthorizeIx(ataLp, 'max', authorizeLPToken));
    return outputIxs;
  }

  editComponent = ({ uiFlow, action, updateState }: UIContext) => {
    const connectionConfig = useConnectionConfig();
    let saberClient = getSaberClient(connectionConfig.env);
    const { Option } = Select;

    return (
      <span>
        <Form.Item label="Pool">
          <Select value={action.selectedPoolId} onChange={value => handleSelectChange(action, 'selectedPoolId', value, updateState)}>
            {saberClient.getPools().map(pool => (
              <Option value={pool.id}>
                <img className="itemSelecIcon" src={pool.tokenIcons[0].logoURI} /> - <img className="itemSelecIcon" src={pool.tokenIcons[1].logoURI} />
                &nbsp;&nbsp;&nbsp;
                {pool.name}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="Amount">
          <Input name="amount" value={action.amount} onChange={handleInputChange(action, updateState)} />
        </Form.Item>
      </span>
    );
  };
}
