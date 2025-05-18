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
  },
};

