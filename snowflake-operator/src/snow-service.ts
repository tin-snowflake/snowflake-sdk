import { PublicKey } from "@solana/web3.js";
import {Provider, Program, ProgramAccount, setProvider } from "@project-serum/anchor";

const SNOW_PROGRAM_ID = '86G3gad5tVjJxdQmmdQ6E3rLQNnDNh4KYcqiiSd7Az63';
const SNOW_IDL = 'idl/snowflake.json';

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
      dataSize: 4992,
    };

    try {
      const allFlows = await this.program.account.flow.all([dataSizeFilter]);
      console.log('All flows: ', allFlows);
      
      for (let flow of allFlows) {
        if (this.shouldExecuteFlow(flow)) {
          results.push(flow);
        }
      }
    } catch (error) {
      console.log('Error listing flows to be executed: ', error);
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
    console.log('Executing flow: ', flow);

    try {
      let flowAddress = flow.publicKey;

      let accounts = { flow: flowAddress };

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

      const tx = await this.program.rpc.executeScheduledFlow({
        accounts: accounts,
        remainingAccounts: remainAccountMetas,
      });

      console.log('Your transaction signature', tx);
    } catch (error) {
      console.log('Error excecuting flow: ', error);
    }
  }
}