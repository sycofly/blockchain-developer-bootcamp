// Scripts for seeding the exchange with tokens
const config = require('../src/config.json');
const { ethers } = require('hardhat');

// Wait for a specified number of confirmations (useful for Amoy testnet)
const wait = (seconds) => {
  const milliseconds = seconds * 1000;
  return new Promise(resolve => setTimeout(resolve, milliseconds));
};

async function main() {
  console.log(`Preparing to seed tokens on exchange...`);
  
  // Get deployed contract addresses from config
  const { chainId } = await ethers.provider.getNetwork();
  console.log(`Network ID: ${chainId}`);
  
  if (!config[chainId]) {
    console.error(`No configuration found for network ${chainId}`);
    return;
  }
  
  // Check required contract addresses
  if (!config[chainId].exchange.address ||
      !config[chainId].DApp.address ||
      !config[chainId].mETH.address ||
      !config[chainId].mDAI.address) {
    console.error("Missing contract addresses in config.json");
    return;
  }
  
  console.log(`Exchange: ${config[chainId].exchange.address}`);
  console.log(`DAPP Token: ${config[chainId].DApp.address}`);
  console.log(`mETH Token: ${config[chainId].mETH.address}`);
  console.log(`mDAI Token: ${config[chainId].mDAI.address}`);
  
  // Get contracts
  const Exchange = await ethers.getContractFactory('Exchange');
  const Token = await ethers.getContractFactory('Token');
  
  // Get signers
  const [deployer, user1] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  console.log(`User1: ${user1.address}`);
  
  // Fetch deployed contracts
  const exchange = await Exchange.attach(config[chainId].exchange.address);
  const dapp = await Token.attach(config[chainId].DApp.address);
  const mETH = await Token.attach(config[chainId].mETH.address);
  const mDAI = await Token.attach(config[chainId].mDAI.address]);
  
  // Give tokens to user1
  const amount = ethers.utils.parseUnits('10000', 18); // 10,000 tokens
  console.log(`Transferring ${ethers.utils.formatUnits(amount, 18)} DAPP tokens to ${user1.address}...`);
  
  let transaction, result;
  try {
    transaction = await dapp.connect(deployer).transfer(user1.address, amount);
    console.log(`Transaction hash: ${transaction.hash}`);
    console.log('Waiting for confirmation...');
    result = await transaction.wait();
    console.log(`Transfer complete, gas used: ${result.gasUsed.toString()}`);
  } catch (error) {
    console.error(`Error transferring DAPP tokens: ${error.message}`);
  }
  
  // Set up exchange users
  console.log('\nSetting up exchange users...');
  
  // User1 approves 1000 DAPP tokens to the exchange
  const depositAmount = ethers.utils.parseUnits('1000', 18); // 1,000 tokens
  
  console.log(`Approving ${ethers.utils.formatUnits(depositAmount, 18)} DAPP tokens for exchange...`);
  try {
    transaction = await dapp.connect(user1).approve(exchange.address, depositAmount);
    console.log(`Transaction hash: ${transaction.hash}`);
    console.log('Waiting for confirmation...');
    result = await transaction.wait();
    console.log(`Approval complete, gas used: ${result.gasUsed.toString()}`);
  } catch (error) {
    console.error(`Error approving DAPP tokens: ${error.message}`);
  }
  
  console.log(`Depositing ${ethers.utils.formatUnits(depositAmount, 18)} DAPP tokens to exchange...`);
  try {
    transaction = await exchange.connect(user1).depositToken(dapp.address, depositAmount);
    console.log(`Transaction hash: ${transaction.hash}`);
    console.log('Waiting for confirmation...');
    result = await transaction.wait();
    console.log(`Deposit complete, gas used: ${result.gasUsed.toString()}`);
  } catch (error) {
    console.error(`Error depositing DAPP tokens: ${error.message}`);
  }
  
  console.log('\nToken seeding complete!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });