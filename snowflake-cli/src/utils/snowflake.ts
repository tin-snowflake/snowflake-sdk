import { Provider } from "@project-serum/anchor";
import { Snowflake } from "@snowflake-so/snowflake-sdk";

export const initSnowflake = (rpcUrl: string) => {
  const provider = Provider.local(rpcUrl);
  const snowflake = new Snowflake(provider);

  return snowflake;
};
