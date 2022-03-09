import { SNOWFLAKE_CLI_RPC_URL } from "../constants/db-key";
import db from "../utils/db";
import { initSnowflake } from "../utils/snowflake";
import { PublicKey } from "@solana/web3.js";

export default class JobCommandService {
  static async deleteJob(publicKey: string) {
    try {
      const rpcUrl = await db.get(SNOWFLAKE_CLI_RPC_URL);
      if (!rpcUrl) {
        throw new Error("RPC URL is not set");
      }
      const snowflake = initSnowflake(rpcUrl);
      const pubkey = new PublicKey(publicKey);
      await snowflake.deleteJob(pubkey);

      return publicKey;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
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

  static async watchJob(jobPubkey: PublicKey){
    try {
      const rpcUrl = await db.get(SNOWFLAKE_CLI_RPC_URL);
      if (!rpcUrl) {
        throw new Error("RPC URL is not set");
      }
      const snowflake = initSnowflake(rpcUrl);
      // const job = await snowflake.(jobPubkey);
      // TODO implement watchJob() for snowflake SDK
      return null;
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
