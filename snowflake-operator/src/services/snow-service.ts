import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  Transaction,
} from "@solana/web3.js";
import {
  Provider,
  Program,
  ProgramAccount,
  setProvider,
} from "@project-serum/anchor";
import log4js from "log4js";
import { LOG4JS_CONFIG } from "../constants/log4js-config";
import path from "path";
import {
  MEMO_PROGRAM_ID,
  SNF_PROGRAM_SETTINGS,
  SNOW_PROGRAM_ID,
} from "../constants/program-id";
import {
  RECURRING_FOREVER,
  TRIGGER_TYPE_PROGRAM,
  TRIGGER_TYPE_TIME,
} from "../constants/config";
import { FlowModel } from "../models/flow";
import { ExecutionResult } from "../models/execution-result"

log4js.configure(LOG4JS_CONFIG);
const logger = log4js.getLogger("Operator");

const SNOW_IDL = "../idl/snowflake.json";

export default class SnowService {
  static instance(): SnowService {
    setProvider(Provider.env());

    const idlPath = path.resolve(__dirname, SNOW_IDL);
    const idl = JSON.parse(require("fs").readFileSync(idlPath, "utf8"));
    const program = new Program(idl, SNOW_PROGRAM_ID);

    return new SnowService(program);
  }

  constructor(readonly program: Program) {}

  /**
   * Send a transaction with a memo
   * @returns {Promise<Transaction>}
   */
  async listAllFlows(): Promise<Array<ProgramAccount>> {
    try {
      return this.program.account.flow.all();
    } catch (error) {
      logger.error("Error listing flows: ", error);
      return [];
    }
  }

  /**
   * Check if the flow is ready to be executed
   * @param flow {ProgramAccount}
   * @returns {boolean}
   */
  shouldExecuteFlow(flow: ProgramAccount<FlowModel>): boolean {
    let flowAccount = flow.account;

    if (flowAccount.triggerType == TRIGGER_TYPE_PROGRAM) {
      return (
        flowAccount.remainingRuns > 0 ||
        flowAccount.remainingRuns == RECURRING_FOREVER
      );
    }

    if (flowAccount.triggerType == TRIGGER_TYPE_TIME) {
      let nextExecutionTime = flowAccount.nextExecutionTime.toNumber();
      let retryWindow = flowAccount.retryWindow;
      let now = Math.floor(Date.now() / 1000);
      return (
        nextExecutionTime > 0 &&
        nextExecutionTime < now &&
        now - nextExecutionTime < retryWindow
      );
    }

    return false;
  }

  /**
   * Execute a flow
   * @param flow {ProgramAccount}
   */
  async executeFlow(flow: ProgramAccount<FlowModel>): Promise<ExecutionResult> {
    let executionResult: ExecutionResult;
    const flowAddress = flow.publicKey;

    try {
      const operatorWalletKey = this.program.provider.wallet.publicKey;
      const [pda, _] = await PublicKey.findProgramAddress(
        [flow.account.owner.toBuffer()],
        this.program.programId
      );

      let accounts = {
        flow: flowAddress,
        caller: operatorWalletKey,
        pda: pda,
        systemProgram: SystemProgram.programId,
        programSettings: SNF_PROGRAM_SETTINGS,
      };

      let remainAccountMetas = flow.account.actions.reduce(
        (result: string | any[], current: { accounts: any }) =>
          result.concat(current.accounts),
        []
      );

      let targetProgramMetas = flow.account.actions.reduce(
        (result: any[], current: { program: any }) =>
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

      const tx = await this.sendInstructionWithMemo(ix, "snf_exec_auto");

      executionResult = ExecutionResult.successResult("Execute Flow", flowAddress, tx);
    } catch (error: any) {
      executionResult = ExecutionResult.errorResult("Execute Flow", flowAddress, error.message);
    }

    logger.info(executionResult.getDisplayedMessage());
    return executionResult;
  }

  /**
   * Check if the flow is expired
   * @param flow {ProgramAccount}
   * @returns {Promise<Transaction>}
   */
  isTimedFlowExpired(flow: ProgramAccount): boolean {
    let flowAccount = flow.account;

    if (flowAccount.triggerType == TRIGGER_TYPE_TIME) {
      let nextExecutionTime = flowAccount.nextExecutionTime.toNumber();
      let retryWindow = flowAccount.retryWindow;
      let now = Math.floor(Date.now() / 1000);
      return nextExecutionTime > 0 && now - nextExecutionTime > retryWindow;
    }

    return false;
  }

  /**
   * Mark time flow as error
   * @param flow {ProgramAccount}
   */
  async markTimedFlowAsError(flow: ProgramAccount): Promise<ExecutionResult> {
    let executionResult: ExecutionResult;
    const flowAddress = flow.publicKey;

    try {
      const operatorWalletKey = this.program.provider.wallet.publicKey;
      const [pda, _] = await PublicKey.findProgramAddress(
        [flow.account.owner.toBuffer()],
        this.program.programId
      );

      let accounts = {
        flow: flowAddress,
        caller: operatorWalletKey,
        pda: pda,
        systemProgram: SystemProgram.programId,
        programSettings: SNF_PROGRAM_SETTINGS,
      };

      const ix = await this.program.instruction.markTimedFlowAsError({
        accounts,
      });

      const tx = await this.sendInstructionWithMemo(ix, "snf_exec_mark_error");
      executionResult = ExecutionResult.successResult("Mark Flow as Error", flowAddress, tx);
    } catch (error: any) {
      executionResult = ExecutionResult.errorResult("Mark Flow as Error", flowAddress, error.message);
    }

    logger.info(executionResult.getDisplayedMessage());
    return executionResult;
  }

  /**
   * Send a transaction with a memo
   * @param ix {Instruction}
   * @param memo {string}
   * @returns {Promise<Transaction>}
   */
  async sendInstructionWithMemo(
    ix: TransactionInstruction,
    memo: string
  ): Promise<string> {
    const connection = this.program.provider.connection;
    const wallet = this.program.provider.wallet;

    const memoIx = new TransactionInstruction({
      keys: [],
      data: Buffer.from(memo, "utf-8"),
      programId: MEMO_PROGRAM_ID,
    });

    const transaction = new Transaction();
    transaction.add(ix);
    transaction.add(memoIx);
    transaction.recentBlockhash = (
      await connection.getLatestBlockhash("max")
    ).blockhash;
    transaction.feePayer = wallet.publicKey;

    const signedTransaction = await wallet.signTransaction(transaction);

    return connection.sendRawTransaction(signedTransaction.serialize());
  }

  /**
   * Event subscriber for the flow changed event
   * @param callback {Function}
   */
  onFlowsChanged(callback: (flow: ProgramAccount) => void) {
    const connection = this.program.provider.connection;
    return connection.onProgramAccountChange(
      SNOW_PROGRAM_ID,
      (keyedAccountInfo, _) => {
        try {
          let accountData = keyedAccountInfo.accountInfo.data;
          callback({
            publicKey: keyedAccountInfo.accountId,
            account: this.program.coder.accounts.decodeUnchecked("Flow", accountData),
          });
        } catch (error: any) {
          logger.error("Error writing new flow to cache ", error);
        }
      }
    );
  }
}
