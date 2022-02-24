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
import { RecurringUIOption, RETRY_WINDOW, TriggerType } from '../../models/flow';
import moment from 'moment';
import { FieldRequire, FormItem } from '../FormItem';
import { useFormValidator, validateForm } from '../FormValidator';
import Cron from '../Cron';
import { BLANK_TEMPLATE, FLOW_TEMPLATES } from '../../utils/flowTemplateUtil';
import { programIds } from '../../utils/ids';
import { toLamportsByDecimal } from '../../utils/utils';
import BN from 'bn.js';
import { DEFAULT_FLOW_SIZE } from '../../utils/flowUtil';

export const EditFlow = (props: {}) => {
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
  const template = query.get('template') ? FLOW_TEMPLATES[connectionConfig.env][query.get('template')] : BLANK_TEMPLATE;
  let initialFlow: any = _.cloneDeep(template);
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
      if (!initialFlow.actions.length) initialFlow.actions = [newDefaultAction()];
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

  async function getFeeDepositInstructions(): Promise<TransactionInstruction[]> {
    const [pda, bump] = await PublicKey.findProgramAddress([walletCtx.publicKey.toBuffer()], new PublicKey(programIds().snowflake));
    const balance = await connectionConfig.connection.getBalance(pda);
    const ixs = [];

    if (balance < toLamportsByDecimal(0.001, 9)) {
      ixs.push(
        SystemProgram.transfer({
          fromPubkey: walletCtx.publicKey,
          toPubkey: pda,
          lamports: toLamportsByDecimal(+0.01, 9),
        })
      );
    }

    return ixs;
  }

  let formValidator = useFormValidator();
  async function validateAndSave() {
    let errors = validateForm(formValidator);
    console.log('form validation errors', errors);
    if (errors.length > 0) return;
    await saveFlow();
  }

  async function saveFlow() {
    let isNewFlow = !flowKey;
    let instructions: TransactionInstruction[] = await collectActionInstructions();
    instructions.push(...(await getFeeDepositInstructions()));
    await prepareFlowForSave();
    let keyUsed;
    if (isNewFlow) {
      let newFlowKeyPair = anchor.web3.Keypair.generate();
      keyUsed = newFlowKeyPair.publicKey;
      let createContext: any = {
        accounts: {
          flow: newFlowKeyPair.publicKey,
          owner: walletCtx.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [newFlowKeyPair], // to be removed, singers no longer needs to be declared here since we're not using anchor for sending txn
      };
      /* if (instructions.length > 0) createContext.instructions = instructions;
      tx = await program.instruction.createFlow(flow, createContext);*/
      const createIx = await program.instruction.createFlow(DEFAULT_FLOW_SIZE, flow, createContext);
      const ixs = [...instructions, createIx];
      await new SmartTxnClient(connectionConfig, ixs, [newFlowKeyPair], walletCtx).send();
    } else {
      keyUsed = flowKey;
      console.log('sending flow to save', flow);
      let updateContext: any = {
        accounts: {
          flow: new PublicKey(flowKey),
          owner: walletCtx.publicKey,
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

  function numberOfRunSelection() {
    return (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Select style={{ width: '120px' }} value={uiFlow.remainingRuns} onChange={value => handleSelectChange(uiFlow, 'remainingRuns', value, updateState)}>
          <Option value={-999}>Forever</Option>
          {[...Array(100)].map((x, i) => (
            <Option key={i} value={i}>
              {i} times
            </Option>
          ))}
        </Select>
      </div>
    );
  }
  return (
    <span style={{ width: '100%' }}>
      <PageHeader ghost={false} title={<div style={{ display: 'flex', alignItems: 'center' }}>{isNewFlow() ? 'New Automation' : <span>Edit Automation</span>}</div>}></PageHeader>
      <div className="card">
        <div className="card-body">
          <Form
            scrollToFirstError={true}
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
              <FormItem label="Name" validators={[new FieldRequire('Name is required.')]} validate={uiFlow.name}>
                <Input name="name" value={uiFlow.name} onChange={handleChange(uiFlow)} />
              </FormItem>
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
                  <Select defaultValue="Time" value={uiFlow.triggerType} onChange={value => handleSelectChange(uiFlow, 'triggerType', value, updateState)}>
                    <Option value={TriggerType.None}>None</Option>
                    <Option value={TriggerType.Time}>Time</Option>
                    <Option value={TriggerType.ProgramCondition}>Program Condition</Option>
                  </Select>
                </Form.Item>
                {uiFlow.triggerType == TriggerType.ProgramCondition && (
                  <span>
                    <Form.Item label="Run for">{numberOfRunSelection()}</Form.Item>
                  </span>
                )}
                {uiFlow.triggerType == TriggerType.Time && (
                  <span>
                    <Form.Item label="Recurring">
                      <Select style={{ width: '80px' }} value={uiFlow.recurring} onChange={value => handleSelectChange(uiFlow, 'recurring', value, updateState)}>
                        <Option value={RecurringUIOption.No}>No</Option>
                        <Option value={RecurringUIOption.Yes}>Yes</Option>
                      </Select>
                    </Form.Item>
                    {uiFlow.recurring == RecurringUIOption.No && (
                      <Form.Item label="Schedule At" rules={[{ required: false, message: 'Trigger is required' }]}>
                        <DatePicker
                          style={{ width: '100%' }}
                          format="MMMM D, YYYY  h:mm a"
                          showTime={true}
                          name="trigger"
                          value={uiFlow.nextExecutionTime.year() > 1970 ? uiFlow.nextExecutionTime : null}
                          onChange={(date, dateString) => {
                            uiFlow.nextExecutionTime = date;
                            updateState();
                          }}
                        />
                      </Form.Item>
                    )}
                    {uiFlow.recurring == RecurringUIOption.Yes && (
                      <span>
                        <Form.Item label="Repeat" wrapperCol={{ span: 20 }}>
                          <Cron
                            value={uiFlow.cron}
                            setValue={v => {
                              uiFlow.cron = v;
                              updateState();
                            }}
                            clearButton={false}
                            clockFormat="12-hour-clock"
                          />
                        </Form.Item>
                        <Form.Item label="For">{numberOfRunSelection()}</Form.Item>
                      </span>
                    )}
                  </span>
                )}
              </Skeleton>
            </Card>
            {uiFlow.actions.map(function (action, i) {
              return (
                <Card
                  key={i}
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
                          Object.keys(action).forEach(key => delete action[key]);
                          action.name = 'default';
                          action.actionCode = value;
                          const actionType = flowActionUtil.actionTypeFromCode(action.actionCode);

                          actionType.initNewAction(action);
                          updateState();
                        }}>
                        <Option key={1} value={actionUtil.ACTION_TYPES.customAction.code}>
                          <img className="itemSelecIcon" src="/icons/eco/snowflake.svg" />
                          &nbsp; Custom Action
                        </Option>
                        <Option key={2} value={actionUtil.ACTION_TYPES.paymentAction.code}>
                          <img className="itemSelecIcon" src="/icons/eco/snowflake.svg" />
                          &nbsp; Make a payment
                        </Option>
                        <Option key={3} value={actionUtil.ACTION_TYPES.saberPoolWithdrawActio.code}>
                          <img className="itemSelecIcon" src="/icons/eco/saber.svg" />
                          &nbsp; Saber pool withdrawal
                        </Option>
                        <Option key={4} value={actionUtil.ACTION_TYPES.priceCheckAction.code}>
                          <img className="itemSelecIcon" src="/icons/eco/pyth.svg" />
                          &nbsp; Price check
                        </Option>
                        <Option key={5} value={actionUtil.ACTION_TYPES.orcaSwapAction.code}>
                          <img className="itemSelecIcon" src="/icons/eco/orca.svg" />
                          &nbsp; Orca Swap
                        </Option>
                        <Option key={6} disabled value={actionUtil.ACTION_TYPES.blankAction.code}>
                          <img className="itemSelecIcon" src="/icons/eco/serum.svg" />
                          &nbsp; Serum
                        </Option>
                        <Option key={7} disabled value={actionUtil.ACTION_TYPES.blankAction.code}>
                          <img className="itemSelecIcon" src="/icons/eco/raydium.svg" />
                          &nbsp; Raydium
                        </Option>
                        <Option key={8} disabled value={actionUtil.ACTION_TYPES.blankAction.code}>
                          <img className="itemSelecIcon" src="/icons/eco/solend.svg" />
                          &nbsp; Solend
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
                  <SensitiveButton type="primary" htmlType="submit" size="large" onClick={() => validateAndSave()}>
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
