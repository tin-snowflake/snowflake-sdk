import { Action, ActionContext, FlowActionResolver, OutputIXSet, UIAction, UIContext } from '../../models/flowAction';
import { Form, Select } from 'antd';
import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import * as flowActionUtil from '../../utils/flowActionUtil';
import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { TokenAccount } from '../../models';
import { MintParser, TokenAccountParser } from '../../contexts/accounts';
import BufferLayout from 'buffer-layout';
import * as Layout from '../../utils/layout';
import { fromLamports, toLamports } from '../../utils/utils';
import { programIds } from '../../utils/ids';
import { authorizeFullBalance, createAssociatedTokenAccountIfNotExist, getAssociatedTokenAddress } from '../../utils/tokens';
import { Token } from '@solana/spl-token';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnectionConfig } from '../../contexts/connection';
import { getOrca, getTokens, Network, ORCA_TOKEN_SWAP_ID_DEVNET, OrcaPoolConfig, U64Utils } from '@orca-so/sdk';

import { initNewAction } from './SaberSwapAction';
import { handleSelectChange } from '../../utils/reactUtil';
import { ENV } from '../../utils/web3';
import Decimal from 'decimal.js';
import { getDevnetPool } from '@orca-so/sdk/dist/public/devnet';
import { orcaDevnetPoolConfigs } from '@orca-so/sdk/dist/constants/devnet';
import { createSwapInstruction } from '@orca-so/sdk/dist/public/utils/web3/instructions/pool-instructions';
import { Owner } from '@orca-so/sdk/dist/public/utils/web3/key-utils';
import { getSaberClient } from '../../integrations/saber/saberClient';
import { getOrcaClient } from '../../integrations/orca/orcaClient';

export class OrcaSwapAction implements FlowActionResolver {
  code = 105;

  async convertAction(ctx: ActionContext): Promise<UIAction> {
    let connection = ctx.connectionConfig.connection;
    let uiAction = flowActionUtil.cloneActionBase(ctx.action);
    const orcaClient = getOrcaClient(ctx.connectionConfig);
    const { amountIn, poolMint } = orcaClient.decodeSwapAction(ctx.action);
    uiAction.amountIn = amountIn;
    uiAction.selectedPoolId = poolMint.toString();
    return uiAction;
  }

