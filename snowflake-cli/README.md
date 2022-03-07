# Snowflake CLI (snowflake)

## Utility Command

`-h, --help`: Provides help information

  (snowflake -h, snowflake --help).

`-v, --version`: Prints the version number

## Get Configuration

`config get`: Prints the configuration file
## Set Configuration

`config set`: Sets the configuration file

### Flags
- `--url <URL>`: Solana Cluster endpoint (mainnet-beta, devnet, testnet)
- `--keypair <PATH_TO_KEYPAIR>`: Path to keypair

## Read command

`job get [publicKey]`

### Parameters
- `publicKey`: Public key of a job

## Read all command

`jobs get`: Get all Jobs

### Flags
- `--limit <LIMIT>`: Limit number of jobs fetched
- `--offset <OFFSET>`: Offset number of jobs fetched
- `--owner <OWNER_ADDRESS>`: Fetch jobs of provided owner address


## Delete

`job delete [publicKey]`: Deletes a job

### Parameters
- `publicKey`: Public key of a job




