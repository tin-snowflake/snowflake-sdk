import { Command } from "commander";
import { ConfigCommand } from "./commands";
import { CommandInstructionLayout, CommandLayout } from "./types";

const program = new Command();

const snowflakeCommandInstruction: CommandInstructionLayout = {
  version: "0.0.1",
  name: "snowflake",
  description: "Snowflake CLI to interact with Snowflake SDK",
  commands: [ConfigCommand],
};

class SnowflakeCli {
  static executeCommands(commands: CommandLayout[], mainProgram: Command) {
    commands.forEach((command) => {
      const subProgram = program
        .command(command.command)
        .description(command.description);
      if (command.optionLayout && command.optionLayout.options) {
        const optionLayout = command.optionLayout;
        optionLayout.options.forEach((option) => {
          subProgram
            .option(option.option, option.description)
            .description(option.description);
        });
        if (optionLayout.action) {
          subProgram.action(optionLayout.action);
        }
      }
      if (command.commands) {
        this.executeCommands(command.commands, subProgram);
      }
      if (command.action) {
        subProgram.action(command.action);
      }
      mainProgram.addCommand(subProgram);
    });
  }

  public static async main(args: string[]) {
    const instruction = snowflakeCommandInstruction;

    const mainProgram = program
      .version(instruction.version)
      .name(instruction.name)
      .description(instruction.description);

    this.executeCommands(instruction.commands, mainProgram);

    program.parse(args);
  }
}

SnowflakeCli.main(process.argv);
