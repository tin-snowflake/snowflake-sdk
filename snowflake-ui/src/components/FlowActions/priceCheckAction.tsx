import { Action, ActionContext, FlowActionResolver, OutputIXSet, UIAction, UIContext } from '../../models/flowAction';
import { Button, Form, Input, Select } from 'antd';
import _ from 'lodash';
import React, { useEffect } from 'react';
import { toPublicKey } from '../../utils/snowUtils';
import * as flowActionUtil from '../../utils/flowActionUtil';

import { FieldIsPubKey, FieldRequire, FormItem } from '../FormItem';
import BN from 'bn.js';
import {PRICE_CHECKER_PROGRAM_ID} from '../../utils/ids';

export class PriceCheckAction implements FlowActionResolver {
  code = 104;

  async convertAction(ctx: ActionContext): Promise<UIAction> {
    let action = ctx.action;
    let uiAction = flowActionUtil.cloneActionBase(action);

    uiAction.priceAccount = '';
    if (action.accounts && action.accounts.length > 0) {
      const firstAccount = action.accounts[0];
      uiAction.priceAccount = firstAccount.pubkey ? firstAccount.pubkey.toString() : '';
    }

    const priceCondition = this.instructionToPriceCondition(action.instruction);
    if (priceCondition) {
      uiAction.condition = priceCondition.condition;
      uiAction.targetPrice = priceCondition.price;
    }

    return uiAction;
  }

  async convertUIAction(ctx: ActionContext): Promise<Action> {

    let uiAction = ctx.action;
    let action = flowActionUtil.cloneActionBase(uiAction);

    console.log('UI action: ', uiAction);
    

    action.program = PRICE_CHECKER_PROGRAM_ID;
    action.accounts = [{pubkey: toPublicKey(uiAction.priceAccount), isSigner: false, isWritable: false }];
    action.instruction = this.priceConditionToInstruction(uiAction.targetPrice, uiAction.condition);

    return action;
  }

  editComponent = (ctx: UIContext) => {
    const { Option } = Select;
    const uiAction = ctx.action;

    const handleChange = (obj) => e => {
      _.set(obj, e.target.name, e.target.value);
      ctx.updateState();
    };

    const handleSelectChange = (object, field, value) => {
      _.set(object, field, value);
      ctx.updateState();
    };

    const priceAccounts = [
      {label:'BTC/USD', value:'HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J'},
      {label:'ETH/USD', value:'EdVCmQ9FSPcVe5YySXDPCRmc8aDQLKJ9xvYBMZPie1Vw'},
      {label:'SOL/USD', value:'J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix'},
      {label:'UST/USD', value:'AUKjh1oVPZyudi3nzYSsdZxSjq42afUCvsdbKFc5CbD'},
      {label:'BCH/USD', value:'4EQrNZYk5KR1RnjyzbaaRbHsv8VqZWzSUtvx58wLsZbj'},
      {label:'RAY/USD', value:'EhgAdTrgxi4ZoVZLQx1n93vULucPpiFi2BQtz9RJr1y6'},
      {label:'ORCA/USD', value:'A1WttWF7X3Rg6ZRpB2YQUFHCRh1kiXV8sKKLV3S9neJV'},
      {label:'SRM/USD', value:'992moaMQKs32GKZ9dxi8keyM2bUmbrwBZpK4p2K6X5Vs'},
      {label:'BNB/USD', value:'GwzBgrXb4PG59zjce24SF2b9JXbLEjJJTBkmytuEZj1b'},
      {label:'DOGE/USD', value:'4L6YhY8VvUgmqG5MvJkUJATtzB2rFqdrJwQCmFLv4Jzy'},
      {label:'LUNA/USD', value:'8PugCXTAHLM9kfLSQWe2njE5pzAgUdpPk3Nx5zSm7BD3'},
      {label:'MER/USD', value:'6Z3ejn8DCWQFBuAcw29d3A5jgahEpmycn7YDMX7yRNrn'},
      {label:'FTT/USD', value:'6vivTRs5ZPeeXbjo7dfburfaYDWoXjBtdtuYgQRuGfu'},
      {label:'SBR/USD', value:'4WSN3XDSTfBX9A1YXGg8HJ7n2GtWMDNbtz1ab6aGGXfG'},
      {label:'HXRO/USD', value:'6VrSw4Vxg5zs9shfdCxLqfUy2qSD3NCS9AsdBQUgbjnt'},
      {label:'MIR/USD', value:'4BDvhA5emySfqyyTHPHofTJqRw1cwDabK1yiEshetPv9'},
      {label:'SNY/USD', value:'DEmEX28EgrdQEBwNXdfMsDoJWZXCHRS5pbgmJiTkjCRH'},
      {label:'MNGO/USD', value:'DCNw5mwZgjfTcoNsSZWUiXqU61ushNvr3JRQJRi1Nf95'},
      {label:'ATOM/USD', value:'7YAze8qFUMkBnyLVdKT4TFUUFui99EwS5gfRArMcrvFk'},
      {label:'ADA/USD', value:'8oGTURNmSQkrBS1AQ5NjB2p8qY34UVmMA9ojrw8vnHus'},
      {label:'DOT/USD', value:'4dqq5VBpN4EwYb7wyywjjfknvMKu7m78j9mKZRXTj462'},
      {label:'MSOL/USD', value:'9a6RNx3tCu1TSs6TBSfV2XRXEPEZXQ6WB7jRojZRvyeZ'},
    ];

    const priceConditionOptions = [
      {value: 1, label: 'Greater than or equal to'},
      {value: -1, label: 'Less than or equal to'}
    ];

    return (
      <span>
        <FormItem label="Price Account" validators={[new FieldRequire(), new FieldIsPubKey()]} validate={uiAction.priceAccount}>
          <Select options={priceAccounts} value={uiAction.priceAccount} onChange={value => handleSelectChange(uiAction, 'priceAccount', value)}/> 
        </FormItem>

        <FormItem label="Condition" validators={[new FieldRequire()]} validate={uiAction.targetPrice}>
        <div style={{ display: 'flex' }}>
          <Select options={priceConditionOptions} value={uiAction.condition} onChange={value => handleSelectChange(uiAction, 'condition', value)}/> 
          &nbsp;
          <Input name="targetPrice" value={uiAction.targetPrice} onChange={handleChange(uiAction)} />
        </div>
        </FormItem>
      </span>
    );
  };

  initNewAction(action) {
    action.accounts = [{ isSigner: false, isWritable: false }];
  }

  outputInstructions(ctx: ActionContext): Promise<OutputIXSet[]> {
    return Promise.resolve([]);
  }

  instructionToPriceCondition(instruction: Buffer): { price: number, condition: number } | null {
    if (instruction.length != 10) {
      return null;
    }

    let priceSlice = new Uint8Array(instruction.slice(0, 8));
    let priceBn = new BN(priceSlice, "le");

    let remainingBytes = new Int8Array(instruction.slice(8));
    let exponent = remainingBytes[0];
    let condition = remainingBytes[1];

    let price = priceBn.toNumber() * Math.pow(10, exponent);
    return { price, condition };
  }

  priceConditionToInstruction(price: number, condition: number): Buffer {
    let parts = price.toString().split('.');
    let exponent = 0;
    if (parts.length == 2) {
      exponent = -parts[1].length;
    }

    let priceBn = price * Math.pow(10, -exponent);

    return Buffer.from(Int8Array.of(...new BN(priceBn).toArray("le", 8), exponent, condition));
  }
}