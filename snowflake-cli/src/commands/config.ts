import { EndpointConstant } from "../constants";
import { CommandLayout } from "../types";
import db from "../db/index";
import {
  SNOWFLAKE_CLI_KEYPAIR_PATH,
  SNOWFLAKE_CLI_RPC_URL,
} from "../constants/db-key";
import { log } from "../utils";

class ConfigCommandService {
  static async setConfigUrl(url: string): Promise<void> {
    try {
      const endpoint = (EndpointConstant as any)[url];
      if (endpoint) {
        await db.put(SNOWFLAKE_CLI_RPC_URL, endpoint);
      } else {
        await db.put(SNOWFLAKE_CLI_RPC_URL, url);
      }

      const rpcURL = await db.get(SNOWFLAKE_CLI_RPC_URL);
      log(`Cluster RPC set to ${rpcURL}`);
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  static async setConfigKeypair(keypair: string): Promise<void> {
    try {
      await db.put(SNOWFLAKE_CLI_KEYPAIR_PATH, keypair);
      const keypairPath = await db.get(SNOWFLAKE_CLI_KEYPAIR_PATH);

      log(`Keypair set to ${keypairPath}`);
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

      console.table({
        "RPC URL": rpcUrl,
        "Keypair Path": keypairPath,
      });
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
}

const ConfigGetCommand: CommandLayout = {
  command: "get",
  description: "Get Snowflake CLI configuration",
  action: () => {
    ConfigCommandService.getConfig();
  },
};

const ConfigSetCommand: CommandLayout = {
  command: "set",
  description: "Set Snowflake CLI configuration",
  optionLayout: {
    options: [
      {
        option: "--url <RPC_URL>",
        description: "Set URL to Solana RPC endpoint",
      },
      {
        option: "--account <PATH_TO_KEYPAIR>",
        description: "Set path to keypair",
      },
    ],
    action: (args: any) => {
      const { url, account } = args;
      if (url) ConfigCommandService.setConfigUrl(url);
      if (account) ConfigCommandService.setConfigKeypair(account);
    },
  },
};

export default {
  command: "config",
  description: "Configure Snowflake CLI",
  commands: [ConfigGetCommand, ConfigSetCommand],
} as CommandLayout;
