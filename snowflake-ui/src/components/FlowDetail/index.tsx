import React, { useEffect, useState } from 'react';
import { useAnchor, useAnchorProgram } from '../../contexts/anchorContext';
import { AccountMeta, PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button, Card, Form, PageHeader, Skeleton, Table, Tabs } from 'antd';
import { Link, useHistory, useParams } from 'react-router-dom';
import _ from 'lodash';
import * as flowUtil from '../../utils/flowUtil';
import * as snowUtil from '../../utils/snowUtils';
import { MdCircle, MdOutlineArrowCircleUp, MdOutlineInfo, MdOutlineOfflineBolt, MdOutlineSync, MdOutlineTextSnippet, MdSchedule } from 'react-icons/all';
import { notify } from '../../utils/notifications';
import { useConnection, useConnectionConfig } from '../../contexts/connection';
import { SensitiveButton } from '../SensitiveButton';
import { SmartTxnClient } from '../../utils/smartTxnClient';
import { ScheduleRepeatOption } from '../../models/flow';
import { confirmAlert } from 'react-confirm-alert'; // Import
import 'react-confirm-alert/src/react-confirm-alert.css'; // Import css

export const FlowDetail = ({}) => {
  const program = useAnchorProgram();
  let anchor = useAnchor();
  const walletCtx = useWallet();
  const history = useHistory();
  const { flowKey } = useParams<{ flowKey: string }>();

  async function init() {
    if (flowKey) {
      let fetchedFlow = await program.account.flow.fetch(new PublicKey(flowKey));
      uiFlow = await flowUtil.convertFlow(fetchedFlow, connectionConfig, walletCtx, true);
      updateState();
      uiFlow = await flowUtil.convertFlow(fetchedFlow, connectionConfig, walletCtx);
      updateExecutionHistory();
      updateState();
    }
  }

  function prepareFlowForSave() {
    flow = flowUtil.convertUIFlow(uiFlow, connectionConfig, walletCtx);
    dto.idlFlow = flow;
  }

  useEffect(() => {
    init();
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
        <a target="_blank" href={'https://explorer.solana.com/tx/' + text + '?cluster=' + connectionConfig.env}>
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
    let executions = signatures.map(s => ({
      txn_trigger: 'Manual',
      txn_signature: s.signature,
      txn_time: s.blockTime,
      txn_status: s.err ? 'error' : 'success',
    }));
    setFlowExecutionData(executions);
    setLoadingHistory(true);
  }

  const [flowExecutionData, setFlowExecutionData] = useState([]);

  async function executeFlow() {
    let flowAddress = new PublicKey(flowKey);
    let flow = await program.account.flow.fetch(flowKey);

    console.log('flow', flow);

    let accounts = {
      flow: new PublicKey(flowAddress),
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
    await new SmartTxnClient(connectionConfig, [ix], [], walletCtx).send();
    await updateExecutionHistory();
  }

  async function deleteFlow() {
    let deleteContext: any = {
      accounts: {
        flow: new PublicKey(flowKey),
        caller: walletCtx.publicKey,
      }
    };

    const tx = await program.rpc.deleteFlow(deleteContext);
    console.log('Transaction: ', tx);
    
    history.push('/');
  }

  function confirmDelete() {
    confirmAlert({
      title: 'Delete Automation',
      message: 'Are you sure to delete this automation ?',
      buttons: [
        {
          label: 'Yes',
          onClick: () => deleteFlow()
        },
        {
          label: 'No',
          onClick: () => {}
        }
      ]
    });
  };

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
          <Button size="large" onClick={() => confirmDelete()} >Delete</Button>,
          <SensitiveButton size="large" onClick={() => executeFlow()}>
            Run Now
          </SensitiveButton>,
        ]}></PageHeader>
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
              <Form.Item label="Name">{uiFlow.name}</Form.Item>
              <Form.Item label="Status">
                <div className="iconAndText">
                  <MdCircle style={{ color: 'lightgreen' }}></MdCircle>live
                </div>
              </Form.Item>
            </Card>
            <Card
              title={
                <div className="iconAndText">
                  <MdOutlineOfflineBolt /> Trigger
                </div>
              }
              size="small">
              <Form.Item label="Schedule At">
                <div className="iconAndText">
                  <MdSchedule /> {uiFlow.nextExecutionTime ? uiFlow.nextExecutionTime.format('LLL') : 'none'}
                </div>
              </Form.Item>
              <Form.Item label="Repeat">{uiFlow.repeatOption == ScheduleRepeatOption.Yes ? 'Yes' : 'No'}</Form.Item>
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
                <TabPane
                  tab={
                    <div className="iconAndText">
                      <MdOutlineArrowCircleUp /> Actions
                    </div>
                  }
                  key="2">
                  {uiFlow.actions.map(function (action, i) {
                    return (
                      <span>
                        {/* TO BE DONE
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
                        </Card>*/}
                      </span>
                    );
                  })}
                </TabPane>
              </Tabs>
            </span>
          </Form>

          <br />
          {/*        <pre>{JSON.stringify(dto.idlFlow, null, 2)}</pre>
        <Divider />
        <pre>{JSON.stringify(uiFlow, null, 2)}</pre>*/}
        </div>
      </div>
    </span>
  );
};
