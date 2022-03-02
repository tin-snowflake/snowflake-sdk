import { SNOWFLAKE_CLI_RPC_URL } from "../constants/db-key";
import db from "../db";
import { initSnowflake } from "../utils/snowflake";
import { PublicKey } from "@solana/web3.js";

export default class JobCommandService {
  static async getGlobalJob() {
    try {
      const rpcUrl = await db.get(SNOWFLAKE_CLI_RPC_URL);
      if (!rpcUrl) {
        throw new Error("RPC URL is not set");
      }
      const snowflake = initSnowflake(rpcUrl);
      const jobs = await snowflake.findGlobal();
      return jobs;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  static async getJobsByOwner(owner: string) {
    try {
      const rpcUrl = await db.get(SNOWFLAKE_CLI_RPC_URL);
      if (!rpcUrl) {
        throw new Error("RPC URL is not set");
      }
      const snowflake = initSnowflake(rpcUrl);
      const ownerAddress = new PublicKey(owner);
      const jobs = await snowflake.findByOwner(ownerAddress);
      return jobs;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  static async getJobByPublicKey(publicKey: string) {
    try {
      const rpcUrl = await db.get(SNOWFLAKE_CLI_RPC_URL);
      if (!rpcUrl) {
        throw new Error("RPC URL is not set");
      }
      const snowflake = initSnowflake(rpcUrl);
      const pubkey = new PublicKey(publicKey);
      const job = await snowflake.fetch(pubkey);

      return job;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
}
