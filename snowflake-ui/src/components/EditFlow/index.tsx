import React, { useEffect, useState } from 'react';
import { useAnchor, useAnchorProgram } from '../../contexts/anchorContext';
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button, Card, DatePicker, Divider, Form, Input, PageHeader, Select, Skeleton, Space } from 'antd';
import { Link, useHistory, useLocation, useParams } from 'react-router-dom';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons/lib';
import _ from 'lodash';
import * as flowUtil from '../../utils/flowUtil';
import * as actionUtil from '../../utils/flowActionUtil';
import * as flowActionUtil from '../../utils/flowActionUtil';
import { MdOutlineArrowCircleUp, MdOutlineInfo, MdOutlineOfflineBolt } from 'react-icons/all';
import { useConnectionConfig } from '../../contexts/connection';
import { SensitiveButton } from '../SensitiveButton';
import { ActionContext } from '../../models/flowAction';
import { SmartTxnClient } from '../../utils/smartTxnClient';
import { handleInputChange, handleSelectChange } from '../../utils/reactUtil';
import { ScheduleRepeatOption } from '../../models/flow';
import moment from 'moment';

export const EditFlow = ({}) => {
  const program = useAnchorProgram();
  const anchor = useAnchor();
  const history = useHistory();
  const walletCtx = useWallet();
  const connectionConfig = useConnectionConfig();

  const { flowKey } = useParams<{ flowKey: string }>();

  const [debug, setDebug] = useState(false);
  function useQuery() {
    const { search } = useLocation();
    return React.useMemo(() => new URLSearchParams(search), [search]);
  }
  let query = useQuery();

  let defaultScheduleTime = moment().add(1, 'week'); // 1 week from now
  let initialFlow: any = { name: 'My first automation', repeatOption: ScheduleRepeatOption.No, nextExecutionTime: defaultScheduleTime, actions: [] };
  let [uiFlow, setUIFlow] = useState(initialFlow);

  async function init() {
    setDebug(query.get('debug') ? true : false);
    if (flowKey) {
      setLoading(true);
      let fetchedFlow = await program.account.flow.fetch(new PublicKey(flowKey));
      uiFlow = await flowUtil.convertFlow(fetchedFlow, connectionConfig, walletCtx, true);
      updateState();
      dto.flow = fetchedFlow;
      uiFlow = await flowUtil.convertFlow(fetchedFlow, connectionConfig, walletCtx);
      setLoading(false);
    } else {
      initialFlow.actions = [newDefaultAction()];
    }
    updateState();
  }

  function newDefaultAction() {
    const action = { name: 'basic_action', actionCode: actionUtil.ACTION_TYPES.paymentAction.code, accounts: [] };
    flowActionUtil.ACTION_TYPES.paymentAction.initNewAction(action);
    return action;
  }
  function isNewFlow() {
    return !flowKey;
  }
  async function prepareFlowForSave() {
    flow = await flowUtil.convertUIFlow(uiFlow, connectionConfig, walletCtx);
    dto.flow = flow;
  }

  async function prepareFlow() {
    await prepareFlowForSave();
    updateState();
  }
  let [loading, setLoading] = useState(false);
  useEffect(() => {
    init();
  }, []);

  const onFinish = (values: any) => {
    console.log('Success:', values);
  };

  const onFinishFailed = (errorInfo: any) => {
    console.log('Failed:', errorInfo);
  };

  async function collectActionInstructions(): Promise<TransactionInstruction[]> {
    let ixs: TransactionInstruction[] = [];
    for (const action of uiFlow.actions) {
      const actionType = flowActionUtil.actionTypeFromCode(action.actionCode);
      let actionContext: ActionContext = { action: action, connectionConfig: connectionConfig, wallet: walletCtx };
      let outputIxs = await actionType.outputInstructions(actionContext);
      for (const outputIx of outputIxs) {
        ixs = ixs.concat(outputIx.ixs);
      }
    }
    return ixs;
  }

  async function saveFlow() {
    let isNewFlow = !flowKey;
    let instructions: TransactionInstruction[] = await collectActionInstructions();
    await prepareFlowForSave();
    let tx;
    let keyUsed;
    if (isNewFlow) {
      let newFlowKeyPair = anchor.web3.Keypair.generate();
      keyUsed = newFlowKeyPair.publicKey;
      let createContext: any = {
        accounts: {
          flow: newFlowKeyPair.publicKey,
          flowOwner: walletCtx.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [newFlowKeyPair], // to be removed, singers no longer needs to be declared here since we're not using anchor for sending txn
      };
      /* if (instructions.length > 0) createContext.instructions = instructions;
      tx = await program.instruction.createFlow(flow, createContext);*/

      const createIx = await program.instruction.createFlow(flow, createContext);
      const ixs = [...instructions, createIx];
      await new SmartTxnClient(connectionConfig, ixs, [newFlowKeyPair], walletCtx).send();
    } else {
      keyUsed = flowKey;
      console.log('sending flow to save', flow);
      let updateContext: any = {
        accounts: {
          flow: new PublicKey(flowKey),
        },
        signers: [],
      };
      /*if (instructions.length > 0) updateContext.instructions = instructions;
      tx = await program.rpc.updateFlow(flow, updateContext);*/

      const updateIx = await program.instruction.updateFlow(flow, updateContext);
      const ixs = [...instructions, updateIx];
      await new SmartTxnClient(connectionConfig, ixs, [], walletCtx).send();
    }
    history.push('/flowDetail/' + keyUsed);
  }

  let initialDto: any = {};
  const [dto, setDto] = useState(initialDto);

  let flow: any = {};

  const handleChange = (obj, fieldType?) => e => {
    _.set(obj, e.target.name, e.target.value);
    updateState();
  };

  const addAction = actions => e => {
    actions.push(newDefaultAction());
    updateState();
  };

  const removeAccount = (accounts, i) => e => {
    accounts.splice(i, 1);
    updateState();
  };

  const removeAction = (actions, i) => e => {
    actions.splice(i, 1);
    updateState();
  };

  function updateState() {
    setUIFlow({ ...uiFlow });
  }
  const { Option } = Select;
  return (
    <span style={{ width: '100%' }}>
      <PageHeader ghost={false} title={<div style={{ display: 'flex', alignItems: 'center' }}>{isNewFlow() ? 'New Automation' : <span>Edit Automation</span>}</div>}></PageHeader>
      <div className="card">
        <div className="card-body">
          <Form
            style={{ maxWidth: '800px' }}
            name="basic"
            labelAlign="left"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 12 }}
            initialValues={{ remember: true }}
            onFinish={onFinish}
            requiredMark={false}
            onFinishFailed={onFinishFailed}
            autoComplete="off">
            <Card
              title={
                <div className="iconAndText">
                  <MdOutlineInfo /> Info
                </div>
              }
              size="small">
              <Form.Item label="Name" rules={[{ required: true, message: 'Name is required' }]}>
                <Input name="name" value={uiFlow.name} onChange={handleChange(uiFlow)} />
              </Form.Item>
            </Card>
            <Card
              title={
                <div className="iconAndText">
                  <MdOutlineOfflineBolt /> Trigger
                </div>
              }
              size="small">
              <Skeleton loading={false} active>
                <Form.Item label="Trigger Type">
                  <Select defaultValue="Time">
                    <Option value="Time">Time</Option>
                    <Option value="PE">Price Event</Option>
                    <Option value="OE">Onchain Event</Option>
                    <Option value="EE">External Event</Option>
                  </Select>
                </Form.Item>
                <Form.Item label="Schedule At" rules={[{ required: false, message: 'Trigger is required' }]}>
                  <DatePicker
                    style={{ width: '100%' }}
                    format="MMMM D, YYYY  h:mm a"
                    showTime={true}
                    name="trigger"
                    value={uiFlow.nextExecutionTime}
                    onChange={(date, dateString) => {
                      uiFlow.nextExecutionTime = date;
                      updateState();
                    }}
                  />
                </Form.Item>
                <Form.Item label="Repeat">
                  <Select
                    style={{ width: '80px' }}
                    value={uiFlow.repeatOption}
                    onChange={value =>
                      handleSelectChange(uiFlow, 'repeatOption', value, () => {
                        if (value == ScheduleRepeatOption.Yes) {
                          uiFlow.repeatIntervalValue = 1;
                          uiFlow.repeatIntervalUnit = 4;
                        } else {
                          uiFlow.repeatIntervalValue = 0;
                        }
                        updateState();
                      })
                    }>
                    <Option value={ScheduleRepeatOption.No}>No</Option>
                    <Option value={ScheduleRepeatOption.Yes}>Yes</Option>
                  </Select>
                  {uiFlow.repeatOption == ScheduleRepeatOption.Yes && (
                    <div style={{ float: 'right' }}>
                      Every &nbsp;&nbsp;
                      <Input style={{ width: '50px' }} name="repeatIntervalValue" value={uiFlow.repeatIntervalValue} onChange={handleInputChange(uiFlow, updateState)} />
                      &nbsp;&nbsp;
                      <Select style={{ width: '120px' }} value={'' + uiFlow.repeatIntervalUnit} onChange={value => handleSelectChange(uiFlow, 'repeatIntervalUnit', value, updateState)}>
                        <Option value="1">Minute</Option>
                        <Option value="2">Hour</Option>
                        <Option value="3">Day</Option>
                        <Option value="4">Week</Option>
                      </Select>
                    </div>
                  )}
                </Form.Item>
              </Skeleton>
            </Card>
            {uiFlow.actions.map(function (action, i) {
              return (
                <Card
                  title={
                    <span>
                      <div className="iconAndText">
                        <MdOutlineArrowCircleUp /> Action &nbsp;
                        {uiFlow.actions.length > 1 ? i + 1 : ''}
                      </div>
                    </span>
                  }
                  // title={'Action ' + (uiFlow.actions.length > 1 ? i + 1 : '')}

                  size="small"
                  extra={uiFlow.actions.length > 1 && <DeleteOutlined onClick={removeAction(uiFlow.actions, i)} />}>
                  <Skeleton loading={loading} active>
                    <Form.Item label="Action Type">
                      <Select
                        value={action.actionCode}
                        onChange={async value => {
                          action.actionCode = value;
                          const actionType = flowActionUtil.actionTypeFromCode(action.actionCode);
                          actionType.initNewAction(action);
                          updateState();
                        }}>
                        <Option value={actionUtil.ACTION_TYPES.customAction.code}>
                          <img className="itemSelecIcon" src="/icons/eco/snowflake.svg" />
                          &nbsp; Custom Action
                        </Option>
                        <Option value={actionUtil.ACTION_TYPES.paymentAction.code}>
                          <img className="itemSelecIcon" src="/icons/eco/snowflake.svg" />
                          &nbsp; Make a payment
                        </Option>
                        <Option value={actionUtil.ACTION_TYPES.saberPoolWithdrawActio.code}>
                          <img className="itemSelecIcon" src="/icons/eco/saber.svg" />
                          &nbsp; Saber pool withdrawal
                        </Option>
                        <Option value={actionUtil.ACTION_TYPES.blankAction.code}>
                          <img className="itemSelecIcon" src="/icons/eco/saber.svg" />
                          &nbsp; Saber swap
                        </Option>
                        <Option value={actionUtil.ACTION_TYPES.blankAction.code}>
                          <img className="itemSelecIcon" src="/icons/eco/serum.svg" />
                          &nbsp; Serum
                        </Option>
                        <Option value={actionUtil.ACTION_TYPES.blankAction.code}>
                          <img className="itemSelecIcon" src="/icons/eco/raydium.svg" />
                          &nbsp; Raydium
                        </Option>
                        <Option value={actionUtil.ACTION_TYPES.blankAction.code}>
                          <img className="itemSelecIcon" src="/icons/eco/solend.svg" />
                          &nbsp; Solend
                        </Option>
                        <Option value={actionUtil.ACTION_TYPES.blankAction.code}>
                          <img className="itemSelecIcon" src="/icons/eco/orca.svg" />
                          &nbsp; Orca
                        </Option>
                      </Select>
                    </Form.Item>
                    <Divider />
                    {React.createElement(action.actionCode ? actionUtil.actionTypeFromCode(action.actionCode).editComponent : actionUtil.ACTION_TYPES.customAction.editComponent, {
                      uiFlow: uiFlow,
                      action: action,
                      updateState: updateState,
                    })}
                  </Skeleton>
                </Card>
              );
            })}
            {!loading && (
              <span>
                <Button type="dashed" block icon={<PlusOutlined />} onClick={addAction(uiFlow.actions)}>
                  More Action
                </Button>
                <br /> <br /> <br />
                <Space size="middle">
                  <SensitiveButton type="primary" htmlType="submit" size="large" onClick={() => saveFlow()}>
                    Save
                  </SensitiveButton>

                  <Link to={isNewFlow() ? '/' : '/flowDetail/' + flowKey}>
                    <Button type="default" size="large">
                      Cancel
                    </Button>
                  </Link>

                  {debug && (
                    <Button type="default" size="large" onClick={prepareFlow}>
                      Prepare Flow
                    </Button>
                  )}
                </Space>
              </span>
            )}
          </Form>

          <br />
          <br />
          {debug && (
            <span>
              <Divider plain orientation="left">
                UI FLOW
              </Divider>
              <pre>{JSON.stringify(uiFlow, null, 2)}</pre>
              <Divider plain orientation="left">
                FLOW TO SEND
              </Divider>
              <pre>{JSON.stringify(dto.flow, null, 2)}</pre>
            </span>
          )}
        </div>
      </div>
    </span>
  );
};
