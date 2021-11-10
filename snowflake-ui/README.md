# DEV STARTING

# build 
npm install
yarn start

# create symlink to idl, from the snow directory, use the command below
# note that ln command needs the source file to be in absolute path so you have to start the path with ~ or /
ln -sf ~/workspace/snow/snowflake-rust/target/idl/snowflake.json src/idl/snowflake.json



# AWS DEPLOYMENT
# Build: the build command below will build react app into ./build directory
npm run build

# Deploy: 
aws s3 sync build/ s3://app.snowflake.so

# Refresh cloudfront cache
aws cloudfront create-invalidation --distribution-id E23KX6PLDAOYIH --paths "/*"

