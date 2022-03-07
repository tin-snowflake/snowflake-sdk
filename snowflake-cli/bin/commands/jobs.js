"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const job_command_service_1 = __importDefault(require("../services/job-command-service"));
const log_1 = require("../utils/log");
const JobsGetGlobalCommand = {
    command: "get",
    description: "Get global jobs",
    optionLayout: {
        options: [
            {
                option: "--latest",
                description: "Get latest job",
            },
            {
                option: "--limit <LIMIT>",
                description: "Limit number of jobs",
            },
            {
                option: "--offset <OFFSET>",
                description: "Offset number of jobs",
            },
            {
                option: "--owner <OWNER_ADDRESS>",
                description: "Get jobs by owner",
            },
        ],
        action: async ({ latest, limit, owner, offset }) => {
            try {
                let jobs;
                jobs = owner
                    ? await job_command_service_1.default.getJobsByOwner(owner)
                    : await job_command_service_1.default.getGlobalJob();
                if (offset) {
                    jobs = jobs.slice(offset);
                }
                if (limit) {
                    jobs = jobs.slice(0, limit);
                }
                if (latest) {
                    (0, log_1.logSuccess)(jobs[0].pubKey.toString(), "Found latest job");
                    (0, log_1.log)(jobs[0]);
                    return;
                }
                (0, log_1.logSuccess)(jobs.length.toString(), "Found", "jobs");
                (0, log_1.log)(jobs);
                return;
            }
            catch (error) {
                (0, log_1.logError)(error.message, "Error:");
            }
        },
    },
};
exports.default = {
    command: "jobs",
    description: "Manage jobs",
    commands: [JobsGetGlobalCommand],
};
//# sourceMappingURL=jobs.js.map