import React, { useEffect, useState } from 'react';
import { Button, Input, Modal } from 'antd';
import { handleInputChange } from '../../utils/reactUtil';
import { TokenInput } from '../TokenInput';
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { DEVNET_USDC_TOKEN, programIds, SOL_MINT } from '../../utils/ids';
import { toLamports, toLamportsByDecimal } from '../../utils/utils';
import { SmartTxnClient } from '../../utils/smartTxnClient';
import { useAnchorProgram } from '../../contexts/anchorContext';
import { useConnectionConfig } from '../../contexts/connection';
import { useWallet } from '@solana/wallet-adapter-react';
import { Token } from '@solana/spl-token';
import { findAssociatedTokenAddress } from '../../utils/web3';
import { FormValidatorProvider, useFormValidator, validateForm } from '../FormValidator';
import { FieldRequire, FormItem } from '../FormItem';
import { createAssociatedTokenAccountIfNotExist, getAssociatedTokenAddress } from '../../utils/tokens';
import { cachebleMintByKey, useMint } from '../../contexts/accounts';
import { SensitiveButton } from '../SensitiveButton';
import { useDevnetAirdropAction } from '../../hooks/useDevnetAirdropAction';
import { Link } from 'react-router-dom';
import { TEMPLATE } from '../../utils/flowTemplateUtil';

export function OnboardUserDevenet({ defaultToken = SOL_MINT.toString(), disableTokenSelect = false }) {
  const program = useAnchorProgram();
  const connectionConfig = useConnectionConfig();
  const connection = connectionConfig.connection;
  const walletCtx = useWallet();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [secondModalVisible, setSecondModalVisible] = useState(false);
  const [deposit, setDeposit] = useState({ token: { mint: defaultToken, ata: undefined }, amount: undefined });
  const devnetAirdropAction: () => Promise<any> = useDevnetAirdropAction();

  async function init() {
    if (!walletCtx.publicKey) return;
    const usdcTestAccountAddress = await getAssociatedTokenAddress(DEVNET_USDC_TOKEN.toString(), walletCtx.publicKey.toString());
    const usdcTestAccount = await connection.getAccountInfo(usdcTestAccountAddress);
    if (!usdcTestAccount) {
      showModal();
      return;
    }

    const usdcTestAccountBalance = await connection.getTokenAccountBalance(usdcTestAccountAddress);
    if (usdcTestAccountBalance.value.uiAmount < 1) {
      showModal();
      return;
    }
  }
  useEffect(() => {
    init();
  }, [walletCtx.publicKey]);

  const showModal = () => {
    setIsModalVisible(true);
  };

  let formValidator = useFormValidator();
  async function airdrop() {
    await devnetAirdropAction();
    setIsModalVisible(false);
    setSecondModalVisible(true);
  }

  async function createAutomation() {}
  function updateState() {
    setDeposit({ ...deposit });
  }
  const handleCancel = () => {
    setIsModalVisible(false);
    setSecondModalVisible(false);
  };

  return (
    <>
      <Modal
        destroyOnClose={true}
        centered
        title="Welcome"
        maskClosable={false}
        visible={isModalVisible}
        onOk={airdrop}
        onCancel={handleCancel}
        footer={[
          <Button key="back" onClick={handleCancel}>
            Cancel
          </Button>,
          <SensitiveButton key="submit" type="primary" onClick={() => airdrop()}>
            Airdrop 500 USDC
          </SensitiveButton>,
        ]}>
        <br />
        <div style={{ display: 'flex' }}>
          We're stoked that you try out Snowflake ! <br />
          <br /> Before you start, let's get you some USDC on Devnet so you can test a few automations that involve token transfers.
        </div>

        <br />
      </Modal>

      <Modal
        destroyOnClose={true}
        centered
        title="Create your first automation"
        maskClosable={false}
        visible={secondModalVisible}
        onOk={airdrop}
        onCancel={handleCancel}
        footer={[
          <Button key="back" onClick={handleCancel}>
            Cancel
          </Button>,
          <Link key={TEMPLATE.recurringPayment} to={'/editflow?template=' + TEMPLATE.recurringPayment}>
            <Button onClick={() => setSecondModalVisible(false)} type="primary">
              Create Automation
            </Button>
          </Link>,
        ]}>
        <br />
        <div style={{ display: 'flex' }}>You're set ! Let's spin up a recurring payment automation. It'll take just a few clicks. </div>

        <br />
      </Modal>
    </>
  );
}
