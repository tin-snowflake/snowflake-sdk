# 1. Configure environment variables:
export ANCHOR_WALLET="/home/minh/.config/solana/id.json"
export ANCHOR_PROVIDER_URL="http://localhost:8899"

# 2. Create symlink to idl, from the snowflake-operator directory, use the command below
ln -sf ~/workspace/snow/snowflake-rust/target/idl/snowflake.json idl/snowflake.json

# 3. Build the program
npm install
zip -r build/function.zip idl keys node_modules index.js

# 4. Deploy the program
aws lambda update-function-code --function-name snowflake-operator --zip-file fileb://build/function.zip

# 5. Run the operator locally
node index.js