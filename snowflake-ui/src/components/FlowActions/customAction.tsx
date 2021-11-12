import { Action, ActionContext, FlowActionResolver, OutputIXSet, UIAction, UIContext } from '../../models/flowAction';
import { Button, Form, Input, Select } from 'antd';
import _ from 'lodash';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons/lib';
import React from 'react';
import { toPublicKey } from '../../utils/snowUtils';
import * as actionUtil from '../../utils/flowActionUtil';

export class CustomAction implements FlowActionResolver {
  async newAction(): Promise<UIAction> {
    const action: UIAction = { name: 'basic_action', actionCode: actionUtil.ACTION_TYPES.customAction.code, accounts: [] };
    action.accounts = [{ isSigner: false, isWritable: false }];
    return action;
  }

  code = 100;

  async convertAction(ctx: ActionContext): Promise<UIAction> {
    let uiAction = _.cloneDeep(ctx.action);
    uiAction.instruction = uiAction.instruction ? Buffer.from(uiAction.instruction).toString('hex') : '';

    // convert PublicKey type to key string
    uiAction.program = uiAction.program ? uiAction.program.toString() : '';

    uiAction.accounts.map(account => {
      account.pubkey = account.pubkey ? account.pubkey.toString() : '';
    });
    return uiAction;
  }

  async convertUIAction(ctx: ActionContext): Promise<Action> {
    let action = _.cloneDeep(ctx.action);
    // convert instruction from hex to binary
    if (action.instruction) {
      action.instruction = Buffer.from(action.instruction, 'hex');
    }

    // convert key string field to PublicKey
    const programPublicKey = toPublicKey(action.program);
    if (programPublicKey) action.program = programPublicKey;

    action.accounts.map(account => {
      const accountPublicKey = toPublicKey(account.pubkey);
      if (accountPublicKey) account.pubkey = accountPublicKey;
    });
    return action;
  }

  editComponent = (ctx: UIContext) => {
    const { Option } = Select;
    const handleChange = (obj, fieldType?) => e => {
      _.set(obj, e.target.name, e.target.value);
      ctx.updateState();
    };
    const removeAccount = (accounts, i) => e => {
      accounts.splice(i, 1);
      ctx.updateState();
    };
    let initialAccount = { isSigner: false, isWritable: false };
    const addAccount = accounts => e => {
      accounts.push(initialAccount);
      ctx.updateState();
    };

    return (
      <span>
        <Form.Item label="Program" rules={[{ required: false, message: 'Instruction is required' }]}>
          <Input name="program" value={ctx.action.program} onChange={handleChange(ctx.action)} />
        </Form.Item>
        <Form.Item label="Instruction" rules={[{ required: false, message: 'Instruction is required' }]}>
          <Input name="instruction" value={ctx.action.instruction} onChange={handleChange(ctx.action)} />
        </Form.Item>
        {ctx.action.accounts.map(function (account, j) {
          return (
            <span>
              <Form.Item label={'Account ' + (j + 1)} rules={[{ required: false, message: 'Instruction is required' }]}>
                <Input name="pubkey" value={account.pubkey} onChange={handleChange(account)} style={{ marginRight: '-20px' }} />
                <div style={{ float: 'right', marginRight: '-30px', marginTop: '4px' }}>{<MinusCircleOutlined onClick={removeAccount(ctx.action.accounts, j)} />}</div>
              </Form.Item>
            </span>
          );
        })}

        <Form.Item label=" " className="blankLabel">
          <Button type="dashed" block icon={<PlusOutlined />} onClick={addAccount(ctx.action.accounts)}>
            More Account
          </Button>
        </Form.Item>
      </span>
    );
  };

  initNewAction(action) {
    action.accounts = [{ isSigner: false, isWritable: false }];
  }

  outputInstructions(ctx: ActionContext): Promise<OutputIXSet[]> {
    return Promise.resolve([]);
  }
}
