"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
exports.default = {
    devnet: (0, web3_js_1.clusterApiUrl)("devnet"),
    ["mainnet-beta"]: (0, web3_js_1.clusterApiUrl)("mainnet-beta"),
    testnet: (0, web3_js_1.clusterApiUrl)("testnet"),
};
//# sourceMappingURL=endpoint.js.map