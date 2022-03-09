import { CommandLayout } from "../types";
import { logError, logSuccess } from "../utils/log";
import ConfigCommandService from "../services/config-command-service";

const ConfigGetCommand: CommandLayout = {
  command: "get",
  description: "Get Snowflake CLI configuration",
  action: async () => {
    try {
      const config = await ConfigCommandService.getConfig();
      // tslint:disable-next-line: no-console
      console.table(config);
    } catch (error) {
      logError(error.message, "Error:");
    }
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
      // {
      //   option: "--account <PATH_TO_KEYPAIR>",
      //   description: "Set path to keypair",
      // },
    ],
    action: async (args: any) => {
      try {
        const { url } = args;
        if (url) {
          const rpcUrl = await ConfigCommandService.setConfigUrl(url);
          logSuccess(rpcUrl, "RPC URL set to");
          return;
        }
        // if (account) {
        //   const keypair = await ConfigCommandService.setConfigKeypair(account);
        //   logSuccess(keypair, "Keypair set to");
        //   return;
        // }
      } catch (error) {
        logError(error.message);
      }
    },
  },
};

export default {
  command: "config",
  description: "Configure Snowflake CLI",
  commands: [ConfigGetCommand, ConfigSetCommand],
};
