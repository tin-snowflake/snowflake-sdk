# DEV STARTING
1. build 
npm install

2. create symlink to idl, from the snow directory, use the command below
(note that ln command needs the source file to be in absolute path so you have to start the path with ~ or /)

ln -sf ~/workspace/snow/snowflake-rust/target/idl/snowflake.json src/idl/snowflake.json

3. Start the app locally
yarn start

# AWS DEPLOYMENT
1. Build: the build command below will build react app into ./build directory
npm run build

2. Deploy: 
* Deploy into staging:
aws s3 sync build/ s3://app-staging.snowflake.so

* Deploy into main:
aws s3 sync build/ s3://app.snowflake.so

3 Refresh cloudfront cache
* Refresh staging:
aws cloudfront create-invalidation --distribution-id EBKZXH4BBKW9E --paths "/*"

* Refresh main:
aws cloudfront create-invalidation --distribution-id E23KX6PLDAOYIH --paths "/*"

