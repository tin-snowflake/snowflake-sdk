import { Action, ActionContext, FlowActionResolver, OutputIXSet, UIAction, UIContext } from '../../models/flowAction';
import { Form, Input, Select } from 'antd';
import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import * as flowActionUtil from '../../utils/flowActionUtil';
import { Keypair, PublicKey } from '@solana/web3.js';
import { programIds } from '../../utils/ids';
import { authorizeFullBalance, createAssociatedTokenAccountIfNotExist } from '../../utils/tokens';
import { useConnectionConfig } from '../../contexts/connection';
import { getTokens, OrcaU64, U64Utils } from '@orca-so/sdk';

import { initNewAction } from './SaberSwapAction';
import { handleInputChange, handleSelectChange } from '../../utils/reactUtil';
import Decimal from 'decimal.js';
import { createSwapInstruction } from '@orca-so/sdk/dist/public/utils/web3/instructions/pool-instructions';
import { Owner } from '@orca-so/sdk/dist/public/utils/web3/key-utils';
import { getOrcaClient } from '../../integrations/orca/orcaClient';
import { FieldRequire, FormItem } from '../FormItem';
import { TokenInput } from '../TokenInput';
import { fromLamportsDecimals, toLamportsByDecimal } from '../../utils/utils';
import { TokenDisplay } from '../TokenDisplay';

export class OrcaSwapAction implements FlowActionResolver {
  code = 105;

  async convertAction(ctx: ActionContext): Promise<UIAction> {
    let connection = ctx.connectionConfig.connection;
    let uiAction = flowActionUtil.cloneActionBase(ctx.action);
    const orcaClient = getOrcaClient(ctx.connectionConfig);

    const { amountIn, poolMint } = orcaClient.decodeSwapAction(ctx.action);

    uiAction.selectedPoolId = poolMint.toString();
    const orcaPool = orcaClient.getOrcaPool(uiAction.selectedPoolId);
    uiAction.amountIn = fromLamportsDecimals(amountIn, orcaPool.getTokenA().scale);
    return uiAction;
  }

  async convertUIAction(ctx: ActionContext): Promise<Action> {
    let connection = ctx.connectionConfig.connection;
    let uiAction = ctx.action;
    const selectedPoolId = uiAction.selectedPoolId;
    let orcaClient = getOrcaClient(ctx.connectionConfig);
    const orcaPool = orcaClient.getOrcaPool(selectedPoolId);
    const inputToken = orcaPool.getTokenA();
    const amountIn = new Decimal(+uiAction.amountIn);
    const quote = await orcaPool.getQuote(inputToken, amountIn);
    let minimumAmountOut = quote.getMinOutputAmount();
    let orcaConfig = orcaClient.getOrcaConfig(selectedPoolId);
    const { inputPoolToken, outputPoolToken } = getTokens(orcaConfig.poolParams, inputToken.mint.toString());
    // overwrite min amount out to avoid slippage limit error
    minimumAmountOut = OrcaU64.fromNumber(0, outputPoolToken.scale);

    const amountInU64 = U64Utils.toTokenU64(amountIn, inputPoolToken, 'amountIn');
    const minimumAmountOutU64 = U64Utils.toTokenU64(minimumAmountOut, outputPoolToken, 'minimumAmountOut');

    const [inputPoolTokenUserAddress, createInputPoolTokenUserAddress] = await createAssociatedTokenAccountIfNotExist(ctx.wallet.publicKey, ctx.wallet.publicKey, inputPoolToken.mint, connection);
    const [outputPoolTokenUserAddress, createOutputPoolTokenUserAddress] = await createAssociatedTokenAccountIfNotExist(ctx.wallet.publicKey, ctx.wallet.publicKey, outputPoolToken.mint, connection);
    const [pda, bump] = await PublicKey.findProgramAddress([ctx.wallet.publicKey.toBuffer()], new PublicKey(programIds().snowflake));
    const ix = await createSwapInstruction(
      orcaConfig.poolParams,
      new Owner(Keypair.generate()),
      inputPoolToken,
      inputPoolTokenUserAddress,
      outputPoolToken,
      outputPoolTokenUserAddress,
      amountInU64,
      minimumAmountOutU64,
      pda,
      orcaConfig.orcaTokenSwapId
    );
    let action = flowActionUtil.cloneActionBase(uiAction);

    flowActionUtil.pushInstruction(ix.instructions[0], action);
    return action;
  }

  editComponent = ({ uiFlow, action, updateState }: UIContext) => {
    const { Option } = Select;
    const uiAction = action;

    const connectionConfig = useConnectionConfig();

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

      setTokenInputOutput();
      calculateExepectedAmount();
    }

