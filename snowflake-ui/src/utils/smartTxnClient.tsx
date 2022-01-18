import { Account, Connection, Keypair, SimulatedTransactionResponse, Transaction, TransactionInstruction } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { notify } from './notifications';
import { ExplorerLink } from '../components/ExplorerLink';
import React from 'react';
import { ConnectionConfig } from '../contexts/connection';
import { QuietError } from './errorHandlers';
import { Button, Popover } from 'antd';
type TxId = string;

/*
  SmartTxnClient detects if the transaction size exceeds limit and splits the transaction automatically.
  It also does error notifications automatically.
 */
export class SmartTxnClient {
  connectionConfig: ConnectionConfig;
  ixs: TransactionInstruction[];
  signers: Keypair[];
  wallet: WalletContextState;
  connection: Connection;
  constructor(connnectionConfig, instructions, signers, wallet) {
    this.connectionConfig = connnectionConfig;
    this.connection = connnectionConfig.connection;
    this.ixs = instructions;
    this.signers = signers;
    this.wallet = wallet;
  }

  async send(): Promise<TxId[]> {
    let txn = await this.makeTxn(this.ixs);
    let txns = await this.split(txn);

    let signedTxns = await this.wallet.signAllTransactions(txns);

    let txIds: TxId[] = [];

    for (var item of signedTxns) {
      txIds.push(await this.sendOne(item));
    }

    return txIds;
  }

  async simulate(): Promise<SimulatedTransactionResponse> {
    let connection = this.connection;
    let txn = await this.makeTxn(this.ixs);
    const status = (await connection.simulateTransaction(txn)).value;
    const content = (
      <>
        {status.logs.map(function (log, i) {
          return <div key={i}>{log}</div>;
        })}
      </>
    );

    const logViewer = (
      <Popover content={content} title="Simulation Log">
        <Button>Show log</Button>
      </Popover>
    );
    if (status?.err) {
      notify({
        message: 'Validation failed !',
        type: 'error',
        description: logViewer,
      });
    } else {
      console.log('simulate error', status);
      notify({
        message: 'Validation succeeded !',
        type: 'success',
        description: logViewer,
      });
    }
    return status;
  }

  async sendOne(txn: Transaction): Promise<TxId> {
    console.log('--- smart txn - sending one ...', txn);
    let connection = this.connection;
    let rawTxn = txn.serialize();
    let options = {
      skipPreflight: true,
      commitment: 'confirmed',
    };
    const txid = await connection.sendRawTransaction(rawTxn, options);

    const status = (await connection.confirmTransaction(txid, options && (options.commitment as any))).value;

    if (status?.err) {
      const errors = await getErrorForTransaction(connection, txid);
      notify({
        message: 'Transaction failed !',
        type: 'error',
        description: (
          <>
            {errors.map(err => (
              <div>{err}</div>
            ))}
            <ExplorerLink address={txid} type="transaction" env={this.connectionConfig.env} />
          </>
        ),
      });
      throw new QuietError(`Raw transaction ${txid} failed (${JSON.stringify(status)})`);
    } else {
      notify({
        message: 'Transaction succeeded !',
        type: 'success',
        description: (
          <span>
            <ExplorerLink address={txid} type="transaction" env={this.connectionConfig.env} />
          </span>
        ),
      });
    }
    return txid;
  }

  async makeTxn(instructions: TransactionInstruction[]): Promise<Transaction> {
    let transaction = new Transaction();
    instructions.forEach(instruction => transaction.add(instruction));
    transaction.recentBlockhash = (await this.connection.getRecentBlockhash('max')).blockhash;
    transaction.feePayer = this.wallet.publicKey;
    if (this.signers.length > 0) {
      transaction.partialSign(...this.signers);
    }
    return transaction;
  }

  async split(txn: Transaction): Promise<Transaction[]> {
    try {
      txn.serialize({
        verifySignatures: false,
      });
    } catch (e) {
      const ixs = txn.instructions;

      if (ixs.length == 1) {
        throw new Error('Transaction size exceeds limit, unable to split further ... ');
      }
      console.log('Attempt to split txn, verify that exception is due to large txn size ...', e);
      const middle = Math.ceil(ixs.length / 2);
      const left: TransactionInstruction[] = ixs.splice(0, middle);
      const right = ixs.splice(-middle);
      return [...(await this.split(await this.makeTxn(left))), ...(await this.split(await this.makeTxn(right)))];
    }
    return [txn];
  }
}

const getErrorForTransaction = async (connection: Connection, txid: string) => {
  // wait for all confirmation before geting transaction
  await connection.confirmTransaction(txid, 'max');

  const tx = await connection.getParsedConfirmedTransaction(txid);

  const errors: string[] = [];
  if (tx?.meta && tx.meta.logMessages) {
    tx.meta.logMessages.forEach(log => {
      const regex = /Error: (.*)/gm;
      let m;
      while ((m = regex.exec(log)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
          regex.lastIndex++;
        }

        if (m.length > 1) {
          errors.push(m[1]);
        }
      }
    });
  }

  return errors;
};
