# Setup and Run Operator Locally
1. Install typescript and ts-node globally:
npm install -g typescript
npm i -g ts-node
npm install

2. Under snowflake-operator folder, create .env file with following properties:
ANCHOR_WALLET="/home/minh/.config/solana/id.json"
ANCHOR_PROVIDER_URL="http://localhost:8899"

3. Run the operator locally
npm start

# Package Node Operator App
1. Install node pkg library
npm install -g pkg

2. Build JS code (into ./dist directory):
npm run build

3. Package the app (into dist/sfn-node-operator execution file):
npm run package-app

# Setup Snow Operator on a new AWS EC2 (Ubuntu)
1. Upload the operator key into /home/ubuntu/.config/solana/id.json

2. Configure EC2 environment variables:
export ANCHOR_WALLET="/home/ubuntu/.config/solana/id.json"
export ANCHOR_PROVIDER_URL="https://api.devnet.solana.com"

(genesysgo endpoint)
export ANCHOR_PROVIDER_URL="https://psytrbhymqlkfrhudd.dev.genesysgo.net:8899"

3. Upload the package into EC2:
sftp into the EC2
Upload dist/sfn-node-operator.zip into the EC2 and unzip it

4. Start the app
nohup ./snf-node-operator &
echo $! > node-instance.pid

5. Stop the app:
kill `cat node-instance.pid`