    function setTokenInputOutput() {
      let orcaClient = getOrcaClient(connectionConfig);
      if (!uiAction.selectedPoolId) {
        uiAction.selectedPoolId = orcaClient.orcaPoolByPairKey('ORCA_USDC').poolId;
      }
      const orcaPool = orcaClient.getOrcaPool(uiAction.selectedPoolId);
      uiAction.inputToken = {
        symbol: orcaPool.getTokenA().name,
        name: orcaPool.getTokenA().tag,
        mint: orcaPool.getTokenA().mint.toString(),
      };
      uiAction.outputToken = {
        symbol: orcaPool.getTokenB().name,
        name: orcaPool.getTokenB().tag,
        mint: orcaPool.getTokenB().mint.toString(),
      };
    }

    async function calculateExepectedAmount() {
      const orcaPool = orcaClient.getOrcaPool(uiAction.selectedPoolId);
      const inputToken = orcaPool.getTokenA();
      const amountIn = OrcaU64.fromDecimal(new Decimal(+uiAction.amountIn), inputToken.scale);
      const quote = await orcaPool.getQuote(inputToken, amountIn);
      uiAction.expectedAmount = quote.getExpectedOutputAmount().toNumber();
      updateState();
    }
    useEffect(() => {
      init();
      updateState();
    }, []);

    useEffect(() => {
      const delayDebounceFn = setTimeout(() => {
        calculateExepectedAmount();
      }, 2000);

      return () => clearTimeout(delayDebounceFn);
    }, [uiAction.amountIn]);

    return (
      <span>
        <Form.Item label="Pool">
          <Select
            value={action.selectedPoolId}
            onChange={value => {
              handleSelectChange(action, 'selectedPoolId', value);
              setTokenInputOutput();
              updateState();
            }}>
            {pools.map(pool => (
              <Option key={pool.poolId} value={pool.poolId}>
                {pool.tokenASymbol} - {pool.tokenBSymbol}
              </Option>
            ))}
          </Select>
        </Form.Item>
        {action.selectedPoolId && uiAction.inputToken && uiAction.outputToken && (
          <span>
            <FormItem label="Input" validators={[new FieldRequire('Amount is required.')]} validate={uiAction.amountIn}>
              <div style={{ display: 'flex' }}>
                <Input
                  name="amountIn"
                  value={uiAction.amountIn}
                  onChange={handleInputChange(uiAction, () => {
                    uiAction.expectedAmount = 'calculating ...';
                    updateState();
                  })}
                />
                &nbsp;
                <TokenDisplay name={uiAction.inputToken.symbol} mintAddress={uiAction.inputToken.mint} />
              </div>
            </FormItem>

            <Form.Item label="Est. Output">
              <div style={{ display: 'flex' }}>
                <Input name="expectedAmount" value={uiAction.expectedAmount} disabled={true} />
                &nbsp;
                <TokenDisplay name={uiAction.outputToken.symbol} mintAddress={uiAction.outputToken.mint} />
              </div>
            </Form.Item>
          </span>
        )}
      </span>
    );
  };

  initNewAction(action) {}

  async outputInstructions(ctx: ActionContext): Promise<OutputIXSet[]> {
    let outputIxs: OutputIXSet[] = [];
    let uiAction = ctx.action;
    let connection = ctx.connectionConfig.connection;
    const selectedPoolId = uiAction.selectedPoolId;
    let orcaClient = getOrcaClient(ctx.connectionConfig);
    const orcaPool = orcaClient.getOrcaPool(selectedPoolId);
    const inputToken = orcaPool.getTokenA();
    let orcaConfig = orcaClient.getOrcaConfig(selectedPoolId);
    const { inputPoolToken, outputPoolToken } = getTokens(orcaConfig.poolParams, inputToken.mint.toString());

    const [inputPoolTokenUserAddress, createInputPoolTokenUserAddress] = await createAssociatedTokenAccountIfNotExist(ctx.wallet.publicKey, ctx.wallet.publicKey, inputPoolToken.mint, connection);
    const [outputPoolTokenUserAddress, createOutputPoolTokenUserAddress] = await createAssociatedTokenAccountIfNotExist(ctx.wallet.publicKey, ctx.wallet.publicKey, outputPoolToken.mint, connection);

    outputIxs.push(OutputIXSet.fromAtaIx(inputPoolTokenUserAddress, createInputPoolTokenUserAddress));
    outputIxs.push(OutputIXSet.fromAtaIx(outputPoolTokenUserAddress, createOutputPoolTokenUserAddress));

    const authorizeSourceAta = await authorizeFullBalance(ctx.wallet.publicKey, inputPoolTokenUserAddress, ctx.connectionConfig.connection);
    outputIxs.push(OutputIXSet.fromAuthorizeIx(inputPoolTokenUserAddress, 'balance', authorizeSourceAta));

    return outputIxs;
  }
}
