export interface OptionLayout {
  option: string;
  description: string;
}

export interface OptionInstructionLayout {
  options: OptionLayout[];
  action?: (args: any) => any;
}

export interface CommandLayout {
  command: string;
  description: string;
  action?: (args: any) => any;
  commands?: CommandLayout[];
  optionLayout?: OptionInstructionLayout;
}
export interface CommandInstructionLayout {
  version: string;
  name: string;
  description: string;
  commands: CommandLayout[];
}
