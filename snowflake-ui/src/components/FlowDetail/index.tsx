import React, { useEffect, useState } from 'react';
import { useAnchorProgram } from '../../contexts/anchorContext';
import { AccountMeta, PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button, Card, Divider, Form, Modal, PageHeader, Skeleton, Table, Tabs } from 'antd';
import { Link, useHistory, useLocation, useParams } from 'react-router-dom';
import _ from 'lodash';
import * as flowUtil from '../../utils/flowUtil';
import * as snowUtil from '../../utils/snowUtils';
import { MdOutlineArrowCircleUp, MdOutlineInfo, MdOutlineOfflineBolt, MdOutlineSync, MdOutlineTextSnippet } from 'react-icons/all';
import { useConnectionConfig } from '../../contexts/connection';
import { SensitiveButton } from '../SensitiveButton';
import { SmartTxnClient } from '../../utils/smartTxnClient';
import { RecurringUIOption, TriggerType, TriggerTypeLabels } from '../../models/flow';
import { useInterval } from 'usehooks-ts';
import { ExclamationCircleOutlined } from '@ant-design/icons/lib';
import { FlowLiveStatus } from '../FlowLiveStatus';
import '../../utils/prettycron.js';
import { programIds } from '../../utils/ids';
import {MEMO_PROGRAM_ID} from '../../utils/ids'

