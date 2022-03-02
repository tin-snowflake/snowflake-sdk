import { EndpointConstant } from "../constants";
import { CommandLayout } from "../types";
import db from "../db/index";
import {
  SNOWFLAKE_CLI_KEYPAIR_PATH,
  SNOWFLAKE_CLI_RPC_URL,
} from "../constants/db-key";
import { logSuccess } from "../utils/log";

class ConfigCommandService {
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
    action: async (args: any) => {
      const { url, account } = args;
      if (url) {
        const rpcUrl = await ConfigCommandService.setConfigUrl(url);
        logSuccess(rpcUrl, "RPC URL set to");
        return;
      }
      if (account) {
        const keypair = await ConfigCommandService.setConfigKeypair(account);
        logSuccess(keypair, "Keypair set to");
        return;
      }
    },
  },
};

// tslint:disable-next-line: no-object-literal-type-assertion
export default {
  command: "config",
  description: "Configure Snowflake CLI",
  commands: [ConfigGetCommand, ConfigSetCommand],
} as CommandLayout;
