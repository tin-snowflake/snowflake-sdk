solana config set --url https://api.devnet.solana.com
solana config set --url https://api.testnet.solana.com
solana config set --url http://localhost:8899

//local upgrade
anchor upgrade target/deploy/snowflake.so --program-id 86G3gad5tVjJxdQmmdQ6E3rLQNnDNh4KYcqiiSd7Az63

//devnet upgrade
//anchor upgrade target/deploy/snowflake.so --program-id  261Kyb2KhtfBz4fPwzkd5nCD69apzTLuk1vorU3bSX9T
anchor upgrade target/deploy/snowflake.so --program-id 86G3gad5tVjJxdQmmdQ6E3rLQNnDNh4KYcqiiSd7Az63 --provider.cluster devnet