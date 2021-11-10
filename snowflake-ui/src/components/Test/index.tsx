import React, { useEffect, useState } from 'react';
import { Button } from 'antd';
import { sendTransaction, useConnection } from '../../contexts/connection';
import { useWallet } from '@solana/wallet-adapter-react';
import { StableSwap } from '@saberhq/stableswap-sdk/dist';
import { PublicKey } from '@solana/web3.js';
import { u64 } from '@solana/spl-token';
import { notify } from '../../utils/notifications';
import { toLamports } from '../../utils/utils';
import { MintParser } from '../../contexts/accounts';

export const Test = () => {
  const connection = useConnection();
  const initData: any = {};
  const [data, setData] = useState(initData);
  const walletCtx = useWallet();

  async function init() {
    // data['stableSwap'] = stableSwap;

    /*| "userAuthority"
    | "userAccountA"
    | "userAccountB"
    | "sourceAccount"
    | "poolTokenAmount"
    | "minimumTokenA"
    | "minimumTokenB"*/
    // const userAuthority = new PublicKey('EpmRY1vzTajbur4hkipMi3MbvjbJHKzqEAAqXj12ccZQ'); // current phantom wallet: EpmRY1vzTajbur4hkipMi3MbvjbJHKzqEAAqXj12ccZQ
    const userAuthority = new PublicKey('FbtH21A1cbbMBEzZycf19L3kvoZBvhMoSqpXZeskxRRr'); // current phantom wallet: EpmRY1vzTajbur4hkipMi3MbvjbJHKzqEAAqXj12ccZQ
    const userAccountA = new PublicKey('9j4RxLU5wyQpvSvYimtyHDLNH8cExaUn6bSBV1QaEJUE'); // user usdc token account
    const userAccountB = new PublicKey('CeWNyMAXugv5zvghNXP4uM11ekcVL9kNV8yp11YG8YYn'); // user usdt token account
    const sourceAccount = new PublicKey('EaPccvMVZUhTuJr2y32MYbpiZT1GJAfo5VVz6YkNabDn'); // user LP token
    let lpMint = new PublicKey('YakofBo4X3zMxa823THQJwZ8QeoU8pxPdFdxJs7JW57');
    let mint = MintParser(lpMint, await connection.getAccountInfo(lpMint));

    const poolTokenAmount = new u64(toLamports(0.2, mint.info));
    const minimumTokenA = new u64(0);
    const minimumTokenB = new u64(0);

    const params = { userAuthority, userAccountA, userAccountB, sourceAccount, poolTokenAmount, minimumTokenA, minimumTokenB };

    data['params'] = params;
    //  stableSwap.withdraw(widthdrawParams);
  }

  async function swap() {
    const swapAccount = new PublicKey('VeNkoB1HvSP6bSeGybQDnx9wTWFsQb2NBCemeCDSuKL');
    const swapProgram = new PublicKey('SSwpkEEcbUqx4vtoEByFjSkhKdCT862DNVb52nZg1UZ');
    const stableSwap = await StableSwap.load(connection, swapAccount, swapProgram);

    /*
  | "userAuthority"
    | "userSource"
    | "userDestination"
    | "poolSource"
    | "poolDestination"
    | "amountIn"
    | "minimumAmountOut"*/

    const userAuthority = new PublicKey('EpmRY1vzTajbur4hkipMi3MbvjbJHKzqEAAqXj12ccZQ'); // current phantom wallet: EpmRY1vzTajbur4hkipMi3MbvjbJHKzqEAAqXj12ccZQ
    const userSource = new PublicKey('9j4RxLU5wyQpvSvYimtyHDLNH8cExaUn6bSBV1QaEJUE');
    const userDestination = new PublicKey('CeWNyMAXugv5zvghNXP4uM11ekcVL9kNV8yp11YG8YYn');
    const poolSource = new PublicKey('6aFutFMWR7PbWdBQhdfrcKrAor9WYa2twtSinTMb9tXv');
    const poolDestination = new PublicKey('HXbhpnLTxSDDkTg6deDpsXzJRBf8j7T6Dc3GidwrLWeo');
    let lpMint = new PublicKey('2tWC4JAdL4AxEFJySziYJfsAnW2MHKRo98vbAPiRDSk8');
    let mint = MintParser(lpMint, await connection.getAccountInfo(lpMint));
    const amountIn = new u64(toLamports(0.2, mint.info));
    const minimumAmountOut = new u64(0);
    const ix = stableSwap.swap({ userAuthority, userSource, userDestination, poolSource, poolDestination, amountIn, minimumAmountOut });
    let txn = await sendTransaction(connection, walletCtx, [ix], []);
    console.log(txn);
    notify({
      message: 'Sucess !',
      type: 'success',
      description: 'Transaction ' + txn,
    });
  }

  async function withdraw() {
    //  alert(data.params.userAuthority);

    const swapAccount = new PublicKey('VeNkoB1HvSP6bSeGybQDnx9wTWFsQb2NBCemeCDSuKL');
    const swapProgram = new PublicKey('SSwpkEEcbUqx4vtoEByFjSkhKdCT862DNVb52nZg1UZ');
    const stableSwap = await StableSwap.load(connection, swapAccount, swapProgram);

    const ix = stableSwap.withdraw(data.params);
    data.ix = ix;
    setData({ ...data });
    let txn = await sendTransaction(connection, walletCtx, [ix], []);
    console.log(txn);
    notify({
      message: 'Sucess !',
      type: 'success',
      description: 'Transaction ' + txn,
    });
  }

  async function serumOrder() {}
  useEffect(() => {
    init();
  });
  return (
    <>
      Saber Test
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <Button onClick={withdraw}> Widthraw</Button>
      <Button onClick={swap}> Swap</Button>
    </>
  );
};
