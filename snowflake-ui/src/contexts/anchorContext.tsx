import React, { useCallback, useMemo } from 'react';
import { Connection } from '@solana/web3.js';
import programIdl from '../idl/snowflake.json';
import { programIds } from '../utils/ids';
import { ENDPOINTS, useConnection } from './connection';
import { useWallet } from '@solana/wallet-adapter-react';
import { Program } from '@project-serum/anchor';
import * as anchor from '@project-serum/anchor';
import { TokenInfo } from '@solana/spl-token-registry';

export function useAnchorProgram(): Program {
  const connection: Connection = useConnection();
  const walletCtx = useWallet();

  const anchorProgram = useMemo(() => {
    return initAnchorProgram(anchor, connection, walletCtx);
  }, [walletCtx.publicKey]);

  return anchorProgram;
}

function initAnchorProgram(anchor, connection: Connection, walletCtx): Program {
  console.log('loading anchor program ...', walletCtx.publicKey ? walletCtx.publicKey.toString() : 'null key');
  const provider = new anchor.Provider(connection, walletCtx, {
    skipPreflight: true,
    preflightCommitment: 'recent',
  });
  return new anchor.Program(programIdl, programIds().snowflake, provider);
}

export function useAnchor() {
  return anchor;
}
