import JobCommandService from "../services/job-command-service";
import { CommandLayout } from "../types";
import { log, logError, logSuccess } from "../utils/log";

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
        console.log(publicKey);
        const job = await JobCommandService.getJobByPublicKey(publicKey);
        logSuccess(job.pubKey.toString(), "Found job");
        return log(job);
      } catch (error: any) {
        logError(error.message, "Error:");
      }
    },
  },
};

export default {
  command: "job",
  description: "Manage job",
  commands: [JobGetCommand],
} as CommandLayout;
