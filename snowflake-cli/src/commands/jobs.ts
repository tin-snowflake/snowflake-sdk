import { Job } from "@snowflake-so/snowflake-sdk";
import JobCommandService from "../services/job-command-service";
import { CommandLayout } from "../types";
import { log, logError, logSuccess } from "../utils/log";

const JobsGetGlobalCommand: CommandLayout = {
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
    action: async ({ latest, limit, owner, offset }: any) => {
      try {
        let jobs: Job[];
        if (owner) {
          jobs = await JobCommandService.getJobsByOwner(owner);
        } else {
          jobs = await JobCommandService.getGlobalJob();
        }
        if (offset) {
          jobs = jobs.slice(offset);
        }
        if (limit) {
          jobs = jobs.slice(0, limit);
        }
        if (latest) {
          logSuccess(jobs[0].pubKey.toString(), `Found latest job`);
          return log(jobs[0]);
        }
        logSuccess(jobs.length.toString(), `Found`, `jobs`);
        return log(jobs);
      } catch (error: any) {
        logError(error.message, "Error:");
      }
    },
  },
};

export default {
  command: "jobs",
  description: "Manage jobs",
  commands: [JobsGetGlobalCommand],
} as CommandLayout;
