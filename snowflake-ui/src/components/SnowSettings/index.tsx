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
import { FormValidatorProvider, validateForm } from '../FormValidator';
import { SnowWithdrawButton } from '../SnowWithdrawButton';
import BN from 'bn.js';
import { createAssociatedTokenAccountIfNotExist } from '../../utils/tokens';
import { useDevnetAirdropAction } from '../../hooks/useDevnetAirdropAction';

export const SnowSettings = ({}) => {
  const program = useAnchorProgram();
  const connectionConfig = useConnectionConfig();
  const walletCtx = useWallet();
  const devnetAirdropAction: () => Promise<any> = useDevnetAirdropAction();
  const [solBalance, setSolBalance] = useState(0);
  const [pda, setPda] = useState(undefined);
  let [balanceRefresh, setBalanceRefresh] = useState(+new Date());

  async function init() {
    if (!walletCtx.publicKey) return;
    const [pda, bump] = await PublicKey.findProgramAddress([walletCtx.publicKey.toBuffer()], new PublicKey(programIds().snowflake));
    const solBalance = await connectionConfig.connection.getBalance(pda);
    setSolBalance(fromLamportsDecimals(solBalance, 9));
    setPda(pda);
  }

  useEffect(() => {
    init();
  }, [solBalance, walletCtx.publicKey, balanceRefresh]);

  return (
    <span style={{ width: '100%' }} className="flowDetailPage">
      {walletCtx.publicKey && (
        <span>
          <PageHeader ghost={false} title={<div className="iconAndText">Settings</div>} extra={[]}></PageHeader>
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
                  <br />
                </Card>

                <Card
                  title="Your Snowflake Balance"
                  size="small"
                  extra={
                    <span>
                      <FormValidatorProvider>
                        <SnowDepositButton onClose={() => setBalanceRefresh(+new Date())} />
                      </FormValidatorProvider>{' '}
                      &nbsp;
                      <FormValidatorProvider>
                        <SnowWithdrawButton onClose={() => setBalanceRefresh(+new Date())} />
                      </FormValidatorProvider>
                    </span>
                  }>
                  {pda && <TokenListWithBalances owner={pda} balanceRefresh={balanceRefresh} />}
                </Card>
                <Card
                  title="Your Wallet"
                  size="small"
                 >
                  {<TokenListWithBalances owner={walletCtx.publicKey} balanceRefresh={balanceRefresh} />}
                </Card>
              </Form>

              <br />
            </div>
          </div>
        </span>
      )}
    </span>
  );
};
