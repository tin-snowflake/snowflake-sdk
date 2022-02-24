import { PublicKey, SystemProgram, TransactionInstruction, Transaction, Keypair } from "@solana/web3.js";
import {Provider, Program, ProgramAccount, setProvider } from "@project-serum/anchor";

const SNOW_PROGRAM_ID = '3K4NPJKUJLbgGfxTJumtxv3U3HeJbS3nVjwy8CqFj6F2';
const SNOW_IDL = 'idl/snowflake.json';
const SNF_PROGRAM_SETTINGS = new PublicKey('4zngo1n4BQQU8MHi2xopBppaT29Fv6jRLZ5NwvtdXpMG');

export default class ProgramSettingsService {
  static instance(): ProgramSettingsService {
    setProvider(Provider.env());

    const programId = new PublicKey(SNOW_PROGRAM_ID);
    const idl = JSON.parse(require('fs').readFileSync(SNOW_IDL, 'utf8'));
    const program = new Program(idl, programId);

    return new ProgramSettingsService(program);
  }

  constructor(
    readonly program: Program
  ) { }


  async initProgramSettingsAccount() {
    let secretKey =  Buffer.from(JSON.parse(require("fs").readFileSync('key.json', {encoding: "utf-8",})));
    let appSettingKeyPair = Keypair.fromSecretKey(secretKey);
    console.log("App setting key: ", appSettingKeyPair.publicKey.toBase58());
     
    const ix = await this.program.instruction.initProgramSettings(
      {
        accounts: {
          programSettings: appSettingKeyPair.publicKey,
          snfFoundation: this.program.provider.wallet.publicKey,
          systemProgram: SystemProgram.programId
        },
        signers: [],
      }
    );

    const tx = await this.sendInstruction(ix, [appSettingKeyPair]);
    console.log("transaction signature: ", tx);
  }

  async retriveProgramSettingsAccount() {
    const programSettings = await this.program.account.programSettings.fetch(SNF_PROGRAM_SETTINGS);
    console.log("App Settings Account");
    console.log("SNF Foundation Key: ", programSettings.snfFoundation.toBase58());
    console.log("Operators: ");
    for (let o of programSettings.operators) {
      console.log(o.toBase58());
    }
    console.log("Operator to check index: ", programSettings.operatorToCheckIndex);
    console.log("Last Check: ", programSettings.lastCheckTime.toNumber());   
  }

  async registerOperator(operatorKey: string) {
    let operator = new PublicKey(operatorKey);
    
    const ix = await this.program.instruction.registerOperator(
      {
        accounts: {
          programSettings: SNF_PROGRAM_SETTINGS,
          snfFoundation: this.program.provider.wallet.publicKey,
          operator: operator
        },
        signers: [],
      }
    );

    const tx = await this.sendInstruction(ix, []);
    console.log("transaction signature: ", tx);
  }

  async checkOperator() {
    let programSettings = new PublicKey("69UVTJVEyhKQvCC6wGzddH4zmNUs7nEQrryRoP7umZGL");
    
    const ix = await this.program.instruction.checkOperator(
      {
        accounts: {
          programSettings: programSettings,
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