const fs = require('fs');
const path = require('path');

async function main() {
  console.log("Preparing to deploy to Sepolia...");

  // fetch contract to deploy
  const Token = await ethers.getContractFactory("Token");
  const Exchange = await ethers.getContractFactory("Exchange");

  const accounts = await ethers.getSigners()
  console.log(`Accounts fetched:\n${accounts[0].address}\n${accounts[1].address}\n`);

  // deploy the contract
  console.log("Deploying DAPP token...");
  const dapp = await Token.deploy('Dapp University', 'DAPP', 1000000);
  await dapp.deployed();
  console.log(`DAPP deployed to: ${dapp.address}`);

  console.log("Deploying mETH token...");
  const mETH = await Token.deploy('mETH', 'mETH', 1000000);
  await mETH.deployed();
  console.log(`mETH deployed to: ${mETH.address}`);

  console.log("Deploying mDAI token...");
  const mDAI = await Token.deploy('mDAI', 'mDAI', 1000000);
  await mDAI.deployed();
  console.log(`mDAI deployed to: ${mDAI.address}`);

  console.log("Deploying exchange...");
  const exchange = await Exchange.deploy(accounts[1].address, 10);
  await exchange.deployed();
  console.log(`Exchange deployed to: ${exchange.address}`);

  // Update config.json with new contract addresses
  // Get network ID (Sepolia is 11155111)
  const { chainId } = await ethers.provider.getNetwork();
  console.log(`Network ID: ${chainId}`);
  
  if (chainId !== 11155111) {
    console.warn("Warning: Not running on Sepolia network! Chain ID:", chainId);
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
    config[chainId] = { explorerURL: "https://sepolia.etherscan.io/" };
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
  console.log("Deployment to Sepolia complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});