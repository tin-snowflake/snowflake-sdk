"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const job_command_service_1 = __importDefault(require("../services/job-command-service"));
const log_1 = require("../utils/log");
const JobDeleteCommand = {
    command: "delete",
    description: "Delete a job",
    argumentLayout: {
        arguments: [
            {
                argument: "[publicKey]",
                description: "Public key of the job",
            },
        ],
        action: async ({ publicKey }) => {
            try {
                const job = await job_command_service_1.default.deleteJob(publicKey);
                (0, log_1.logSuccess)(job.toString(), "Deleted job");
                return;
            }
            catch (error) {
                (0, log_1.logError)(error.message, "Error:");
            }
        },
    },
};
const JobGetCommand = {
    command: "get",
    description: "Get job by public key",
    argumentLayout: {
        arguments: [
            {
                argument: "[publicKey]",
                description: "Public key of the job",
            },
        ],
        action: async (publicKey) => {
            try {
                const job = await job_command_service_1.default.getJobByPublicKey(publicKey);
                (0, log_1.logSuccess)(job.pubKey.toString(), "Found job");
                (0, log_1.log)(job);
                return;
            }
            catch (error) {
                (0, log_1.logError)(error.message, "Error:");
            }
        },
    },
};
exports.default = {
    command: "job",
    description: "Manage job",
    commands: [JobGetCommand, JobDeleteCommand],
};
//# sourceMappingURL=job.js.map