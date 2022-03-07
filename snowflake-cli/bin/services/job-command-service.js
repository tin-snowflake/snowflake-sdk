"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_key_1 = require("../constants/db-key");
const db_1 = __importDefault(require("../utils/db"));
const snowflake_1 = require("../utils/snowflake");
const web3_js_1 = require("@solana/web3.js");
class JobCommandService {
    static async deleteJob(publicKey) {
        try {
            const rpcUrl = await db_1.default.get(db_key_1.SNOWFLAKE_CLI_RPC_URL);
            if (!rpcUrl) {
                throw new Error("RPC URL is not set");
            }
            const snowflake = (0, snowflake_1.initSnowflake)(rpcUrl);
            const pubkey = new web3_js_1.PublicKey(publicKey);
            await snowflake.deleteJob(pubkey);
            return publicKey;
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    static async getGlobalJob() {
        try {
            const rpcUrl = await db_1.default.get(db_key_1.SNOWFLAKE_CLI_RPC_URL);
            if (!rpcUrl) {
                throw new Error("RPC URL is not set");
            }
            const snowflake = (0, snowflake_1.initSnowflake)(rpcUrl);
            const jobs = await snowflake.findGlobal();
            return jobs;
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    static async getJobsByOwner(owner) {
        try {
            const rpcUrl = await db_1.default.get(db_key_1.SNOWFLAKE_CLI_RPC_URL);
            if (!rpcUrl) {
                throw new Error("RPC URL is not set");
            }
            const snowflake = (0, snowflake_1.initSnowflake)(rpcUrl);
            const ownerAddress = new web3_js_1.PublicKey(owner);
            const jobs = await snowflake.findByOwner(ownerAddress);
            return jobs;
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    static async getJobByPublicKey(publicKey) {
        try {
            const rpcUrl = await db_1.default.get(db_key_1.SNOWFLAKE_CLI_RPC_URL);
            if (!rpcUrl) {
                throw new Error("RPC URL is not set");
            }
            const snowflake = (0, snowflake_1.initSnowflake)(rpcUrl);
            const pubkey = new web3_js_1.PublicKey(publicKey);
            const job = await snowflake.fetch(pubkey);
            return job;
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
}
exports.default = JobCommandService;
//# sourceMappingURL=job-command-service.js.map