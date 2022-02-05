import { useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { createAssociatedTokenAccountIfNotExist } from '../utils/tokens';
import BN from 'bn.js';
import { toLamportsByDecimal } from '../utils/utils';
import { DEVNET_USDC_TOKEN, programIds } from '../utils/ids';
import { SmartTxnClient } from '../utils/smartTxnClient';
import { useAnchorProgram } from '../contexts/anchorContext';
import { useConnectionConfig } from '../contexts/connection';
import { useWallet } from '@solana/wallet-adapter-react';

export function useDevnetAirdropAction(): () => Promise<any> {
  const program = useAnchorProgram();
  const connectionConfig = useConnectionConfig();
  const walletCtx = useWallet();
  const airdropAction = async () => {
    const usdcTestMint = DEVNET_USDC_TOKEN;
    const ixs = [];
    const [userUSDCAssociatedTestAccount, createUserUSDCAssociatedTestAccount] = await createAssociatedTokenAccountIfNotExist(walletCtx.publicKey, walletCtx.publicKey, usdcTestMint, connectionConfig.connection);
    ixs.push(...createUserUSDCAssociatedTestAccount);
    ixs.push(
      program.instruction.airdropDevnet(new BN(toLamportsByDecimal(500, 9)), {
        accounts: {
          authority: new PublicKey('DNTjShSiQ52SRTJEZMKurnQAgKTS5rWxWsxoUeM6D1FV'),
          mint: usdcTestMint,
          to: userUSDCAssociatedTestAccount,
          tokenProgram: new PublicKey(programIds().token),
        },
      })
    );
    await new SmartTxnClient(connectionConfig, ixs, [], walletCtx).send();
  };

  return airdropAction;
}