  async convertUIAction(ctx: ActionContext): Promise<Action> {
    let connection = ctx.connectionConfig.connection;
    let uiAction = ctx.action;

    const orca = getOrca(connection, ctx.connectionConfig.env == ENV.devnet ? Network.DEVNET : Network.MAINNET); //
    const selectedPoolId = uiAction.selectedPoolId;
    let orcaClient = getOrcaClient(ctx.connectionConfig);
    const orcaPool = orcaClient.getOrcaPool(selectedPoolId);
    const inputToken = orcaPool.getTokenA();
    const amountIn = new Decimal(0.01);
    const quote = await orcaPool.getQuote(inputToken, amountIn);
    const minimumAmountOut = quote.getMinOutputAmount();
    let orcaConfig = orcaClient.getOrcaConfig(selectedPoolId);
    const { inputPoolToken, outputPoolToken } = getTokens(orcaConfig.poolParams, inputToken.mint.toString());
    const amountInU64 = U64Utils.toTokenU64(amountIn, inputPoolToken, 'amountIn');
    const minimumAmountOutU64 = U64Utils.toTokenU64(minimumAmountOut, outputPoolToken, 'minimumAmountOut');

    const [inputPoolTokenUserAddress, createInputPoolTokenUserAddress] = await createAssociatedTokenAccountIfNotExist(ctx.wallet.publicKey, ctx.wallet.publicKey, inputPoolToken.mint, connection);
    const [outputPoolTokenUserAddress, createOutputPoolTokenUserAddress] = await createAssociatedTokenAccountIfNotExist(ctx.wallet.publicKey, ctx.wallet.publicKey, outputPoolToken.mint, connection);

    const ix = await createSwapInstruction(
      orcaConfig.poolParams,
      new Owner(Keypair.generate()),
      inputPoolToken,
      inputPoolTokenUserAddress,
      outputPoolToken,
      outputPoolTokenUserAddress,
      amountInU64,
      minimumAmountOutU64,
      ctx.wallet.publicKey,
      orcaConfig.orcaTokenSwapId
    );

    /*
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
    );*/
    let action = flowActionUtil.cloneActionBase(uiAction);

    flowActionUtil.pushInstruction(ix.instructions[0], action);
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
    const connectionConfig = useConnectionConfig();

    /* function getOrcaConfig(swapPoolConfig: OrcaPoolConfig): OrcaConfig {
      const devnetConfig = getDevnetPool(swapPoolConfig);
      const poolConfig = orcaDevnetPoolConfigs[devnetConfig];
      const orcaTokenSwapId = ORCA_TOKEN_SWAP_ID_DEVNET;
      return {
        orcaTokenSwapId: orcaTokenSwapId,
        poolParams: poolConfig,
      };
    }*/
    const orcaClient = getOrcaClient(connectionConfig);
    const [pools, setPools] = useState([]);
    function initOrcaPools() {
      const pools = orcaClient.getPools();
      console.log(pools);
      setPools(pools);
    }

    async function init() {
      initNewAction(action);
      initOrcaPools();
      /*// swap params - swap pool.tokenA for pool.tokenB
      const swapPoolConfig = Object.values(OrcaPoolConfig);

      const orca = getOrca(connection, Network.DEVNET);
      const orcaPool = orca.getPool(swapPoolConfig);
      const inputToken = orcaPool.getTokenA();
      let orcaConfig = getOrcaConfig(swapPoolConfig);*/
    }
    useEffect(() => {
      init();
      updateState();
    }, []);

    return (
      <span>
        <Form.Item label="Pool">
          <Select value={action.selectedPoolId} onChange={value => handleSelectChange(action, 'selectedPoolId', value, updateState)}>
            {pools.map(pool => (
              <Option key={pool.poolId} value={pool.poolId}>
                {pool.tokenASymbol} - {pool.tokenBSymbol}
              </Option>
            ))}
          </Select>
        </Form.Item>
        {/*<FormItem label="Swap" validators={[new FieldRequire('Amount is required.')]} validate={uiAction.amount}>
          <div style={{ display: 'flex' }}>
            <Input name="amount" value={uiAction.amount} onChange={handleChange(uiAction)} />
            &nbsp;
            <TokenInput token={uiAction.token} handleChange={updateState} showNativeSol={false} />
          </div>
        </FormItem>
        <FormItem label="For" validators={[new FieldRequire('Amount is required.')]} validate={uiAction.amount}>
          <div style={{ display: 'flex' }}>
            <Input disabled name="outputAmount" value="" />
            &nbsp;
            <TokenInput token={uiAction.toToken} handleChange={updateState} showNativeSol={false} />
          </div>
        </FormItem>*/}
      </span>
    );
  };

  initNewAction(action) {
    action.token = { mint: 'So11111111111111111111111111111111111111112' };
    action.toToken = { mint: 'EmXq3Ni9gfudTiyNKzzYvpnQqnJEMRw2ttnVXoJXjLo1' };
    action.amount = 0;
  }

  async outputInstructions(ctx: ActionContext): Promise<OutputIXSet[]> {
    let outputIxs: OutputIXSet[] = [];
    /* const [sourceAta, createSourceAta] = await createAssociatedTokenAccountIfNotExist(ctx.wallet.publicKey, ctx.wallet.publicKey, new PublicKey(ctx.action.token.mint), ctx.connectionConfig.connection);
    outputIxs.push(OutputIXSet.fromAtaIx(sourceAta, createSourceAta));

    const [recepientAta, createReceipientAta] = await createAssociatedTokenAccountIfNotExist(
      new PublicKey(ctx.action.recipient.wallet),
      ctx.wallet.publicKey,
      new PublicKey(ctx.action.token.mint),
      ctx.connectionConfig.connection
    );
    outputIxs.push(OutputIXSet.fromAtaIx(recepientAta, createReceipientAta));

    const authorizeSourceAta = await authorizeFullBalance(ctx.wallet.publicKey, sourceAta, ctx.connectionConfig.connection);
    outputIxs.push(OutputIXSet.fromAuthorizeIx(sourceAta, 'max', authorizeSourceAta));*/
    return outputIxs;
  }
}
