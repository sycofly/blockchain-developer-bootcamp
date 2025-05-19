const fs = require('fs');
const path = require('path');
const config = require('../src/config.json');

async function main() {
  // // Get network ID (Amoy is 80002)
  // const { chainId } = await ethers.provider.getNetwork();
  // console.log(`Network ID: ${chainId}`);
  
  // Get current network
  // const { chainId } = await ethers.provider.getNetwork();

  console.log("Preparing to deploy to Amoy...");
  // fetch contract to deploy
  const Token = await ethers.getContractFactory("Token");
  const Exchange = await ethers.getContractFactory("Exchange");

  const accounts = await ethers.getSigners()
  console.log(`Accounts fetched:\n${accounts[0].address}\n${accounts[1].address}\n`);

  // deploy the contract
  console.log("Deploying DAPP token...");
  console.log("This may take a while on Amoy testnet...");
  const dapp = await Token.deploy('Dapp University', 'DAPP', 1000000);
  console.log("Transaction submitted, waiting for confirmation...");
  await dapp.deployed();
  console.log(`DAPP deployed to: ${dapp.address}`);

  // console.log(`Current network Chain ID: ${chainId}`);

  console.log("Deploying mETH token...");
  console.log("This may take a while on Amoy testnet...");
  const mETH = await Token.deploy('mETH', 'mETH', 1000000);
  console.log("Transaction submitted, waiting for confirmation...");
  await mETH.deployed();
  console.log(`mETH deployed to: ${mETH.address}`);

  console.log("Deploying mDAI token...");
  console.log("This may take a while on Amoy testnet...");
  const mDAI = await Token.deploy('mDAI', 'mDAI', 1000000);
  console.log("Transaction submitted, waiting for confirmation...");
  await mDAI.deployed();
  console.log(`mDAI deployed to: ${mDAI.address}`);

  console.log("Deploying exchange...");
  console.log("This may take a while on Amoy testnet...");
  const exchange = await Exchange.deploy(accounts[1].address, 10);
  console.log("Transaction submitted, waiting for confirmation...");
  await exchange.deployed();
  console.log(`Exchange deployed to: ${exchange.address}`);

  // Update config.json with new contract addresses
  // Get network ID (Amoy is 80002)
  const { chainId } = await ethers.provider.getNetwork();
  console.log(`Network ID: ${chainId}`);
  
  if (chainId !== 80002) {
    console.warn("Warning: Not running on Amoy network! Chain ID:", chainId);
  }

  // Path to config.json
  const configPath = path.join(__dirname, '../src/config.json');

  // Read current config
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log("Loaded existing config.json");
  } catch (error) {
    console.error("Error reading config file:", error);
    config = {};
    console.log("Created new config");
  }

  // Ensure chainId section exists
  if (!config[chainId]) {
    config[chainId] = { explorerURL: "https://amoy.polygonscan.com/" };
  }

  // Update addresses
  config[chainId].exchange = { address: exchange.address };
  config[chainId].DApp = { address: dapp.address };
  config[chainId].mETH = { address: mETH.address };
  config[chainId].mDAI = { address: mDAI.address };

  // Write back to config.json
  fs.writeFileSync(
    configPath,
    JSON.stringify(config, null, 2), // Pretty print with 2-space indentation
    'utf8'
  );

  console.log("Config file updated with new contract addresses");
  console.log("Deployment to Amoy complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
