const fs = require('fs');
const path = require('path');
const config = require('../src/config.json');
const { ethers } = require('hardhat');

// Define a timeout for transaction confirmations
const TX_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// Helper function to deploy with timeout
async function deployWithTimeout(factory, ...args) {
  console.log(`Deploying ${args[0]}...`);
  
  // First create the deployment transaction
  const contractFactory = await factory;
  const deployTx = await contractFactory.getDeployTransaction(...args);
  
  // Get the signer (using the first account)
  const accounts = await ethers.getSigners();
  const signer = accounts[0];  // Use the first account for deployment
  
  // Estimate gas with a buffer
  const gasEstimate = await ethers.provider.estimateGas(
    {
      from: signer.address,
      data: deployTx.data
    }
  );
  
  console.log(`Gas estimate: ${gasEstimate.toString()}`);
  
  // Set gas limit with a 20% buffer
  const gasLimit = gasEstimate.mul(120).div(100);
  console.log(`Using gas limit: ${gasLimit.toString()}`);
  
  // Send the transaction manually
  console.log("Sending transaction...");
  const tx = await signer.sendTransaction({
    data: deployTx.data,
    gasLimit: gasLimit,
    gasPrice: ethers.utils.parseUnits("25", "gwei") // 25 gwei
  });
  
  console.log(`Transaction hash: ${tx.hash}`);
  console.log("Waiting for confirmation (this may take several minutes)...");
  
  // Set up a timeout for the transaction receipt wait
  const waitPromise = tx.wait(1); // wait for 1 confirmation
  
  // Create a timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Transaction confirmation timed out after ${TX_TIMEOUT/1000} seconds`));
    }, TX_TIMEOUT);
  });
  
  // Race between transaction confirmation and timeout
  try {
    const receipt = await Promise.race([waitPromise, timeoutPromise]);
    console.log("Transaction confirmed!");
    
    // Now attach the contract interface to the deployed address
    const deployedContract = contractFactory.attach(receipt.contractAddress);
    console.log(`Contract deployed to: ${receipt.contractAddress}`);
    
    return deployedContract;
  } catch (error) {
    console.error(`Error while waiting for confirmation: ${error.message}`);
    console.log("The transaction might still succeed, returning the transaction hash for reference");
    
    // Even if waiting for confirmation fails, create contract instance with the expected address
    const nonce = await signer.getTransactionCount("pending") - 1;
    
    console.log(`Nonce used for this transaction: ${nonce}`);
    
    // Calculate the contract address from sender and nonce 
    // Note: This is an approximation and might not be 100% accurate
    const contractAddress = ethers.utils.getContractAddress({
      from: signer.address,
      nonce: nonce
    });
    
    console.log(`Expected contract address (based on nonce): ${contractAddress}`);
    
    // Return the factory attached to the derived address
    // This might not be reliable if tx didn't succeed
    const deployedContract = contractFactory.attach(contractAddress);
    
    return {
      contract: deployedContract,
      address: contractAddress,
      txHash: tx.hash,
      confirmed: false
    };
  }
}

async function main() {
  console.log("Preparing to deploy remaining contracts to Amoy...");
  
  // Get current network
  const { chainId } = await ethers.provider.getNetwork();
  console.log(`Network ID: ${chainId}`);
  
  if (chainId !== 80002) {
    console.warn("Warning: Not running on Amoy network! Chain ID:", chainId);
    console.warn("Continuing anyway...");
  }

  // Get contract factories
  const Token = ethers.getContractFactory("Token");
  const Exchange = ethers.getContractFactory("Exchange");
  
  const accounts = await ethers.getSigners();
  console.log(`Accounts fetched:\n${accounts[0].address}\n${accounts[1].address}\n`);
  console.log(`Using first account (${accounts[0].address}) for deployment`);

  // Load existing config
  let config;
  const configPath = path.join(__dirname, '../src/config.json');
  
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

  // Deploy mETH token
  console.log("-".repeat(50));
  console.log("DEPLOYING mETH TOKEN");
  console.log("-".repeat(50));
  
  try {
    const result = await deployWithTimeout(Token, 'mETH', 'mETH', 1000000);
    
    // Check if we got a confirmed contract or just a potential contract
    let mETHAddress;
    if (result.confirmed === false) {
      console.log("Contract deployment wasn't confirmed within timeout period");
      console.log(`Transaction hash: ${result.txHash}`);
      mETHAddress = result.address;
    } else {
      mETHAddress = result.address;
    }
    
    console.log(`mETH token address: ${mETHAddress}`);
    
    // Update mETH address
    config[chainId].mETH = { address: mETHAddress };

    // Write back to config.json
    fs.writeFileSync(
      configPath,
      JSON.stringify(config, null, 2),
      'utf8'
    );

    console.log("Config file updated with mETH contract address");
    
  } catch (error) {
    console.error(`Error deploying mETH token: ${error.message}`);
  }
  
  // Deploy mDAI token
  console.log("\n" + "-".repeat(50));
  console.log("DEPLOYING mDAI TOKEN");
  console.log("-".repeat(50));
  
  try {
    const result = await deployWithTimeout(Token, 'mDAI', 'mDAI', 1000000);
    
    // Check if we got a confirmed contract or just a potential contract
    let mDAIAddress;
    if (result.confirmed === false) {
      console.log("Contract deployment wasn't confirmed within timeout period");
      console.log(`Transaction hash: ${result.txHash}`);
      mDAIAddress = result.address;
    } else {
      mDAIAddress = result.address;
    }
    
    console.log(`mDAI token address: ${mDAIAddress}`);
    
    // Update mDAI address
    config[chainId].mDAI = { address: mDAIAddress };

    // Write back to config.json
    fs.writeFileSync(
      configPath,
      JSON.stringify(config, null, 2),
      'utf8'
    );

    console.log("Config file updated with mDAI contract address");
    
  } catch (error) {
    console.error(`Error deploying mDAI token: ${error.message}`);
  }
  
  // Deploy Exchange
  console.log("\n" + "-".repeat(50));
  console.log("DEPLOYING EXCHANGE");
  console.log("-".repeat(50));
  
  try {
    const result = await deployWithTimeout(Exchange, accounts[1].address, 10);
    
    // Check if we got a confirmed contract or just a potential contract
    let exchangeAddress;
    if (result.confirmed === false) {
      console.log("Contract deployment wasn't confirmed within timeout period");
      console.log(`Transaction hash: ${result.txHash}`);
      exchangeAddress = result.address;
    } else {
      exchangeAddress = result.address;
    }
    
    console.log(`Exchange address: ${exchangeAddress}`);
    
    // Update Exchange address
    config[chainId].exchange = { address: exchangeAddress };

    // Write back to config.json
    fs.writeFileSync(
      configPath,
      JSON.stringify(config, null, 2),
      'utf8'
    );

    console.log("Config file updated with Exchange contract address");
    
  } catch (error) {
    console.error(`Error deploying Exchange: ${error.message}`);
  }
  
  console.log("\nRemaining contracts deployment complete!");
  console.log("You can use check_amoy_deployment.js to verify contract status later.");
  console.log("Even if confirmations timed out, transactions might still be processed by the network.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});