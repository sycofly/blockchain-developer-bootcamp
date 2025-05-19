require("@nomiclabs/hardhat-waffle");
require("dotenv").config();
const privateKeys = process.env.PRIVATE_KEYS || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.9",
  networks: {
    localhost: {},
    sepolia: {
      // Primary provider - Alchemy (higher rate limits)
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: privateKeys.split(","),
      timeout: 60000,
    },
    // Backup Infura provider
    sepoliaInfura: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: privateKeys.split(","),
      timeout: 60000,
    },
    // polygon amoy tesent provider
    amoy: {
      url: `https://polygon-amoy.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: privateKeys.split(","),
      gas: 800000, // Gas limit
      chainId: 80002,
      timeout: 180000, // 3 minute timeout
      gasPrice: 25000000000, // 25 Gwei (capped)
      blockGasLimit: 30000000, // Amoy has a higher block gas limit than Ethereum mainnet
      pollingInterval: 10000, // 10 seconds between polls for transaction receipt
      networkCheckTimeout: 999999, // Increased timeout for network connectivity issues
    },
  },
};

