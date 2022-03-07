"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const commands_1 = require("./commands");
require("dotenv/config");
const program = new commander_1.Command();
const snowflakeCommandInstruction = {
    version: "0.0.1",
    name: "snowflake",
    description: "Snowflake CLI to interact with Snowflake SDK",
    commands: [commands_1.ConfigCommand, commands_1.JobCommand, commands_1.JobsCommand],
};
class SnowflakeCli {
    static executeCommands(commands, mainProgram) {
        commands.forEach((command) => {
            const subProgram = program
                .createCommand(command.command)
                .description(command.description);
            if (command.argumentLayout && command.argumentLayout.arguments) {
                const argumentLayout = command.argumentLayout;
                argumentLayout.arguments.forEach((argument) => {
                    subProgram.argument(argument.argument, argument.description);
                });
                if (argumentLayout.action) {
                    subProgram.action(argumentLayout.action);
                }
            }
            if (command.optionLayout && command.optionLayout.options) {
                const optionLayout = command.optionLayout;
                optionLayout.options.forEach((option) => {
                    subProgram.option(option.option, option.description);
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
    static async main(args) {
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
//# sourceMappingURL=index.js.map