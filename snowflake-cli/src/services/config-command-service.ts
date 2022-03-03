import { EndpointConstant } from "../constants";
import {
  SNOWFLAKE_CLI_KEYPAIR_PATH,
  SNOWFLAKE_CLI_RPC_URL,
} from "../constants/db-key";
import db from "../utils/db";

export default class ConfigCommandService {
  static async setConfigUrl(url: string): Promise<string> {
    try {
      const endpoint = (EndpointConstant as any)[url];
      if (endpoint) {
        await db.put(SNOWFLAKE_CLI_RPC_URL, endpoint);
      } else {
        await db.put(SNOWFLAKE_CLI_RPC_URL, url);
      }

      const rpcURL = await db.get(SNOWFLAKE_CLI_RPC_URL);
      return rpcURL;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  static async setConfigKeypair(keypair: string): Promise<string> {
    try {
      await db.put(SNOWFLAKE_CLI_KEYPAIR_PATH, keypair);
      const keypairPath = await db.get(SNOWFLAKE_CLI_KEYPAIR_PATH);

      return keypairPath;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  static async getConfig() {
    try {
      const [rpcUrl, keypairPath] = await Promise.all([
        db.get(SNOWFLAKE_CLI_RPC_URL),
        db.get(SNOWFLAKE_CLI_KEYPAIR_PATH),
      ]);

      return {
        "RPC URL": rpcUrl,
        "Keypair Path": keypairPath,
      };
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
}
