import { WalletMultiButton } from '@solana/wallet-adapter-ant-design';
import { Button, Col, PageHeader, Row } from 'antd';
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TokenIcon } from '../../components/TokenIcon';
import { sendTransaction, useConnection, useConnectionConfig } from '../../contexts/connection';
import { useMarkets } from '../../contexts/market';
import { useUserBalance, useUserTotalBalance } from '../../hooks';
import { programIds, WRAPPED_SOL_MINT } from '../../utils/ids';
import { formatUSD } from '../../utils/utils';

import { Account, Connection, CreateAccountParams, Keypair, PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { AccountLayout, MintLayout, Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useWallet, WalletContextState } from '@solana/wallet-adapter-react';
import { notify } from '../../utils/notifications';
import { createSplAccount } from '../../utils/tokens';
import programIdl from '../../idl/snowflake.json';
import BufferLayout from 'buffer-layout';
import { AccountMeta } from '@solana/web3.js';
import { Instruction } from '@project-serum/anchor';
import { FlowList } from '../../components/FlowList';

export const HomeView = () => {
  const { marketEmitter, midPriceInUSD } = useMarkets();
  const { tokenMap } = useConnectionConfig();
  const SRM_ADDRESS = 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt';
  const SRM = useUserBalance(SRM_ADDRESS);
  const SOL = useUserBalance(WRAPPED_SOL_MINT);
  const { balanceInUSD: totalBalanceInUSD } = useUserTotalBalance();

  useEffect(() => {
    const refreshTotal = () => {};

    const dispose = marketEmitter.onMarket(() => {
      refreshTotal();
    });

    refreshTotal();

    return () => {
      dispose();
    };
  }, [marketEmitter, midPriceInUSD, tokenMap]);

  const walletCtx: WalletContextState = useWallet();

  const connection: Connection = useConnection();

  async function deposit() {
    transfer();
    //  delegateAuthority();
  }

  async function delegateAuthority() {
    let instructions: TransactionInstruction[] = [];
    const [pda, bump] = await PublicKey.findProgramAddress([Buffer.from('snowflake')], programIds().snowflake);
    let tokenAccount = new PublicKey('B24iEpkwFMVTgw8YUT43mnWfZCUfEJRqpaFhFL5176RE');
    instructions.push(Token.createApproveInstruction(programIds().token, tokenAccount, pda, walletCtx.publicKey, [], 100000000000));

    let txn = await sendTransaction(connection, walletCtx, instructions, []);
    console.log(txn);
    notify({
      message: 'Sucess !',
      type: 'success',
      description: 'Transaction ' + txn,
    });
  }

  const anchor = require('@project-serum/anchor');

  async function executeFlow() {
    let program = anchorProgram();

    let flowAddress = 'GRPkP3c3CjWTEYTTJzr67Ehj61z7J1hJc9KefrFReMpi';
    let flow = await program.account.flow.fetch(flowAddress);
    console.log('flow.pubkey', flow.pubkey);

    let accounts = {
      flow: new PublicKey(flowAddress),
    };

    let remainAccountMetas: AccountMeta[] = flow.actions.reduce((result, current) => result.concat(current.targetAccounts), []);
    let targetProgramMetas = flow.actions.reduce(
      (result, current) =>
        result.concat({
          pubkey: current.targetProgram,
          isSigner: false,
          isWritable: false,
        }),
      []
    );
    remainAccountMetas = remainAccountMetas.concat(targetProgramMetas);
    console.log('remaining account metas', remainAccountMetas);

    const tx = await program.rpc.executeFlow({
      accounts: accounts,
      remainingAccounts: remainAccountMetas,
    });

    console.log('Your transaction signature', tx);
  }

  async function createFlow() {
    let instruction = Buffer.from('afaf6d1f0d989bed', 'hex');
    let program = anchorProgram();
    const flow = anchor.web3.Keypair.generate();
    let flow_info = {
      name: 'flow basic',
      triggerCondition: 'trigger xyz',
      actions: [
        {
          name: 'action basic_0',
          targetProgram: new PublicKey('CkU18ja7QRKhxnQSmcxm7w3fvfEQPmJbM8QfMVncTWT1'),
          targetAccounts: [{ pubkey: new PublicKey('A81yKd3HLdy4p9go8x8V6UCuWsdZU7i9TErkJ1C2yoGY'), isSigner: false, isWritable: false }],
          instruction: instruction,
        },
        {
          name: 'action basic_1',
          targetProgram: new PublicKey('CkU18ja7QRKhxnQSmcxm7w3fvfEQPmJbM8QfMVncTWT1'),
          targetAccounts: [{ pubkey: new PublicKey('A81yKd3HLdy4p9go8x8V6UCuWsdZU7i9TErkJ1C2yoGY'), isSigner: false, isWritable: false }],
          instruction: instruction,
        },
      ],
    };

    const tx = await program.rpc.createFlow(flow_info, {
      accounts: {
        flow: flow.publicKey,
        flowOwner: walletCtx.publicKey,
        systemProgram: SystemProgram.programId,
      },
      //remainingAccounts : [remainAccount]
      signers: [flow],
    });
    console.log('Your transaction signature', tx);
    let fetchedFlow = await program.account.flow.fetch(flow.publicKey);
    console.log(fetchedFlow);
  }

  async function createJob() {
    let program = anchorProgram();
    const job_info = anchor.web3.Keypair.generate();
    const job_name = 'call basic_0';
    const job_instruction = 'af af 6d 1f 0d 98 9b ed';
    const job_target_program_account_list = [new PublicKey('GBNGSoud28MmHBSZq44PZCVBdx24YNmUJ9DaMDefEaGo')];

    const tx = await program.rpc.createJob(job_name, job_instruction, job_target_program_account_list, {
      accounts: {
        jobInfo: job_info.publicKey,
        jobOwner: walletCtx.publicKey,
        targetProgram: new PublicKey('CkU18ja7QRKhxnQSmcxm7w3fvfEQPmJbM8QfMVncTWT1'),
        systemProgram: SystemProgram.programId,
      },
      //remainingAccounts : [remainAccount]
      signers: [job_info],
    });
    console.log('Your transaction signature', tx);
  }

  async function executeJob() {
    let program = anchorProgram();

    /*  let remainAccount = { pubkey: new PublicKey("CkU18ja7QRKhxnQSmcxm7w3fvfEQPmJbM8QfMVncTWT1"),
              isSigner: false, isWritable: false };*/

    let jobAddress = '6ewqbE6kDpVvjiNihoYXKY8mxm6wnbDVQHV4yXXSGZQA';
    let job = await program.account.job.fetch(jobAddress);
    console.log(job);

    let accountForExecuteJobsAction = {
      targetProgram: job.jobTargetProgramPubkey,
      jobInfo: new PublicKey(jobAddress),
      // account1 : new PublicKey("GBNGSoud28MmHBSZq44PZCVBdx24YNmUJ9DaMDefEaGo"),
    };

    let accountsForTargetProgramAction = job.jobTargetProgramAccountList;

    let aTestAccount = anchor.web3.Keypair.generate();

    let remainAccountMetas: AccountMeta[] = [
      { isSigner: false, isWritable: true, pubkey: job.jobTargetProgramAccountList[0] },
      { isSigner: true, isWritable: true, pubkey: aTestAccount.publicKey },
    ];

    console.log('remaining account metas', remainAccountMetas);

    const tx = await program.rpc.executeJob({
      accounts: accountForExecuteJobsAction,
      remainingAccounts: remainAccountMetas,
      signers: [aTestAccount],
    });

    console.log('Your transaction signature', tx);
  }

  async function callBasicProgram() {
    const anchor = require('@project-serum/anchor');
    const provider = new anchor.Provider(connection, walletCtx, {
      preflightCommitment: 'recent',
    });

    const basic0Idl = {
      version: '0.0.0',
      name: 'basic_0',
      instructions: [
        {
          name: 'initialize',
          accounts: [
            {
              name: 'tokenAccount',
              isMut: false,
              isSigner: false,
            },
          ],
          args: [],
        },
      ],
      metadata: {
        address: 'CkU18ja7QRKhxnQSmcxm7w3fvfEQPmJbM8QfMVncTWT1',
      },
    };

    const basic0ProgramId = new PublicKey('CkU18ja7QRKhxnQSmcxm7w3fvfEQPmJbM8QfMVncTWT1');

    const program = new anchor.Program(basic0Idl, basic0ProgramId, provider);

    const tx = await program.rpc.initialize({
      accounts: { tokenAccount: new PublicKey('Ey5W17fT6rYBM38okd9rs1vudeaEStt5VRbCR1iWuxS2') },
    });

    console.log('Your transaction signature', tx);
  }

  async function getAvailablePools() {
    alert('get available pool');
    const ACCOUNT_LAYOUT = BufferLayout.struct([BufferLayout.blob(8, 'discriminator')]);

    /* let filters = [
             {
                 memcmp: {
                     // @ts-ignore
                     offset: ACCOUNT_LAYOUT.offsetOf("discriminator"),
                     bytes: publicKey.toBase58(),
                 },
             },
             {
                 dataSize: ACCOUNT_LAYOUT.span,
             },
         ];*/
    let allAccounts = await connection.getProgramAccounts(programIds().snowflake, {
      commitment: connection.commitment,
    });
    console.log('all accounts', allAccounts);

    const program = anchorProgram();

    let allSnowflakePoolInfoAccounts = await program.account.snowflakePoolInfo.all();
    console.log('available snowflake pool infos', allSnowflakePoolInfoAccounts);

    let poolInfo = await anchorProgram().account.snowflakePoolInfo.fetch('6sk7d3te2eFKzmoZqELCxfP4JqeN9X9owcP2sgTVgcUT');
    console.log('pool info by address', poolInfo);
  }
  async function test() {
    const [authority, nonce] = await PublicKey.findProgramAddress([new PublicKey('EERvEgbjiGnBxEpPz4XeNMWEpAgTevXDpBksTMsbNFFA').toBuffer()], programIds().snowflake); // replace by snowflake program id

    alert(authority + ' - ' + nonce);
  }

  function anchorProgram() {
    const provider = new anchor.Provider(connection, walletCtx, {
      skipPreflight: true,
      preflightCommitment: 'recent',
    });

    const program = new anchor.Program(programIdl, programIds().snowflake, provider);
    return program;
  }

  async function initTest() {
    alert('init pool state account');
    const anchor = require('@project-serum/anchor');
    const provider = new anchor.Provider(connection, walletCtx, {
      preflightCommitment: 'recent',
    });

    const program = new anchor.Program(programIdl, programIds().snowflake, provider);

    const snowflakePoolInfo = anchor.web3.Keypair.generate();
    // localnet
    const localnetAccounts = {
      snowflakePoolInfo: snowflakePoolInfo.publicKey,
      // authority : walletCtx.publicKey,
      systemProgram: SystemProgram.programId,
    };
    const tx = await program.rpc.initTest({
      accounts: localnetAccounts,
      signers: [snowflakePoolInfo],
    });

    console.log('Your transaction signature', tx);
  }
  async function initSnowflakePoolAccount() {
    alert('init pool state account');
    const anchor = require('@project-serum/anchor');
    const provider = new anchor.Provider(connection, walletCtx, {
      preflightCommitment: 'recent',
    });

    const program = new anchor.Program(programIdl, programIds().snowflake, provider);

    const snowflakePoolInfo = new Account();
    // devnet
    const devnetAccounts = {
      snowflakePoolInfo: snowflakePoolInfo.publicKey,
      tokenHoldingAcct: new PublicKey('H8ZN4DAQQCcKzwZR1EU715T2cdEWGgQYgpLCzFUtHKcp'),
      stakerLiquidityMint: new PublicKey('6RAuyN7a6VF2uo6EVbD8mV1eSVJrA2yLLFXm6vyP8drG'),
      authority: walletCtx.publicKey,
    };

    // localnet
    const localnetAccounts = {
      snowflakePoolInfo: snowflakePoolInfo.publicKey,
      tokenHoldingAcct: new PublicKey('GFHuexz7D6oAHKU3yoqD6D3qYbXi7b5AXVafMpEVHMRt'),
      stakerLiquidityMint: new PublicKey('HY3r17T7cUWeTxLP7581yqUcBQaczbw5m8BZ1SPS5KG7'),
      authority: walletCtx.publicKey,
      systemProgram: SystemProgram.programId,
    };
    const tx = await program.rpc.initialize({
      accounts: localnetAccounts,
      signers: [snowflakePoolInfo],
    });

    console.log('Your transaction signature', tx);

    // const snowflake_pool_info = new PublicKey('FtHVbmP4Z5PqopgrCWXR6ToqpvcXPT7krtZiqTn6oMqT');
  }

  async function transfer() {
    let program = anchorProgram();

    let tokenAccount = new PublicKey('B24iEpkwFMVTgw8YUT43mnWfZCUfEJRqpaFhFL5176RE');
    const [pda, bump] = await PublicKey.findProgramAddress([Buffer.from('snowflake')], programIds().snowflake);
    console.log('pda account', pda.toString());
    let accounts = {
      tokenProgram: new PublicKey(TOKEN_PROGRAM_ID),
      from: tokenAccount,
      to: new PublicKey('2Hken8njArMH7oZVAXthstjMfkJMySaSCatJM1pZN2sZ'),
      pdaAuthority: pda,
    };

    const tx = await program.rpc.payEmployee({
      accounts: accounts,
    });

    notify({
      message: ' success !',
      type: 'success',
      description: 'Transaction ' + tx,
    });
    console.log('Your transaction signature', tx);
  }

  async function simpleTest() {
    alert('simple test');
    const SOL_MINT_ADDRESS_DEV_NET = 'So11111111111111111111111111111111111111112';

    let instructions: TransactionInstruction[] = [];

    // create mint account for liquidity token
    const liquidityMintAccount = new Account();

    instructions.push(
      SystemProgram.createAccount({
        fromPubkey: walletCtx.publicKey,
        newAccountPubkey: liquidityMintAccount.publicKey,
        lamports: await connection.getMinimumBalanceForRentExemption(MintLayout.span),
        space: MintLayout.span,
        programId: programIds().token,
      })
    );

    let txn = await sendTransaction(connection, walletCtx, instructions, [liquidityMintAccount]);
    console.log(txn);
    notify({
      message: 'Account created !',
      type: 'success',
      description: 'Transaction ' + txn,
    });
  }

  async function createPool() {
    alert('deposit');
    const SOL_MINT_ADDRESS_DEV_NET = 'So11111111111111111111111111111111111111112';

    let instructions: TransactionInstruction[] = [];

    // create mint account for liquidity token
    const liquidityMintAccount = new Account();

    instructions.push(
      SystemProgram.createAccount({
        fromPubkey: walletCtx.publicKey,
        newAccountPubkey: liquidityMintAccount.publicKey,
        lamports: await connection.getMinimumBalanceForRentExemption(MintLayout.span),
        space: MintLayout.span,
        programId: programIds().token,
      })
    );

    // setup program pool state account
    const snowflakeAccount = new Account();
    const [authority, nonce] = await PublicKey.findProgramAddress([snowflakeAccount.publicKey.toBuffer()], programIds().snowflake); // replace by snowflake program id

    // create token holding account USDC
    const accountTokenRentExempt = await connection.getMinimumBalanceForRentExemption(AccountLayout.span);
    const splHoldingAccount = createSplAccount(instructions, walletCtx.publicKey, accountTokenRentExempt, new PublicKey(SOL_MINT_ADDRESS_DEV_NET), authority, AccountLayout.span);

    // create program state account
    instructions.push(
      SystemProgram.createAccount({
        fromPubkey: walletCtx.publicKey,
        lamports: accountTokenRentExempt,
        newAccountPubkey: snowflakeAccount.publicKey,
        programId: programIds().snowflake,
        space: AccountLayout.span,
      })
    );

    let txn = await sendTransaction(connection, walletCtx, instructions, [liquidityMintAccount, snowflakeAccount, splHoldingAccount]);
    console.log(txn);
    notify({
      message: 'Account created !',
      type: 'success',
      description: 'Transaction ' + txn,
    });

    // pre-condition : PDA program pool account created represent the USDC pool
    // find or create USDC pool

    // user send an intruction to deposit an amount of USD from user wallet to the pool account
    // inside the rust program, a poolshare token is minted and transferred back to the user

    // find or create user state program account (PDA) if not exist based on authority field
    // find criteria : user_state_program_account.authority = wallet.pubkey

    // find or create token account if not exist based on owner field
    // find criteria : token_program_account.owner = user_state_program_account.pubkey

    // transfer fund from the user wallet to the token account above
  }

  async function newFlow() {
    alert('create new flow');
  }

  return (
    <div style={{ width: '100%' }}>
      <PageHeader
        ghost={false}
        title="Your Automations"
        extra={[
          <Link key="editFlow" to="/editflow">
            <Button type="primary" size="large">
              + New Automation
            </Button>
          </Link>,
        ]}></PageHeader>

      {walletCtx.publicKey && <FlowList />}
    </div>
  );
};
