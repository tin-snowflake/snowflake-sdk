# Snowflake SDK - Quick Start Guide

## Description

Snowflake SDK provides services and a set of APIs used for interacting with the automation infrastructure of Snowflake on Solana blockchain. Using Snowflake SDK, you can integrate the Snowflake products into your application including create and execute jobs with specific set of program instructions in a defined time.

## Installation

Install with npm

```
npm install snowflake-sdk
```

Install with yarn

```
yarn add snowflake-sdk
```

Using Typescript

```
npm install --save-dev @types/snowflake-sdk
```

Or

```
yarn add -D @types/snowflake-sdk
```

## Services

| Class               |                                 Description                                 |
| :------------------ | :-------------------------------------------------------------------------: |
| Job Builder         |   A "builder pattern" class to build the `Job` from provide class methods   |
| Snowflake           | A main service to interact with onchain jobs (Create, Read, Update, Delete) |
| Finder              |                     A service to query onchain job data                     |
| Job                 |                                  Job model                                  |
| Serializable Action |           Serializable action with serialize / deserialize method           |

## How to use Snowflake SDK?

### Initialize Snowflake

To create a new Snowflake service, we would need to initialize with the Provider (imported from `@project-serum/anchor`)

@project-serum/anchor - `class Provider`: https://project-serum.github.io/anchor/ts/classes/Provider.html#connection

```
let provider : Provider = Provider.local(API_URL);
```

The `API_URL` is the endpoint to the Solana cluster. Empty API_URL is pointed to the `local testnet`

- Mainnet Beta: `https://api.mainnet-beta.solana.com`
- Testnet: `https://api.testnet.solana.com`
- Devnet: `https://api.devnet.solana.com`

Add the `Provider` to initialize `Snowflake` (imported from `File: snowflake.ts`)

```
let snowflake : Snowflake = new Snowflake(provider)
```

### Create an Instruction

@project-serum/anchor - `Transaction Instruction`

```
/**
 * Transaction Instruction class
 */
export class TransactionInstruction {
  /**
   * Public keys to include in this transaction
   * Boolean represents whether this pubkey needs to sign the transaction
   */
  keys: Array<AccountMeta>;
  /**
   * Program Id to execute
   */
  programId: PublicKey;
  /**
   * Program input
   */
  data: Buffer;
  constructor(opts: TransactionInstructionCtorFields);
}
```

Example code to create an instruction:

```
[
  {
    programId: PublicKey,
    data: Buffer,
    keys: [
      {
        pubkey: PublicKey,
        isSigner: boolean,
        isWritable: boolean,
      },
    ],
  },
]
```

### Create a New Job

To create a job, you can use `Job Builder`. This follows a builder pattern to construct a service. Quick overview of the provided methods:

- `fromExistingJob(job: Job)`: Build a job from an existing job
- `jobName(name: string)`: Add a job name
- `jobInstructions(instructions: TransactionInstruction[])`: Add a set of instructions for job. These instructions must follow an instruction structure of `@project-serum/anchor`
- `scheduleOnce(executionTime: UnixTimestamp)`: Build a once-off scheduled job. Schedule a job with defined execution time.
- `scheduleCron(cron: string, numberOfExecutions: number, userTimezoneOffset: UnixTimestamp)`: Build a recurring scheduled job. Schedule a job with defined cron expression and user timezone offset.

Code example on how to create a job

Imported from `File: job-builder.ts`

```
const job : Job = new JobBuilder()
  .jobName("hello world")
  .jobInstructions(instructions)
  .scheduleCron("0 * * * *", 2)
  .build();
```

Then create a new job by calling the `createJob()` method from `class Snowflake`

```
await snowflake.createJob(job);
```

### Update Job

Provide `Job` with updated fields as a parameter to update the data of that job

```
await snowflake.updateJob(job);
```

### Delete Job

To delete a job, put the public key of job `jobPubkey` as a parameter

```
await snowflake.deleteJob(jobPubkey);
```

### Fetch Job

#### Fetch by public key

Provide a job public key to fetch a single job

```
await snowflake.fetch(jobPubkey);

// Return: Job
```

#### Fetch by owner

Provide an owner address to fetch all jobs owned by that address

```
await snowflake.fetchByOwner(owner)

// Return: Array<Job>
```

### Serialization / Deserialization Job

Snowflake SDK provides you an ability to serialize job data to prettify the return data. The serialized job data `Job` is displayed as

Imported from ` model.ts/Job`

```
class Job {
  pubKey: PublicKey
  name: string
  userUtcOffset: UTCOffset
  instructions: TransactionInstruction[]
  recurring: boolean
  retryWindow: number
  remainingRuns: number
  owner: PublicKey
  triggerType: TriggerType
  cron: string
  expireOnComplete: boolean
  clientAppId: PublicKey
  dedicatedOperator: PublicKey
  nextExecutionTime: UnixTimeStamp
  lastScheduledExecution: UnixTimeStamp
  scheduleEndDate: UnixTimeStamp
  expiryDate: UnixTimeStamp
  createdDate: UnixTimeStamp
  lastRentCharged: UnixTimeStamp
  lastUpdatedDate: UnixTimeStamp
  externalId: String
  extra: String
}
```

To serialize job data from `Job` to `SerializableJob`, you can call a method `toSerializableJob()` of class `Job`

```
job.toSerializableJob() -> SerializableJob
```

Otherwise, convert the `SerializableJob` back to `Job` using method `fromSerializableJob`

```
job.fromSerializableJob(serJob: SerializableJob, jobPubKey: PublicKey) -> Job
```