export const FlowDetail = ({}) => {
  const program = useAnchorProgram();
  const walletCtx = useWallet();
  const history = useHistory();
  const { flowKey } = useParams<{ flowKey: string }>();
  const [debug, setDebug] = useState(false);
  function useQuery() {
    const { search } = useLocation();
    return React.useMemo(() => new URLSearchParams(search), [search]);
  }

  let query = useQuery();
  async function init() {
    setDebug(query.get('debug') ? true : false);
    if (flowKey) {
      let fetchedFlow = await program.account.flow.fetch(new PublicKey(flowKey));
      uiFlow = await flowUtil.convertFlow(fetchedFlow, connectionConfig, walletCtx, true);
      updateState();
      uiFlow = await flowUtil.convertFlow(fetchedFlow, connectionConfig, walletCtx);
      updateExecutionHistory();
      updateState();
    }
  }

  useInterval(
    () => {
      // updateState(); // use this to detect automation error
    },
    // Delay in milliseconds or null to stop it
    10000
  );

  function prepareFlowForSave() {
    flow = flowUtil.convertUIFlow(uiFlow, connectionConfig, walletCtx);
    dto.idlFlow = flow;
  }

  useEffect(() => {
    console.log('*** calling use effect ... ');
    init();
    const listenerId = connectionConfig.connection.onAccountChange(new PublicKey(flowKey), async () => {
      console.log('on account change trigger ...');
      await init();
    });
    return function cleanup() {
      connectionConfig.connection.removeAccountChangeListener(listenerId);
    };
  }, []);

  const onFinish = (values: any) => {
    console.log('Success:', values);
  };

  const onFinishFailed = (errorInfo: any) => {
    console.log('Failed:', errorInfo);
  };

  let initialAccount = { isSigner: false, isWritable: false };
  let initialAction: any = { name: 'basic_action', accounts: [initialAccount] };
  let initialFlow: any = { actions: [initialAction] };
  let [uiFlow, setUIFlow] = useState(initialFlow);

  let initialDto: any = {};
  const [dto, setDto] = useState(initialDto);

  let flow: any = {};

  const handleChange = (obj, fieldType?) => e => {
    _.set(obj, e.target.name, e.target.value);
    //prepareFlowForSave();
    updateState();
  };

  const addAccount = accounts => e => {
    accounts.push(initialAccount);
    updateState();
  };

  const addAction = actions => e => {
    actions.push(initialAction);
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

  const { TabPane } = Tabs;
  const flowExecutionColumn = [
    {
      title: 'Trigger',
      dataIndex: 'txn_trigger',
      key: 'txn_trigger',
      width: 150,
    },
    {
      title: 'Time',
      dataIndex: 'txn_time',
      key: 'txn_time',
      width: 250,
      render: unixtime => snowUtil.formatUnixTimeStamp(unixtime),
    },
    {
      title: 'Status',
      dataIndex: 'txn_status',
      key: 'txn_status',
    },
    {
      title: 'Transaction Signature',
      dataIndex: 'txn_signature',
      key: 'txn_signature',
      width: 220,
      ellipsis: true,
      render: text => (
        <a target="_blank" href={'https://explorer.solana.com/tx/' + text + '?cluster=' + (connectionConfig.env == 'localnet' ? 'custom&customUrl=http://localhost:8899' : connectionConfig.env)}>
          {text}
        </a>
      ),
    },
  ];

  let connectionConfig = useConnectionConfig();
  let [loadingHistory, setLoadingHistory] = useState(false);
  async function updateExecutionHistory() {
    setLoadingHistory(false);
    let signatures = await connectionConfig.connection.getConfirmedSignaturesForAddress2(new PublicKey(flowKey));
    let executions = signatures.filter(s => s.memo && s.memo.includes('snf_exec')).map(s => ({
      key: s.signature,
      txn_trigger: s.memo.endsWith('exec_manual') ? 'Manual' : s.memo.endsWith('exec_auto') ? 'Auto' : 'Error',
      txn_signature: s.signature,
      txn_time: s.blockTime,
      txn_status: s.err ? 'error' : 'success',
    }));
    setFlowExecutionData(executions);
    setLoadingHistory(true);
  }

  const [flowExecutionData, setFlowExecutionData] = useState([]);

  async function simulateFlow() {
    await executeFlow(true);
  }
  async function executeFlow(simulate: boolean = false) {
    let flowAddress = new PublicKey(flowKey);
    let flow = await program.account.flow.fetch(flowKey);
    const [pda, bump] = await PublicKey.findProgramAddress([walletCtx.publicKey.toBuffer()], new PublicKey(programIds().snowflake));
    let accounts = {
      flow: new PublicKey(flowAddress),
      caller: walletCtx.publicKey,
      pda: pda,
      systemProgram: SystemProgram.programId,
    };

    let remainAccountMetas: AccountMeta[] = flow.actions.reduce((result, current) => result.concat(current.accounts), []);
    let targetProgramMetas = flow.actions.reduce(
      (result, current) =>
        result.concat({
          pubkey: current.program,
          isSigner: false,
          isWritable: false,
        }),
      []
    );
    remainAccountMetas = remainAccountMetas.concat(targetProgramMetas);
    console.log('remaining account metas', remainAccountMetas);

    const ix = await program.instruction.executeFlow({
      accounts: accounts,
      remainingAccounts: remainAccountMetas,
    });
    
    const memoIx = new TransactionInstruction({
      keys: [],
      data: Buffer.from('snf_exec_manual', 'utf-8'),
      programId: MEMO_PROGRAM_ID,
    });

    const ixs = [ix, memoIx];

    if (simulate) {
      await new SmartTxnClient(connectionConfig, ixs, [], walletCtx).simulate();
    } else {
      await new SmartTxnClient(connectionConfig, ixs, [], walletCtx).send();
      await updateExecutionHistory();
    }
  }

  async function deleteFlow() {
    let deleteContext: any = {
      accounts: {
        flow: new PublicKey(flowKey),
        caller: walletCtx.publicKey,
      },
    };

    const tx = await program.rpc.deleteFlow(deleteContext);
    console.log('Transaction: ', tx);

    history.push('/');
  }

  const { confirm } = Modal;

  function confirmDelete() {
    confirm({
      title: 'Delete Automation',
      icon: <ExclamationCircleOutlined />,
      content: 'Delete this automation ?',
      onOk() {
        deleteFlow();
      },
      onCancel() {
        console.log('Cancel');
      },
    });
  }

  function cronStr(s) {
    // @ts-ignore
    return prettyCron.toString(later, s, false);
  }

  return (
    <span style={{ width: '100%' }} className="flowDetailPage">
      <PageHeader
        ghost={false}
        title={
          <div className="iconAndText">
            {/*<MdOutlineBook style={{ opacity: '0.7' }} />*/}
            {uiFlow.name}
          </div>
        }
        extra={[
          <Link to={'/editflow/' + flowKey}>
            <Button size="large">Edit</Button>
          </Link>,
          <Button size="large" onClick={() => confirmDelete()}>
            Delete
          </Button>,
          <SensitiveButton size="large" onClick={() => simulateFlow()}>
            Validate
          </SensitiveButton>,
          <SensitiveButton size="large" onClick={() => executeFlow()}>
            Run Now
          </SensitiveButton>,
        ]}></PageHeader>
      <div className="card">
        <div className="card-body">
          <Form
            name="basic"
            labelAlign="left"
            labelCol={{ span: 3 }}
            wrapperCol={{ span: 12 }}
            initialValues={{ remember: true }}
            onFinish={onFinish}
            requiredMark={false}
            onFinishFailed={onFinishFailed}
            autoComplete="off">
            <Card
              title={
                <div className="iconAndText">
                  <MdOutlineInfo /> Status
                </div>
              }
              size="small">
              {uiFlow.name && <FlowLiveStatus uiFlow={uiFlow} updateState={updateState} />}
            </Card>
            {/*<Card
              title={
                <div className="iconAndText">
                  <MdOutlineInfo /> Info
                </div>
              }
              size="small">
              <Form.Item label="Name">{uiFlow.name}</Form.Item>
              <Form.Item label="Status">
                <div className="iconAndText">
                  <MdCircle style={{ color: 'lightgreen' }}></MdCircle>live
                </div>
              </Form.Item>
            </Card>*/}
            <Card
              title={
                <div className="iconAndText">
                  <MdOutlineOfflineBolt /> Trigger
                </div>
              }
              size="small">
              <div className="labelLayout">
                <div>
                  <label>Trigger Type :</label>
                  {TriggerTypeLabels[uiFlow.triggerType]}
                </div>

                {uiFlow.triggerType == TriggerType.Time && (
                  <span>
                    {uiFlow.recurring == RecurringUIOption.Yes && (
                      <div>
                        <label>Schedule :</label>
                        {cronStr(uiFlow.cron)}
                      </div>
                    )}
                    {uiFlow.nextExecutionTime && uiFlow.nextExecutionTime.unix() > 0 && (
                      <div>
                        <label>Next Execution :</label>
                        {uiFlow.nextExecutionTime ? uiFlow.nextExecutionTime.format('LLL') : 'None'}
                      </div>
                    )}
                    {uiFlow.recurring == RecurringUIOption.No && (
                      <div>
                        <label>Recurring :</label>
                        {uiFlow.recurring}
                      </div>
                    )}
                  </span>
                )}
                {((uiFlow.triggerType == TriggerType.Time && uiFlow.recurring == RecurringUIOption.Yes) || uiFlow.triggerType == TriggerType.ProgramCondition) && (
                  <div>
                    <label>Remaining Runs :</label>
                    {uiFlow.remainingRuns == -999 ? 'Forever' : uiFlow.remainingRuns}
                  </div>
                )}
              </div>
            </Card>

            <span>
              <Tabs defaultActiveKey="1">
                <TabPane
                  tab={
                    <div className="iconAndText">
                      <MdOutlineTextSnippet /> Execution History
                    </div>
                  }
                  key="1">
                  <Card size="small">
                    <Skeleton loading={!loadingHistory} active>
                      <a onClick={() => updateExecutionHistory()}>
                        <MdOutlineSync style={{ float: 'right', fontSize: '18px' }} />
                      </a>
                      <Table columns={flowExecutionColumn} dataSource={flowExecutionData} pagination={false} />
                    </Skeleton>
                    <br />
                    <br />
                  </Card>
                </TabPane>
                {/* <TabPane
                  tab={
                    <div className="iconAndText">
                      <MdOutlineArrowCircleUp /> Actions
                    </div>
                  }
                  key="2">
                  {uiFlow.actions.map(function (action, i) {
                    return (
                      <span>
                         TO BE DONE
                        <Card size="small">
                          <Form.Item label="Program">{action.program}</Form.Item>
                          <Form.Item label="Instruction">{action.instruction}</Form.Item>
                          {action.accounts.map(function (account, j) {
                            return (
                              <span>
                                <Form.Item label={'Account ' + (j + 1)}>{account.pubkey}</Form.Item>
                              </span>
                            );
                          })}
                        </Card>
                      </span>
                    );
                  })}
                </TabPane>*/}
              </Tabs>
            </span>
          </Form>

          <br />
          {/*        <pre>{JSON.stringify(dto.idlFlow, null, 2)}</pre>
        <Divider />
        <pre>{JSON.stringify(uiFlow, null, 2)}</pre>*/}
        </div>
      </div>
      {debug && (
        <span>
          <br />
          <br />
          <Divider plain orientation="left">
            UI FLOW
          </Divider>
          <pre>{JSON.stringify(uiFlow, null, 2)}</pre>
        </span>
      )}
    </span>
  );
};
