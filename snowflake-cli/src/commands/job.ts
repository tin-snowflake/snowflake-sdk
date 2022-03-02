import JobCommandService from "../services/job-command-service";
import { CommandLayout } from "../types";
import { log, logError, logSuccess } from "../utils/log";

const JobCreateCommand: CommandLayout = {
  command: "create",
  description: "Create a job",
};

const JobDeleteCommand: CommandLayout = {
  command: "delete",
  description: "Delete a job",
  argumentLayout: {
    arguments: [
      {
        argument: "[publicKey]",
        description: "Public key of the job",
      },
    ],
    action: async ({ publicKey }: any) => {
      try {
        const job = await JobCommandService.deleteJob(publicKey);
        logSuccess(job.toString(), "Deleted job");
        return;
      } catch (error: any) {
        logError(error.message, "Error:");
      }
    },
  },
};

const JobGetCommand: CommandLayout = {
  command: "get",
  description: "Get job by public key",
  argumentLayout: {
    arguments: [
      {
        argument: "[publicKey]",
        description: "Public key of the job",
      },
    ],
    action: async (publicKey: string) => {
      try {
        const job = await JobCommandService.getJobByPublicKey(publicKey);
        logSuccess(job.pubKey.toString(), "Found job");
        log(job);
        return;
      } catch (error: any) {
        logError(error.message, "Error:");
      }
    },
  },
};

export default {
  command: "job",
  description: "Manage job",
  commands: [JobGetCommand, JobDeleteCommand, JobCreateCommand],
};
