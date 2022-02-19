import { PublicKey, SystemProgram, TransactionInstruction, Transaction, Keypair } from "@solana/web3.js";
import {Provider, Program, ProgramAccount, setProvider } from "@project-serum/anchor";
import log4js from 'log4js';

log4js.configure('log4js.json');
const logger = log4js.getLogger("Operator");

const MEMO_PROGRAM_ID = new PublicKey('Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo');
// const SNOW_PROGRAM_ID = '86G3gad5tVjJxdQmmdQ6E3rLQNnDNh4KYcqiiSd7Az63';
const SNOW_PROGRAM_ID = '3K4NPJKUJLbgGfxTJumtxv3U3HeJbS3nVjwy8CqFj6F2';
const SNOW_IDL = 'idl/snowflake.json';
const SNF_APP_SETTINGS = new PublicKey('BFHUu5FLD32mX2KtvDgzfPYNfANqjKmbUG3ow1wFPwj6');

const TRIGGER_TYPE_TIME = 2;
const TRIGGER_TYPE_PROGRAM = 3;
const RECURRING_FOREVER = -999;

export default class SnowService {
  static instance(): SnowService {
    setProvider(Provider.env());

    const programId = new PublicKey(SNOW_PROGRAM_ID);
    const idl = JSON.parse(require('fs').readFileSync(SNOW_IDL, 'utf8'));
    const program = new Program(idl, programId);

    return new SnowService(program);
  }

  constructor(
    readonly program: Program
  ) { }

  async listFlowsToBeExecuted(): Promise<Array<ProgramAccount>> {
    let results: Array<ProgramAccount> = [];
    let dataSizeFilter = {
      dataSize: 4994,
    };

    try {
      const allFlows = await this.program.account.flow.all([dataSizeFilter]);
      
      for (let flow of allFlows) {
        if (this.shouldExecuteFlow(flow)) {
          results.push(flow);
        }
      }
    } catch (error) {
      logger.error('Error listing flows to be executed: ', error);
    }

    return results;
  }

  shouldExecuteFlow(flow: ProgramAccount): boolean {
    let flowAccount = flow.account;

    if (flowAccount.triggerType == TRIGGER_TYPE_PROGRAM) {
      return flowAccount.remainingRuns > 0 || flowAccount.remainingRuns == RECURRING_FOREVER;
    }

    if (flowAccount.triggerType == TRIGGER_TYPE_TIME) {
      let nextExecutionTime = flowAccount.nextExecutionTime.toNumber();
      let retryWindow = flowAccount.retryWindow.toNumber();
      let now = Math.floor(Date.now() / 1000);
      return nextExecutionTime > 0 && nextExecutionTime < now && now - nextExecutionTime < retryWindow;
    }

    return false;
  }

  async excecuteFlow(flow: ProgramAccount) {
    try {
      const flowAddress = flow.publicKey;
      const operatorWalletKey = this.program.provider.wallet.publicKey;
      const [pda, bump] = await PublicKey.findProgramAddress([flow.account.flowOwner.toBuffer()], this.program.programId);
      
      let accounts = { 
        flow: flowAddress,
        caller: operatorWalletKey,
        pda: pda,
        systemProgram: SystemProgram.programId,
        appSettings: SNF_APP_SETTINGS,
      };

      let remainAccountMetas = flow.account.actions.reduce(
        (result: string | any[], current: { accounts: any; }) => result.concat(current.accounts), []
      );

      let targetProgramMetas = flow.account.actions.reduce(
        (result: any[], current: { program: any; }) =>
          result.concat({
            pubkey: current.program,
            isSigner: false,
            isWritable: false,
          }),
        []
      );

      remainAccountMetas = remainAccountMetas.concat(targetProgramMetas);

      const ix = await this.program.instruction.executeScheduledFlow({
        accounts: accounts,
        remainingAccounts: remainAccountMetas,
      });

      const tx = await this.sendInstructionWithMemo(ix, 'snf_exec_auto');

      logger.info('Executed flow: ', flowAddress.toBase58(), '. Transaction signature:', tx);
    } catch (error) {
      logger.error('Error excecuting flow: ', error);
    }
  }

  async listExpiredFlows(): Promise<Array<ProgramAccount>> {
    let results: Array<ProgramAccount> = [];
    let dataSizeFilter = {
      dataSize: 4994,
    };

    try {
      const allFlows = await this.program.account.flow.all([dataSizeFilter]);
      
      for (let flow of allFlows) {
        if (this.isTimedFlowExpired(flow)) {
          results.push(flow);
        }
      }
    } catch (error) {
      logger.error('Error listing expired flows: ', error);
    }

    return results;
  }
  
  isTimedFlowExpired(flow: ProgramAccount): boolean {
    let flowAccount = flow.account;

    if (flowAccount.triggerType == TRIGGER_TYPE_TIME) {
      let nextExecutionTime = flowAccount.nextExecutionTime.toNumber();
      let retryWindow = flowAccount.retryWindow.toNumber();
      let now = Math.floor(Date.now() / 1000);
      return nextExecutionTime > 0 && now - nextExecutionTime > retryWindow;
    }

    return false;
  }

  async markTimedFlowAsError(flow: ProgramAccount) {
    try {
      const flowAddress = flow.publicKey;
      const operatorWalletKey = this.program.provider.wallet.publicKey;
      const [pda, bump] = await PublicKey.findProgramAddress([flow.account.flowOwner.toBuffer()], this.program.programId);
      
      let accounts = { 
        flow: flowAddress,
        caller: operatorWalletKey,
        pda: pda,
        systemProgram: SystemProgram.programId,
        appSettings: SNF_APP_SETTINGS,
      };

      const ix = await this.program.instruction.markTimedFlowAsError({
        accounts,
      });

      const tx = await this.sendInstructionWithMemo(ix, 'snf_exec_mark_error');

      logger.info('Marked flow as error', flow.publicKey.toBase58(), '. Transaction signature: ', tx);
    } catch (error) {
      logger.error('Error marking flow as error: ', error);
    }
  }

  async sendInstructionWithMemo(ix: TransactionInstruction, memo: string): Promise<string> {
    const connection = this.program.provider.connection;
    const wallet = this.program.provider.wallet;

    const memoIx = new TransactionInstruction({
      keys: [],
      data: Buffer.from(memo, 'utf-8'),
      programId: MEMO_PROGRAM_ID,
    });

    const transaction = new Transaction();
    transaction.add(ix);
    transaction.add(memoIx);
    transaction.recentBlockhash = (await connection.getRecentBlockhash('max')).blockhash;
    transaction.feePayer = wallet.publicKey;

    const signedTransaction = await wallet.signTransaction(transaction);
    
    return connection.sendRawTransaction(signedTransaction.serialize())
  }

}