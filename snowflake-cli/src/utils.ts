export enum ExitCode {
  OK = 0,
  Error = 1,
}

export enum QuestionType {
  NoAnswer,
}

export enum Flag {
  _h,
}

export enum Command {
  help,
}

export const questions: Record<string, any> = {
  helloWorld: {
    message: "Hello World",
    type: QuestionType.NoAnswer,
  },
};
