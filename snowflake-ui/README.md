## src/actions

Setup here actions that will interact with Solana programs using sendTransaction function

## src/contexts

React context objects that are used propagate state of accounts across the application

## src/hooks

Generic react hooks to interact with token program:
* useUserBalance - query for balance of any user token by mint, returns:
    - balance
    - balanceLamports
    - balanceInUSD
* useUserTotalBalance - aggregates user balance across all token accounts and returns value in USD
    - balanceInUSD
* useAccountByMint
* useTokenName
* useUserAccounts

## src/views

* home - main page for your app
* faucet - airdrops SOL on Testnet and Devnet

# Build and Deploy - make sure aws cli and the access key are setup before you run the task

# Build: the build command below will build react app into ./build directory
npm run build

# Deploy: 
aws s3 sync build/ s3://app.snowflake.so

# Refresh cloudfront cache
aws cloudfront create-invalidation --distribution-id E23KX6PLDAOYIH --paths "/*"

