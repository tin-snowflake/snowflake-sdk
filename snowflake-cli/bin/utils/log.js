"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logError = exports.logSuccess = exports.log = exports.BgGreen = exports.FgRed = exports.FgGreen = exports.FgBlack = exports.Blink = exports.Underscore = exports.Dim = exports.Bright = exports.Reset = void 0;
exports.Reset = "\x1b[0m";
exports.Bright = "\x1b[1m";
exports.Dim = "\x1b[2m";
exports.Underscore = "\x1b[4m";
exports.Blink = "\x1b[5m";
exports.FgBlack = "\x1b[30m";
exports.FgGreen = "\x1b[32m";
exports.FgRed = "\x1b[31m";
exports.BgGreen = "\x1b[42m";
exports.log = console.log;
const logSuccess = (message, prefixMessage, suffixMessage) => (0, exports.log)(`${prefixMessage || ""} ${exports.FgGreen}${message}${exports.Reset} ${suffixMessage || ""}`.trim());
exports.logSuccess = logSuccess;
const logError = (message, prefixMessage, suffixMessage) => (0, exports.log)(`${prefixMessage || ""} ${exports.FgRed}${message}${exports.Reset} ${suffixMessage || ""}`.trim());
exports.logError = logError;
//# sourceMappingURL=log.js.map