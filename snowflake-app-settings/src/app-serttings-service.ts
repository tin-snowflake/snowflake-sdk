import { PublicKey, SystemProgram, TransactionInstruction, Transaction, Keypair } from "@solana/web3.js";
import {Provider, Program, ProgramAccount, setProvider } from "@project-serum/anchor";

const SNOW_PROGRAM_ID = '3K4NPJKUJLbgGfxTJumtxv3U3HeJbS3nVjwy8CqFj6F2';
const SNOW_IDL = 'idl/snowflake.json';
const SNF_APP_SETTINGS = new PublicKey('BFHUu5FLD32mX2KtvDgzfPYNfANqjKmbUG3ow1wFPwj6');

export default class AppSettingsService {
  static instance(): AppSettingsService {
    setProvider(Provider.env());

    const programId = new PublicKey(SNOW_PROGRAM_ID);
    const idl = JSON.parse(require('fs').readFileSync(SNOW_IDL, 'utf8'));
    const program = new Program(idl, programId);

    return new AppSettingsService(program);
  }

  constructor(
    readonly program: Program
  ) { }


  async initAppSettingsAccount() {
    let secretKey =  Buffer.from(JSON.parse(require("fs").readFileSync('key.json', {encoding: "utf-8",})));
    let appSettingKeyPair = Keypair.fromSecretKey(secretKey);
    console.log("App setting key: ", appSettingKeyPair.publicKey.toBase58());
     
    const ix = await this.program.instruction.initAppSettings(
      {
        accounts: {
          appSettings: appSettingKeyPair.publicKey,
          snfFoundation: this.program.provider.wallet.publicKey,
          systemProgram: SystemProgram.programId
        },
        signers: [],
      }
    );

    const tx = await this.sendInstruction(ix, [appSettingKeyPair]);
    console.log("transaction signature: ", tx);
  }

  async retriveAppSettingsAccount() {
    const appSettings = await this.program.account.appSettings.fetch(SNF_APP_SETTINGS);
    console.log("App Settings Account");
    console.log("SNF Foundation Key: ", appSettings.snfFoundation.toBase58());
    console.log("Operators: ");
    for (let o of appSettings.operators) {
      console.log(o.toBase58());
    }
    console.log("Operator to check index: ", appSettings.operatorToCheckIndex);
    console.log("Last Check: ", appSettings.lastCheckTime.toNumber());   
  }

  async registerOperator(operatorKey: string) {
    let operator = new PublicKey(operatorKey);
    
    const ix = await this.program.instruction.registerOperator(
      {
        accounts: {
          appSettings: SNF_APP_SETTINGS,
          caller: this.program.provider.wallet.publicKey,
          operator: operator
        },
        signers: [],
      }
    );

    const tx = await this.sendInstruction(ix, []);
    console.log("transaction signature: ", tx);
  }

  async checkOperator() {
    let appSettings = new PublicKey("69UVTJVEyhKQvCC6wGzddH4zmNUs7nEQrryRoP7umZGL");
    
    const ix = await this.program.instruction.checkOperator(
      {
        accounts: {
          appSettings: appSettings,
          caller: this.program.provider.wallet.publicKey,
        },
        signers: [],
      }
    );

    const tx = await this.sendInstruction(ix, []);
    console.log("transaction signature: ", tx);
  }

  async retriveFlowAccount(flowKey: String) {
    let flowPubKey = new PublicKey(flowKey);
    const flow = await this.program.account.flow.fetch(flowPubKey);
    console.log("Flow Details: ", flow);
  }


  async sendInstruction(ix: TransactionInstruction, signers: Keypair[]): Promise<string> {
    const connection = this.program.provider.connection;
    const wallet = this.program.provider.wallet;

   
    const transaction = new Transaction();
    transaction.add(ix);
    transaction.recentBlockhash = (await connection.getRecentBlockhash('max')).blockhash;
    transaction.feePayer = wallet.publicKey;

    if (signers.length > 0) {
      transaction.partialSign(...signers);
    }

    const signedTransaction = await wallet.signTransaction(transaction);
    
    return connection.sendRawTransaction(signedTransaction.serialize())
  }

}