anchorsolana config set --url https://api.devnet.solana.com
solana config set --url https://api.testnet.solana.com
solana config set --url http://localhost:8899

//local upgrade
//anchor upgrade target/deploy/snowflake.so --program-id 86G3gad5tVjJxdQmmdQ6E3rLQNnDNh4KYcqiiSd7Az63
anchor upgrade target/deploy/snowflake.so --program-id 3K4NPJKUJLbgGfxTJumtxv3U3HeJbS3nVjwy8CqFj6F2

//devnet upgrade
//anchor upgrade target/deploy/snowflake.so --program-id 86G3gad5tVjJxdQmmdQ6E3rLQNnDNh4KYcqiiSd7Az63 --provider.cluster devnet
anchor upgrade target/deploy/snowflake.so --program-id 3K4NPJKUJLbgGfxTJumtxv3U3HeJbS3nVjwy8CqFj6F2 --provider.cluster devnet

//fresh deploy to local
anchor deploy

//fresh deploy to devnet
anchor deploy --provider.cluster devnet