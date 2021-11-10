import { Action, ActionContext, FlowActionResolver, OutputIXSet, UIAction, UIContext } from '../../models/flowAction';
import { Button, Form, Input, Select } from 'antd';
import _ from 'lodash';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons/lib';
import React from 'react';
import { toPublicKey } from '../../utils/snowUtils';

export class BlankAction implements FlowActionResolver {
  code = 999;

  async convertAction(ctx: ActionContext): Promise<UIAction> {
    let uiAction = _.cloneDeep(ctx.action);

    return uiAction;
  }

  async convertUIAction(ctx: ActionContext): Promise<Action> {
    let action = _.cloneDeep(ctx.action);

    return action;
  }

  editComponent = (ctx: UIContext) => {
    const { Option } = Select;

    return <span>TBD</span>;
  };

  initNewAction(action) {}

  outputInstructions(ctx: ActionContext): Promise<OutputIXSet[]> {
    return Promise.resolve([]);
  }
}
