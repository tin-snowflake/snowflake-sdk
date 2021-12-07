import React, { useState } from 'react';
import { Button, Input, Modal } from 'antd';
import { handleInputChange } from '../../utils/reactUtil';
import { TokenInput } from '../TokenInput';
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { programIds, SOL_MINT } from '../../utils/ids';
import { toLamportsByDecimal } from '../../utils/utils';
import { SmartTxnClient } from '../../utils/smartTxnClient';
import { useAnchorProgram } from '../../contexts/anchorContext';
import { useConnectionConfig } from '../../contexts/connection';
import { useWallet } from '@solana/wallet-adapter-react';
import { Token } from '@solana/spl-token';
import { findAssociatedTokenAddress } from '../../utils/web3';
import { FormValidatorProvider, useFormValidator, validateForm } from '../FormValidator';
import { FieldRequire, FormItem } from '../FormItem';
import { createAssociatedTokenAccountIfNotExist } from '../../utils/tokens';

export function SnowDepositButton({ onClose }) {
  const program = useAnchorProgram();
  const connectionConfig = useConnectionConfig();
  const walletCtx = useWallet();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [deposit, setDeposit] = useState({ token: { mint: SOL_MINT.toString(), ata: undefined }, amount: undefined });
  const showModal = () => {
    setIsModalVisible(true);
  };

  let formValidator = useFormValidator();
  async function validateAndDeposit() {
    let errors = validateForm(formValidator);
    console.log('form validation errors', errors);
    if (errors.length > 0) return;
    const [pda, bump] = await PublicKey.findProgramAddress([walletCtx.publicKey.toBuffer()], new PublicKey(programIds().snowflake));

    const ixs = [];

    if (deposit.token.mint == SOL_MINT.toString()) {
      ixs.push(
        SystemProgram.transfer({
          fromPubkey: walletCtx.publicKey,
          toPubkey: pda,
          lamports: toLamportsByDecimal(+deposit.amount, 9),
        })
      );
    } else {
      const sourceAta = deposit.token.ata;
      const [destinationAta, createDestinationAta] = await createAssociatedTokenAccountIfNotExist(pda, walletCtx.publicKey, new PublicKey(deposit.token.mint), connectionConfig.connection);
      ixs.push(...createDestinationAta);
      ixs.push(
        Token.createTransferInstruction(
          programIds().token,
          sourceAta,
          destinationAta,
          walletCtx.publicKey, // authority
          [],
          toLamportsByDecimal(+deposit.amount, 9)
        )
      );
    }
    await new SmartTxnClient(connectionConfig, ixs, [], walletCtx).send();
    setIsModalVisible(false);
    onClose();
  }
  function updateState() {
    setDeposit({ ...deposit });
  }
  const handleCancel = () => {
    setIsModalVisible(false);
  };

  return (
    <>
      <Button onClick={showModal}>Deposit</Button>
      <Modal
        destroyOnClose={true}
        centered
        title="Deposit"
        maskClosable={false}
        visible={isModalVisible}
        onOk={validateAndDeposit}
        onCancel={handleCancel}
        footer={[
          <Button key="back" onClick={handleCancel}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={validateAndDeposit}>
            Deposit
          </Button>,
        ]}>
        <br />

        <FormItem style={{ width: '700px' }} validators={[new FieldRequire('Amount is required.')]} validate={deposit.amount}>
          <div style={{ display: 'flex' }}>
            <Input name="amount" value={deposit.amount} onChange={handleInputChange(deposit, updateState)} placeholder="enter deposit amount" />
            &nbsp;
            <TokenInput token={deposit.token} handleChange={() => {}} />
          </div>
        </FormItem>
        <br />
      </Modal>
    </>
  );
}
