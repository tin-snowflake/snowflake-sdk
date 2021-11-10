import { Account, Connection, PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { Token } from '@solana/spl-token';
import { ASSOCIATED_TOKEN_PROGRAM_ID, programIds, TOKEN_PROGRAM_ID } from './ids';

export function createSplAccount(instructions: TransactionInstruction[], payer: PublicKey, accountRentExempt: number, mint: PublicKey, owner: PublicKey, space: number) {
  const account = new Account();
  instructions.push(
    SystemProgram.createAccount({
      fromPubkey: payer,
      lamports: accountRentExempt,
      newAccountPubkey: account.publicKey,
      programId: programIds().token,
      space: space,
    })
  );

  instructions.push(Token.createInitAccountInstruction(programIds().token, mint, account.publicKey, owner));

  return account;
}

let x: [number, string] = [1, '10'];
export async function createAssociatedTokenAccountIfNotExist(owner: PublicKey, payer: PublicKey, mint: PublicKey, connection: Connection): Promise<[PublicKey, TransactionInstruction[]]> {
  const ata = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, mint, owner);
  let ataInfo = await connection.getAccountInfo(ata);
  let instructions: TransactionInstruction[] = [];
  if (!ataInfo) {
    instructions.push(await Token.createAssociatedTokenAccountInstruction(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, mint, ata, owner, payer));
  }
  return [ata, instructions];
}

export async function getAssociatedTokenAddress(mint: string, owner: string) {
  return await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, new PublicKey(mint), new PublicKey(owner));
}

export async function authorizeMax(owner: PublicKey, ata: PublicKey): Promise<TransactionInstruction[]> {
  const [pda, bump] = await PublicKey.findProgramAddress([owner.toBuffer()], new PublicKey(programIds().snowflake));
  let maxAmount = Math.floor(9 * Math.pow(10, 12));
  let approveIx = Token.createApproveInstruction(programIds().token, ata, pda, owner, [], maxAmount);
  return [approveIx];
}
