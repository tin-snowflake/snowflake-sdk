# Snowflake CLI (snowflake)

## Flags

- **-h, --help**: Provides help information

  (snowflake -h, snowflake --help).

- **-v, --version**: Prints the version number

  (snowflake -v, snowflake --version)

- **c, --config**: Specifies the configuration file to use.

  (snowflake -c, snowflake --config)

## Config command

- **config get**: Prints the configuration file

  (snowflake config get)

- **config set**: Sets the configuration file

  (snowflake config set <PATH_TO_FILE>)

- **config set <KEY> <VALUE>**: Sets a configuration value

  (snowflake config set <KEY> <VALUE>)

- **config --help**: Provides help information

  (snowflake config --help)

## Read command

- **job --help**: Provides help information

  (snowflake job --help)

- **job latest**: Prints the latest job

  (snowflake job latest)

- **job <JOB_ID>**: Prints the latest job

  (snowflake job latest)

- **job <JOB_ID> --json**: Prints the latest job

  (snowflake job latest --json)

## Read all command

- job all --owner: Prints all jobs

  (snowflake job all -- owner)

- job all --json: Prints all jobs

  (snowflake job all --json)

- job all --limit: Prints all jobs

  (snowflake job all --limit)

- job all --limit --json: Prints all jobs

  (snowflake job all --limit --json)

- job all --limit --offset: Prints all jobs

  (snowflake job all --limit --offset)

## Create

- job create: Creates a job

  (snowflake job create)

## Delete

- job delete: Deletes a job

  (snowflake job delete )

## Update

- job update: Updates a job

  (snowflake job update)

## Schedule

- job schedule: Schedules a job

  (snowflake job schedule)

## Serialize job

- job serialize <PROGRAM_ACCOUNT_ID>: Serializes a job

  (snowflake job serialize <PROGRAM_ACCOUNT_ID>)

## Create instruction

- instruction create <NAME>: Creates an instruction

  (snowflake instruction create <NAME>)

- instruction update <NAME/ID>: Updates an instruction

  (snowflake instruction update <NAME/ID>)

## Instruction data

Ask for these information and add to the list of instruction

- Program ID
- Keys
- Data

## A clearer version

```

// Snowflake CLI (snowflake)

/** Flags */

// -h, --help: Provides help information (snowflake -h, snowflake --help)
// -v, --version: Prints the version number (snowflake -v, snowflake --version)
// -c, --config: Specifies the configuration file to use (snowflake -c, snowflake --config)

/** Config command */

// config get: Prints the configuration file (snowflake config get)
// config set: Sets the configuration file (snowflake config set <PATH_TO_FILE>)
// config set <KEY> <VALUE>: Sets a configuration value (snowflake config set <KEY> <VALUE>)
// config --help: Provides help information (snowflake config --help)

/** Read command */

// job --help: Provides help information (snowflake job --help)
// job latest: Prints the latest job (snowflake job latest)
// job <JOB_ID>: Prints the latest job (snowflake job latest)
// job <JOB_ID> --json: Prints the latest job (snowflake job latest --json)

/** Read all command */

// job all --owner=<OWNER>: Prints all jobs (snowflake job all -- owner=<OWNER>)
// job all --json: Prints all jobs (snowflake job all --json)
// job all --limit <LIMIT>: Prints all jobs (snowflake job all --limit)
// job all --limit <LIMIT> --json: Prints all jobs (snowflake job all --limit=<LIMIT> --json)
// job all --limit <LIMIT> --offset <OFFSET>: Prints all jobs (snowflake job all --limit=<LIMIT> --offset=<OFFSET>)

/** Create */

// job create <NAME>: Creates a job (snowflake job create <NAME>)

/** Delete */

// job delete <JOB_ID>: Deletes a job (snowflake job delete <JOB_ID>)

/** Update */

// job update <JOB_ID>: Updates a job (snowflake job update <JOB_ID>)

/** Schedule */

// job schedule <JOB_ID> <CRON>: Schedules a job (snowflake job schedule <JOB_ID> <CRON>)

/** Serialize job */

// job serialize <PROGRAM_ACCOUNT_ID>: Serializes a job (snowflake job serialize <PROGRAM_ACCOUNT_ID>)

/** Create instruction */

// instruction create <NAME>: Creates an instruction (snowflake instruction create <NAME>)
// instruction update <NAME/ID>: Updates an instruction (snowflake instruction update <NAME/ID>)

/** Instruction data */

// Program ID
// Keys
// Data
```
