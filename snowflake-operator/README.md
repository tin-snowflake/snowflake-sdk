# 1. Install typescript and ts-node globally:
npm install -g typescript
npm i -g ts-node
npm install

# 2. Configure environment variables:
export ANCHOR_WALLET="/home/minh/.config/solana/id.json"
export ANCHOR_PROVIDER_URL="http://localhost:8899"

# 3. Create symlink to idl, from the snowflake-operator directory, use the command below
ln -sf ~/workspace/snow/snowflake-rust/target/idl/snowflake.json src/idl/snowflake.json

# 4. Build and deploy AWS lambda
npm run build
npm run package-lambda
npm run deploy-lambda

# 5. Run the operator locally
npm start