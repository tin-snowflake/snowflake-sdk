import { Provider, Wallet } from "@project-serum/anchor";
import { Snowflake } from "@snowflake-so/snowflake-sdk";
import { Connection, Keypair } from "@solana/web3.js";

export const initSnowflake = (rpcUrl: string) => {
  const keypair = Keypair.generate();
  const connection = new Connection(rpcUrl);
  const wallet = new Wallet(keypair);
  const provider = new Provider(connection, wallet, Provider.defaultOptions());
  const snowflake = new Snowflake(provider);

  return snowflake;
};
