"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSnowflake = void 0;
const anchor_1 = require("@project-serum/anchor");
const snowflake_sdk_1 = require("@snowflake-so/snowflake-sdk");
const initSnowflake = (rpcUrl) => {
    const provider = anchor_1.Provider.local(rpcUrl);
    const snowflake = new snowflake_sdk_1.Snowflake(provider);
    return snowflake;
};
exports.initSnowflake = initSnowflake;
//# sourceMappingURL=snowflake.js.map