# CheckPay Smart Contracts

This directory contains the smart contracts for CheckPay, built with Hardhat and optimized for the Celo blockchain.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Compile contracts
pnpm compile

# Run tests
pnpm test

```

## 📜 Available Scripts

- `pnpm compile` - Compile smart contracts
- `pnpm test` - Run contract tests
- `pnpm verify` - Verify contracts on Celoscan
- `pnpm clean` - Clean artifacts and cache

## 🌐 Networks

### Celo Mainnet
- **Chain ID**: 42220
- **RPC URL**: https://forno.celo.org
- **Explorer**: https://celoscan.io

### Sepolia Testnet
- **Chain ID**: 11142220
- **RPC URL**: https://forno.celo-sepolia.celo-testnet.org
- **Explorer**: https://celo-sepolia.blockscout.com
- **Faucet**: https://faucet.celo.org/sepolia

## 🔧 Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Fill in your private key and API keys:
   ```env
   PRIVATE_KEY=your_private_key_without_0x_prefix
   CELOSCAN_API_KEY=your_celoscan_api_key
   ```

## 🚀 Deployment
1. For LOCAL/HARDHAT:
   - Deploy MockCUSD first:

```bash
pnpm exec hardhat ignition deploy ignition/modules/MockCUSD.ts --network localhost
```
      -> copy the resulting contract address e.g. 

```env
0x5FbDB2315678afecb367f032d93F642f64180aa3
```

   - Deploy Factory with MockCUSD address:

```bash
pnpm exec hardhat ignition deploy ignition/modules/Factory.ts --network localhost --parameters '{"FactoryModule":{"cUSDAddress":"0x5FbDB2315678afecb367f032d93F642f64180aa3"}}'
```

2. For CELO SEPOLIA TESTNET:
```bash
pnpm exec hardhat ignition deploy ignition/modules/Factory.ts --network sepolia --parameters '{"FactoryModule":{"cUSDAddress":"0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b"}}'
```

2. For MAINNET (use real cUSD):
```bash
pnpm exec hardhat ignition deploy ignition/modules/Factory.ts --network celo --parameters '{"FactoryModule":{"cUSDAddress":"0x765de816845861e75a25fca122bb6898b8b1282a"}}'
```

   - cUSD addresses:
      - Celo Mainnet: `0x765de816845861e75a25fca122bb6898b8b1282a`
      - Sepolia Testnet: `0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b`

3. Verify contracts on Etherscan
   -> example for Sepolia Testnet:
```bash
pnpm exec hardhat ignition verify chain-11142220 --include-unrelated-contracts --show-stack-traces
```
```bash
pnpm exec hardhat ignition verify chain-42220 --include-unrelated-contracts --show-stack-traces
```


## 📁 Project Structure

```
contracts/          # Smart contract source files
├── Lock.sol        # Sample timelock contract

test/              # Contract tests
├── Lock.ts        # Tests for Lock contract

ignition/          # Deployment scripts
└── modules/
    └── Lock.ts    # Lock contract deployment

hardhat.config.ts  # Hardhat configuration
tsconfig.json      # TypeScript configuration
```

## 🔐 Security Notes

- Never commit your `.env` file with real private keys
- Use a dedicated wallet for development/testing
- Test thoroughly on Alfajores before mainnet deployment
- Consider using a hardware wallet for mainnet deployments

## 📚 Learn More

- [Hardhat Documentation](https://hardhat.org/docs)
- [Celo Developer Documentation](https://docs.celo.org)
- [Celo Smart Contract Best Practices](https://docs.celo.org/developer/contractkit)
- [Viem Documentation](https://viem.sh) (Ethereum library used by Hardhat)
