# Snowflake CLI

`npm install -g snowflake`

## How to use the CLI?

Because the CLI is not published yet so you must do something manually to use it. Suppose that you are in the repo, run `npm run build` then add this line at the top of `bin/index.js`

```
#!/usr/bin/env node
```

In the root directory of the project, run `npm install -g .` to install the CLI as a global package. Then you can use the CLI

```
Usage: snowflake [options] [command]

Snowflake CLI to interact with Snowflake SDK

Options:
  -V, --version   output the version number
  -h, --help      display help for command

Commands:
  config          Configure Snowflake CLI
  job             Manage job
  jobs            Manage jobs
  help [command]  display help for command
```

## Development Guide

To create a new command, go to `src/command` and create a new command following the structure of current commands `config.ts` or `job.ts`.

Add a new command to the command instruction in the `index.ts`

## Command List

### 1. Utility Command

`--help (-h)`: Provides help information

`--version (-v)`: Prints the version number

### 2. Get configuration

`config get`: Prints the configuration file

### 3. Set configuration

`config set`: Sets the configuration file

#### Flags

- `--url <URL>`: Solana Cluster endpoint (mainnet-beta, devnet, testnet)

### 4. Read command

`job get [publicKey]`

#### Parameters

- `publicKey`: Public key of a job

### 5. Read all command

`jobs get`: Get all Jobs

#### Flags

- `--limit <LIMIT>`: Limit number of jobs fetched
- `--offset <OFFSET>`: Offset number of jobs fetched
- `--owner <OWNER_ADDRESS>`: Fetch jobs of provided owner address

### 6. Delete

`job delete [publicKey]`: Deletes a job

#### Parameters

- `publicKey`: Public key of a job
