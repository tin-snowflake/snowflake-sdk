# Build and deploy/re-deploy program

cargo build-bpf --bpf-out-dir=target/deploy
solana program deploy target/deploy/price_checker.so

# Deploy program to Devnet
solana program deploy target/deploy/price_checker.so -u devnet