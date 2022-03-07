"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = require("../utils/log");
const config_command_service_1 = __importDefault(require("../services/config-command-service"));
const ConfigGetCommand = {
    command: "get",
    description: "Get Snowflake CLI configuration",
    action: () => {
        config_command_service_1.default.getConfig();
    },
};
const ConfigSetCommand = {
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
        action: async (args) => {
            const { url, account } = args;
            if (url) {
                const rpcUrl = await config_command_service_1.default.setConfigUrl(url);
                (0, log_1.logSuccess)(rpcUrl, "RPC URL set to");
                return;
            }
            if (account) {
                const keypair = await config_command_service_1.default.setConfigKeypair(account);
                (0, log_1.logSuccess)(keypair, "Keypair set to");
                return;
            }
        },
    },
};
exports.default = {
    command: "config",
    description: "Configure Snowflake CLI",
    commands: [ConfigGetCommand, ConfigSetCommand],
};
//# sourceMappingURL=config.js.map