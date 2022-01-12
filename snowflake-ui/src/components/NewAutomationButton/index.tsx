import React, { useState } from 'react';
import { Button, Card, Col, Input, Modal, Row, Statistic } from 'antd';
import { handleInputChange } from '../../utils/reactUtil';
import { TokenInput } from '../TokenInput';
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { programIds, SOL_MINT } from '../../utils/ids';
import { toLamports, toLamportsByDecimal } from '../../utils/utils';
import { SmartTxnClient } from '../../utils/smartTxnClient';
import { useAnchorProgram } from '../../contexts/anchorContext';
import { useConnectionConfig } from '../../contexts/connection';
import { useWallet } from '@solana/wallet-adapter-react';
import { Token } from '@solana/spl-token';
import { findAssociatedTokenAddress } from '../../utils/web3';
import { FormValidatorProvider, useFormValidator, validateForm } from '../FormValidator';
import { FieldRequire, FormItem } from '../FormItem';
import { createAssociatedTokenAccountIfNotExist } from '../../utils/tokens';
import { cachebleMintByKey, useMint } from '../../contexts/accounts';
import { ArrowUpOutlined } from '@ant-design/icons/lib';
import { Link } from 'react-router-dom';
import { TEMPLATE } from '../../utils/flowTemplateUtil';
import { FlowTemplateItem } from '../FlowTemplateItem';
import Search from 'antd/es/input/Search';

export function NewAutomationButton({}) {
  const program = useAnchorProgram();
  const connectionConfig = useConnectionConfig();
  const walletCtx = useWallet();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  return (
    <>
      <Button type="primary" size="large" onClick={showModal}>
        New Automation
      </Button>
      <Modal destroyOnClose={true} title="Select Template" maskClosable={false} visible={isModalVisible} onOk={() => {}} onCancel={handleCancel} width={900} footer={null}>
        <Search placeholder="search template" style={{ width: 200, float: 'right', marginTop: '-10px' }} /> <br />
        <br />
        <span className="flowTemplateSelect">
          <Row gutter={16}>
            <Col span={12}>
              <FlowTemplateItem templateId={TEMPLATE.blank} title="Start from scratch" icon="snowflake">
                Compose your automation from scratch using prebuilt actions or roll your own custom actions.
              </FlowTemplateItem>
            </Col>
            <Col span={12}>
              <FlowTemplateItem templateId={TEMPLATE.oneOffScheduledCustomAction} title="Sample time triggered automation" icon="time">
                A sample automation that is triggered at a specific time in the future and invoking a simple program.
              </FlowTemplateItem>
            </Col>
          </Row>
          <br />

          <Row gutter={16}>
            <Col span={12}>
              <FlowTemplateItem templateId={TEMPLATE.sampleProgramConditionFlow} title="Sample program triggered automation" icon="snowflake">
                A sample automation triggered by a condition defined within a program developed by developers.
              </FlowTemplateItem>
            </Col>
            <Col span={12}>
              <FlowTemplateItem templateId={TEMPLATE.recurringPayment} title="Recurring payment" icon="snowflake">
                Making regular payments, paying salary or subscription services with Snowflake payment flow.
              </FlowTemplateItem>
            </Col>
          </Row>
          <br />

          <Row gutter={16}>
            <Col span={12}>
              <FlowTemplateItem templateId={TEMPLATE.orcaDCA} title="Dollar cost average swap on Orca" icon="orca">
                Recurring dollar cost average swap on Orca <br />
                <br />
              </FlowTemplateItem>
            </Col>
            <Col span={12}>
              <FlowTemplateItem disabled={true} templateId={TEMPLATE.sampleProgramConditionFlow} title="Liquidation Protection [ In Dev ]" icon="solend">
                Protect your position on Solend <br />
                <br />
              </FlowTemplateItem>
            </Col>
          </Row>
          <br />

          <Row gutter={16}>
            <Col span={12}>
              <FlowTemplateItem templateId={TEMPLATE.pythOracleTrigger} title="Pyth oracle price triggered automation" icon="pyth">
                Sample swap action triggerred when Pyth oracle price condition met. <br />
                <br />
              </FlowTemplateItem>
            </Col>
            {/* <Col span={12}>
              <FlowTemplateItem templateId={TEMPLATE.sampleProgramConditionFlow} title="Liquidation Protection [ In Dev ]" icon="solend">
                Protect your position on Solend <br />
                <br /> <br />
              </FlowTemplateItem>
            </Col>*/}
          </Row>
        </span>
        <br />
      </Modal>
    </>
  );
}
