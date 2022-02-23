import inquirer from "inquirer";
import { ExitCode } from "./utils";

async function main(): Promise<ExitCode> {
  console.log("hello world");

  const answer = await inquirer.prompt({
    name: "hello world",
    message: "what would you like to say",
    type: "input",
  });

  console.log(answer);

  return ExitCode.OK;
}

main();
