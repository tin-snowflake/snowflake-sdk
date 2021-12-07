import React, { useEffect, useState } from 'react';
import { useAnchorProgram } from '../../contexts/anchorContext';
import { AccountMeta, PublicKey, SystemProgram } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button, Card, Divider, Form, Input, Modal, PageHeader, Skeleton, Table, Tabs } from 'antd';
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
import { FieldRequire, FormItem } from '../FormItem';
import { TokenInput } from '../TokenInput';
import { TokenListWithBalances } from '../TokenListWithBalances';
import { programIds } from '../../utils/ids';
import { fromLamportsDecimals, toLamports, toLamportsByDecimal } from '../../utils/utils';
import { SnowDepositButton } from '../SnowDepositButton';
import { FormValidatorProvider } from '../FormValidator';

export const SnowSettings = ({}) => {
  const program = useAnchorProgram();
  const connectionConfig = useConnectionConfig();
  const walletCtx = useWallet();

  const { flowKey } = useParams<{ flowKey: string }>();

  const [solBalance, setSolBalance] = useState(0);
  const [pda, setPda] = useState(undefined);
  async function init() {
    if (!walletCtx.publicKey) return;
    const [pda, bump] = await PublicKey.findProgramAddress([walletCtx.publicKey.toBuffer()], new PublicKey(programIds().snowflake));
    const solBalance = await connectionConfig.connection.getBalance(pda);
    setSolBalance(fromLamportsDecimals(solBalance, 9));
    setPda(pda);
  }

  useEffect(() => {
    init();
  }, [solBalance, walletCtx.publicKey]);

  async function deposit() {
    const [pda, bump] = await PublicKey.findProgramAddress([walletCtx.publicKey.toBuffer()], new PublicKey(programIds().snowflake));
    const ix = SystemProgram.transfer({
      fromPubkey: walletCtx.publicKey,
      toPubkey: pda,
      lamports: toLamportsByDecimal(0.01, 9),
    });
    await new SmartTxnClient(connectionConfig, [ix], [], walletCtx).send();
  }

  async function withdraw() {
    const [pda, bump] = await PublicKey.findProgramAddress([walletCtx.publicKey.toBuffer()], new PublicKey(programIds().snowflake));
    /*const ix = SystemProgram.transfer({
      fromPubkey: pda,
      toPubkey: walletCtx.publicKey,
      lamports: toLamportsByDecimal(0.01, 9),
    });*/

    let accounts = {
      caller: walletCtx.publicKey,
      systemProgram: SystemProgram.programId,
      pda: pda,
    };

    const ix = await program.instruction.withdraw({
      accounts: accounts,
    });
    await new SmartTxnClient(connectionConfig, [ix], [], walletCtx).send();
  }
  let [balanceRefresh, setBalanceRefresh] = useState(+new Date());
  return (
    <span style={{ width: '100%' }} className="flowDetailPage">
      {walletCtx.publicKey && (
        <span>
          <PageHeader
            ghost={false}
            title={<div className="iconAndText">Settings</div>}
            extra={
              [
                /*<Link to={'/editflow/' + flowKey}>
                <Button size="large">Edit</Button>
              </Link>,*/
              ]
            }></PageHeader>
          <div className="card">
            <div className="card-body">
              <Form name="basic" labelAlign="left" labelCol={{ span: 3 }} wrapperCol={{ span: 12 }} initialValues={{ remember: true }} requiredMark={false} autoComplete="off">
                <Card title="Fee Account" size="small">
                  <div className="labelLayout">
                    <div>
                      <label>Balance :</label> {solBalance} SOL
                      <br />
                    </div>
                  </div>
                  <br />
                  <br /> <br />
                  <SensitiveButton htmlType="submit" size="medium" onClick={() => withdraw()}>
                    Deposit SOL
                  </SensitiveButton>{' '}
                  &nbsp;
                  <SensitiveButton htmlType="submit" size="medium" onClick={() => withdraw()}>
                    Withdraw SOL
                  </SensitiveButton>
                  {/*<FormItem validators={[new FieldRequire('Amount is required.')]}>
                    <div style={{ display: 'flex' }}>
                      <Input name="amount" />
                      &nbsp;
                      <TokenInput token="" handleChange={() => {}} />
                      &nbsp;
                      <SensitiveButton htmlType="submit" size="medium" onClick={() => deposit()}>
                        Deposit
                      </SensitiveButton>
                    </div>{' '}
                    <br />
                    <div style={{ display: 'flex' }}>
                      <Input name="amount" />
                      &nbsp;
                      <TokenInput token="" handleChange={() => {}} />
                      &nbsp;
                      <SensitiveButton htmlType="submit" size="medium" onClick={() => withdraw()}>
                        Withdraw
                      </SensitiveButton>
                    </div>
                  </FormItem>*/}
                </Card>

                <Card
                  title="Snowflake Balance"
                  size="small"
                  extra={
                    <FormValidatorProvider>
                      <SnowDepositButton onClose={() => setBalanceRefresh(+new Date())} />
                    </FormValidatorProvider>
                  }>
                  {pda && <TokenListWithBalances owner={pda} balanceRefresh={balanceRefresh} />}
                </Card>
              </Form>

              <br />
              {/*        <pre>{JSON.stringify(dto.idlFlow, null, 2)}</pre>
        <Divider />
        <pre>{JSON.stringify(uiFlow, null, 2)}</pre>*/}
            </div>
          </div>
        </span>
      )}
    </span>
  );
};
