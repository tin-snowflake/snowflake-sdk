import JobCommandService from "../services/job-command-service";
import { CommandLayout } from "../types";
import { log, logError, logSuccess } from "../utils/log";
import inquirer from "inquirer";
import { JobBuilder } from "@snowflake-so/snowflake-sdk";

// tslint:disable-next-line: cyclomatic-complexity
const jobCreateAction = async () => {
  const prompt = inquirer.createPromptModule();
  const jobBuilder = new JobBuilder();
  const instructions = [];
  const answers = await prompt([
    {
      type: "list",
      name: "option",
      message: "What would you like to do?",
      choices: ["Job", "Instruction"],
    },
  ]);
  switch (answers.option) {
    case "Job":
      const jobOptionAnswers = await prompt([
        {
          type: "list",
          name: "option",
          askAnswered: true,
          message: "Choose an option",
          choices: [
            `Create a new job ${
              instructions.length > 0
                ? `(${instructions.length} instructions)`
                : ""
            }`,
            "Update a job",
            "Back",
          ],
        },
      ]);
      switch (jobOptionAnswers.option) {
        case `Create a new job ${
          instructions.length > 0 ? `(${instructions.length} instructions)` : ""
        }`:
          const createJobAnswers = await prompt([
            {
              type: "input",
              name: "name",
              askAnswered: true,
              message: "Enter a name for the job: ",
            },
            {
              type: "list",
              name: "scheduleOption",
              message: "Choose a schedule option",
              choices: ["Once", "Cron", "Conditional"],
              askAnswered: true,
            },
          ]);
          const { name, scheduleOption } = createJobAnswers;
          jobBuilder.jobName(name);
          switch (scheduleOption) {
            case "Once":
              const onceAnswers = await prompt([
                {
                  type: "input",
                  name: "executionTime",
                  askAnswered: true,
                  message: "Enter the execution time: ",
                },
              ]);
              jobBuilder.scheduleOnce(onceAnswers.executionTime);
              break;
            case "Cron":
              const cronAnswers = await prompt([
                {
                  type: "input",
                  name: "cron",
                  askAnswered: true,
                  message: "Enter a cron expression: ",
                },
                {
                  type: "number",
                  name: "numberOfExecutions",
                  askAnswered: true,
                  message: "Number of executions: ",
                },
                {
                  type: "number",
                  name: "userTimezoneOffset",
                  askAnswered: true,
                  message: "User timezone offset: ",
                },
              ]);
              jobBuilder.scheduleCron(
                cronAnswers.cron,
                cronAnswers.numberOfExecutions,
                cronAnswers.userTimezoneOffset
              );
              break;
            case "Conditional":
              const conditionalAnswers = await prompt([
                {
                  type: "input",
                  name: "numberOfExecutions",
                  askAnswered: true,
                  message: "Enter a number of executions: ",
                },
              ]);
              jobBuilder.scheduleConditional(
                conditionalAnswers.numberOfExecutions
              );
          }
          break;
        case "Update a job":
          break;
        case "Back":
          jobCreateAction();
          break;
      }
      break;
    case "Instruction":
      const instructionOptionAnswers = await prompt([
        {
          type: "list",
          name: "option",
          message: `Choose an option ${
            instructions.length > 0
              ? `(${instructions.length} instructions)`
              : ""
          }`,
          choices: [
            "Create an instruction",
            "Update an instruction",
            "View all instructions",
            "Delete an instruction",
            "Back",
          ],
        },
      ]);
      switch (instructionOptionAnswers.option) {
        case "Create an instruction":
          break;
        case "Update an instruction":
          break;
        case "View all instructions":
          break;
        case "Delete an instruction":
          break;
        case "Back":
          jobCreateAction();
          break;
      }
      break;
  }
};

const JobCreateCommand: CommandLayout = {
  command: "create",
  description: "Create a job",
  action: jobCreateAction,
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
