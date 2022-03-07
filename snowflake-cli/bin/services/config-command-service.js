"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../constants");
const db_key_1 = require("../constants/db-key");
const db_1 = __importDefault(require("../utils/db"));
class ConfigCommandService {
    static async setConfigUrl(url) {
        try {
            const endpoint = constants_1.EndpointConstant[url];
            if (endpoint) {
                await db_1.default.put(db_key_1.SNOWFLAKE_CLI_RPC_URL, endpoint);
            }
            else {
                await db_1.default.put(db_key_1.SNOWFLAKE_CLI_RPC_URL, url);
            }
            const rpcURL = await db_1.default.get(db_key_1.SNOWFLAKE_CLI_RPC_URL);
            return rpcURL;
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    static async setConfigKeypair(keypair) {
        try {
            await db_1.default.put(db_key_1.SNOWFLAKE_CLI_KEYPAIR_PATH, keypair);
            const keypairPath = await db_1.default.get(db_key_1.SNOWFLAKE_CLI_KEYPAIR_PATH);
            return keypairPath;
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    static async getConfig() {
        try {
            const [rpcUrl, keypairPath] = await Promise.all([
                db_1.default.get(db_key_1.SNOWFLAKE_CLI_RPC_URL),
                db_1.default.get(db_key_1.SNOWFLAKE_CLI_KEYPAIR_PATH),
            ]);
            return {
                "RPC URL": rpcUrl,
                "Keypair Path": keypairPath,
            };
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
}
exports.default = ConfigCommandService;
//# sourceMappingURL=config-command-service.js.map