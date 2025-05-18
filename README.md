# Blockchain Developer Bootcamp - Decentralized Exchange

This project is a decentralized cryptocurrency exchange (DEX) built on the Ethereum blockchain. It allows users to trade ERC-20 tokens, create and fill orders, and manage token balances.

## Project Setup

### Prerequisites
- Node.js and npm
- MetaMask browser extension
- Basic understanding of Ethereum and smart contracts
- installation of Hardhat and other development tools
    - edit package.json with project name and dependencies
    - run `npm install` to install dependencies
    - run `npx hardhat compile` to compile the contracts
    - run `npx hardhat node` to start a local blockchain node
    - run `npx hardhat run scripts/1_deploy.js --network localhost` to deploy the contracts
    - run `npx hardhat run scripts/2_seed_exchange.js --network localhost` to seed the exchange with test data

### Environment Setup

1. **Create a .env file**:
   Copy the `.env.example` file to `.env` and fill in your API keys and private keys:
   ```
   cp .env.example .env
   ```
   
   Then edit the `.env` file with your:
   - Private keys for deployment accounts
   - Infura API key
   - Alchemy API key (recommended for better rate limits)

### Local Development Setup

1. **Install dependencies**:
   ```
   npm install --save-dev @nomiclabs/hardhat-waffle
   ```

2. **Start a local Hardhat blockchain node**:
   ```
   npx hardhat node
   ```

2. **Deploy the contracts to the local blockchain**:
   ```
   npx hardhat run scripts/1_deploy.js --network localhost
   ```

3. **Seed the exchange with test data**:
   ```
   npx hardhat run scripts/2_seed_exchange.js --network localhost
   ```

4. **Update the contract addresses in `src/config.json`** with the addresses from step 2:
   ```json
   {
     "31337": {
       "exchange": {
         "address": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
       },
       "DApp": {
         "address": "0x5FbDB2315678afecb367f032d93F642f64180aa3"
       },
       "mETH": {
         "address": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
       },
       "mDAI": {
         "address": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
       }
     }
   }
   ```

5. **Configure MetaMask** to connect to your local Hardhat network:
   - Network Name: Hardhat Local
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 31337
   - Currency Symbol: ETH

6. **Import Hardhat test accounts into MetaMask**:
   - Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
     - Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   - Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
     - Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

7. **Start the React app**:
   ```
   npm start
   ```

### Testnet Deployment

For deploying to a public testnet like Sepolia:

1. **Configure environment variables**:
   Make sure your `.env` file is set up properly with your:
   - `PRIVATE_KEYS` for deployment accounts
   - `INFURA_API_KEY` for Infura access
   - `ALCHEMY_API_KEY` for Alchemy access (recommended for higher rate limits)
   
   These keys will be used both for contract deployment and by the React app.

2. **Configure MetaMask** for Sepolia testnet:
   - Network Name: Sepolia Test Network
   - RPC URL: https://eth-sepolia.g.alchemy.com/v2/YOUR-ALCHEMY-KEY or https://sepolia.infura.io/v3/YOUR-INFURA-KEY
   - Chain ID: 11155111
   - Currency Symbol: ETH
   - Block Explorer URL: https://sepolia.etherscan.io

3. **Get testnet ETH** from a Sepolia faucet

4. **Deploy contracts to Sepolia with auto-config**:
   ```
   npx hardhat run scripts/1_deploy_sepolia.js --network sepolia
   ```
   This script will automatically update your config.json with the new contract addresses.
   
5. **Seed the exchange with limited test data** (optimized for testnets):
   ```
   npx hardhat run scripts/2_seed_sepolia.js --network sepolia
   ```
   This script uses longer delays between transactions to avoid rate limiting.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the React app in development mode at [http://localhost:3000](http://localhost:3000).

### `npx hardhat node`

Starts a local Ethereum blockchain for development and testing.

### `npx hardhat run scripts/1_deploy.js --network localhost`

Deploys the smart contracts to the local blockchain.

### `npx hardhat run scripts/2_seed_exchange.js --network localhost`

Seeds the exchange with test data (transfers tokens, creates orders, etc.).

### `npx hardhat test`

Runs the contract tests.

### `npm run build`

Builds the app for production to the `build` folder.

## Project Structure

- `/contracts`: Solidity smart contracts
  - `Token.sol`: ERC-20 token implementation
  - `Exchange.sol`: DEX contract for trading tokens

- `/scripts`: Deployment and setup scripts
  - `1_deploy.js`: Deploys the contracts
  - `2_seed_exchange.js`: Seeds the exchange with test data

- `/src`: Frontend React application
  - `/components`: React components
  - `/store`: Redux state management
  - `/abis`: Contract ABIs (Application Binary Interfaces)

## Troubleshooting

### MetaMask Connection Issues

If you encounter issues connecting MetaMask to your local Hardhat node:

1. Ensure Hardhat is running with `npx hardhat node`
2. Verify MetaMask network settings (Chain ID: 31337)
3. Reset your account in MetaMask (Settings > Advanced > Reset Account)
4. Make sure you've imported the correct account private key

### Contract Interaction Errors

If you encounter errors when interacting with the contracts:

1. Check that the contract addresses in `src/config.json` match the deployed addresses
2. Verify that you've properly seeded the exchange
3. Ensure MetaMask is connected to the right network and has sufficient ETH
4. Restart the Hardhat node and redeploy if necessary

### API Rate Limit Issues

When using public testnets like Sepolia, you might encounter API rate limiting:

1. **Rate Limit Errors (429, 403)**:
   - The application uses fallback providers with Alchemy as the primary provider (80% of requests)
   - If you encounter rate limit errors, ensure your `.env` file has valid API keys for both Alchemy and Infura
   - Consider upgrading to a paid Alchemy plan if you need higher rate limits

2. **Slow Loading of Events**:
   - The application fetches blockchain events in chunks to avoid hitting rate limits
   - If data is loading slowly or partially, it may be due to rate limiting
   - Check the browser console for event loading status and errors

3. **Using Multiple RPC Providers**:
   - The app automatically falls back between Alchemy and Infura
   - You can modify the provider preferences in `src/store/interactions.js` if needed

4. **Optimizing for Testnets**:
   - We use network-specific chunk sizes (smaller for testnets, larger for local)
   - Use the Sepolia-specific deployment and seeding scripts for testnet interactions
   - The optimized scripts include:
     - Longer delays between transactions
     - Fewer test orders to reduce RPC calls
     - Auto-updating config.json
     - Network validation checks

5. **Balance Loading Optimizations**:
   - Balance loading is now done in parallel using Promise.all
   - There's a deliberate delay after transfers complete before refreshing balances
   - These changes significantly reduce the number of concurrent RPC calls
