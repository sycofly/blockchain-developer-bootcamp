const fs = require('fs');
const path = require('path');

async function main() {
  console.log("Preparing to deploy DAPP token to Amoy...");
  // fetch contract to deploy
  const Token = await ethers.getContractFactory("Token");

  const accounts = await ethers.getSigners()
  console.log(`Accounts fetched:\n${accounts[0].address}\n${accounts[1].address}\n`);

  // deploy the contract
  console.log("Deploying DAPP token...");
  const dapp = await Token.deploy('Dapp University', 'DAPP', 1000000);
  await dapp.deployed();
  console.log(`DAPP deployed to: ${dapp.address}`);

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
  config[chainId].DApp = { address: dapp.address };

  // Write back to config.json
  fs.writeFileSync(
    configPath,
    JSON.stringify(config, null, 2), // Pretty print with 2-space indentation
    'utf8'
  );

  console.log("Config file updated with DAPP token address");
  console.log("DAPP token deployment to Amoy complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});