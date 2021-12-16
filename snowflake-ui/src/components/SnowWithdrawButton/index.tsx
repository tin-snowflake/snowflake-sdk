import React, { useState } from 'react';
import { Button, Input, Modal } from 'antd';
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
import { cachebleMintByKey } from '../../contexts/accounts';
import BN from 'bn.js';
import { SensitiveButton } from '../SensitiveButton';

export function SnowWithdrawButton({ onClose }) {
  const program = useAnchorProgram();
  const connectionConfig = useConnectionConfig();
  const walletCtx = useWallet();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [withdraw, setWithdraw] = useState({ token: { mint: SOL_MINT.toString(), ata: undefined }, amount: undefined });
  const showModal = () => {
    setIsModalVisible(true);
  };

  let formValidator = useFormValidator();
  async function validateAndWithdraw() {
    let errors = validateForm(formValidator);
    console.log('form validation errors', errors);
    if (errors.length > 0) return;
    const [pda, bump] = await PublicKey.findProgramAddress([walletCtx.publicKey.toBuffer()], new PublicKey(programIds().snowflake));

    const ixs = [];

    if (withdraw.token.mint == SOL_MINT.toString()) {
      ixs.push(
        program.instruction.withdrawNative(new BN(toLamportsByDecimal(+withdraw.amount, 9)), {
          accounts: {
            caller: walletCtx.publicKey,
            systemProgram: SystemProgram.programId,
            pda: pda,
          },
        })
      );
    } else {
      const sourceAta = await findAssociatedTokenAddress(pda, new PublicKey(withdraw.token.mint));
      const [destinationAta, createDestinationAta] = await createAssociatedTokenAccountIfNotExist(walletCtx.publicKey, walletCtx.publicKey, new PublicKey(withdraw.token.mint), connectionConfig.connection);
      const mintInfo = await cachebleMintByKey(connectionConfig.connection, new PublicKey(withdraw.token.mint));
      ixs.push(...createDestinationAta);
      ixs.push(
        program.instruction.withdraw(new BN(toLamports(+withdraw.amount, mintInfo)), {
          accounts: {
            caller: walletCtx.publicKey,
            pda: pda,
            sourceAta: sourceAta,
            destinationAta: destinationAta,
            tokenProgram: programIds().token,
          },
        })
      );
    }
    await new SmartTxnClient(connectionConfig, ixs, [], walletCtx).send();
    setIsModalVisible(false);
    onClose();
  }
  function updateState() {
    setWithdraw({ ...withdraw });
  }
  const handleCancel = () => {
    setIsModalVisible(false);
  };

  return (
    <>
      <Button onClick={showModal}>Withdraw</Button>
      <Modal
        destroyOnClose={true}
        centered
        title="Withdraw"
        maskClosable={false}
        visible={isModalVisible}
        onOk={validateAndWithdraw}
        onCancel={handleCancel}
        footer={[
          <Button key="back" onClick={handleCancel}>
            Cancel
          </Button>,
          <SensitiveButton key="submit" type="primary" onClick={validateAndWithdraw}>
            Withdraw
          </SensitiveButton>,
        ]}>
        <br />

        <FormItem style={{ width: '700px' }} validators={[new FieldRequire('Amount is required.')]} validate={withdraw.amount}>
          <div style={{ display: 'flex' }}>
            <Input name="amount" value={withdraw.amount} onChange={handleInputChange(withdraw, updateState)} placeholder="enter withdrawal amount" />
            &nbsp;
            <TokenInput token={withdraw.token} handleChange={() => {}} />
          </div>
        </FormItem>
        <br />
      </Modal>
    </>
  );
}
