# Setup and Run Operator Locally
1. Install typescript and ts-node globally:
npm install -g typescript
npm i -g ts-node
npm install

2. Configure environment variables:
export ANCHOR_WALLET="/home/minh/.config/solana/id.json"
export ANCHOR_PROVIDER_URL="http://localhost:8899"

3. Create symlink to idl, from the snowflake-operator directory, use the command below
ln -sf ~/workspace/snow/snowflake-rust/target/idl/snowflake.json src/idl/snowflake.json

4. Run the operator locally
npm start

# Setup Snow Operator on a new AWS EC2 (Ubuntu)
1. Upload the operator key into /home/ubuntu/.config/solana/id.json

2. Configure EC2 environment variables:
export ANCHOR_WALLET="/home/ubuntu/.config/solana/id.json"
export ANCHOR_PROVIDER_URL="https://api.devnet.solana.com"

3. Setup Node on EC2
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
. ~/.nvm/nvm.sh
nvm install node

4. Package the app:
npm run build
npm run package-app

5. Prepare the app on EC2:
Upload snow-operator.zip to EC2
Unzip it to snow-operator directory
cd snow-operator
npm install

6. Start the app
nohup node snow-operator.js &
echo $! > node-instance.pid

7. Stop the app:
kill `cat node-instance.pid`
rm node-instance.pid

# Update the app
1. Stop the app
2. sftp to the EC2, upload any changes
3. Start the app