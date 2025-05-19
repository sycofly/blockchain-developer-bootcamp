/**
 * Amoy Testnet Manager Script
 * 
 * Consolidated script for managing contracts on Polygon Amoy testnet.
 * 
 * Usage:
 * - Deploy:      npx hardhat run --network amoy scripts/amoy_manager.js deploy
 * - Check:       npx hardhat run --network amoy scripts/amoy_manager.js check
 * - Status:      npx hardhat run --network amoy scripts/amoy_manager.js status
 * - Seed:        npx hardhat run --network amoy scripts/amoy_manager.js seed
 * - Check TX:    npx hardhat run --network amoy scripts/amoy_manager.js tx <tx_hash>
 */

const fs = require('fs');
const path = require('path');
const config = require('../src/config.json');
const { ethers } = require('hardhat');

// Constants
const AMOY_CHAIN_ID = 80002;
const TX_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// ==============================
// DEPLOYMENT FUNCTIONS
// ==============================
async function deployWithTimeout(factory, ...args) {
  console.log(`Deploying ${args[0]}...`);
  
  // First create the deployment transaction
  const contractFactory = await factory;
  const deployTx = await contractFactory.getDeployTransaction(...args);
  
  // Get the signer
  const [signer] = await ethers.getSigners();
  
  // Estimate gas with a buffer
  const gasEstimate = await ethers.provider.estimateGas({
    from: signer.address,
    data: deployTx.data
  });
  
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
    
    return {
      contract: deployedContract,
      address: receipt.contractAddress,
      txHash: tx.hash,
      confirmed: true
    };
  } catch (error) {
    console.error(`Error while waiting for confirmation: ${error.message}`);
    console.log("The transaction might still succeed, returning the transaction hash for reference");
    
    // Even if waiting for confirmation fails, create contract instance with the expected address
    const nonce = await signer.getTransactionCount("pending") - 1;
    
    console.log(`Nonce used for this transaction: ${nonce}`);
    
    // Calculate the contract address from sender and nonce 
    const contractAddress = ethers.utils.getContractAddress({
      from: signer.address,
      nonce: nonce
    });
    
    console.log(`Expected contract address (based on nonce): ${contractAddress}`);
    
    // Return the factory attached to the derived address
    const deployedContract = contractFactory.attach(contractAddress);
    
    return {
      contract: deployedContract,
      address: contractAddress,
      txHash: tx.hash,
      confirmed: false
    };
  }
}

async function deployContracts() {
  console.log("Preparing to deploy contracts to Amoy testnet...");
  
  // Get current network
  const { chainId } = await ethers.provider.getNetwork();
  console.log(`Network ID: ${chainId}`);
  
  if (chainId !== AMOY_CHAIN_ID) {
    console.error(`Not connected to Amoy testnet. Expected chain ID ${AMOY_CHAIN_ID}, got ${chainId}`);
    return;
  }

  // Get contract factories
  const Token = ethers.getContractFactory("Token");
  const Exchange = ethers.getContractFactory("Exchange");
  
  const accounts = await ethers.getSigners();
  console.log(`Accounts fetched:\n${accounts[0].address}\n${accounts[1].address}\n`);
  
  // Load existing config
  let networkConfig = loadOrCreateConfig(chainId);
  let updated = false;
  
  // Deploy tokens and exchange if they don't exist
  console.log("\nChecking existing deployments...");
  
  // Deploy DAPP token if needed
  if (!networkConfig.DApp || networkConfig.DApp.address === "0x0000000000000000000000000000000000000000") {
    console.log("\n" + "-".repeat(50));
    console.log("DEPLOYING DAPP TOKEN");
    console.log("-".repeat(50));
    
    try {
      const result = await deployWithTimeout(Token, 'Dapp University', 'DAPP', '1000000');
      networkConfig.DApp = { address: result.address };
      updated = true;
      console.log(`DAPP token deployed to: ${result.address}`);
    } catch (error) {
      console.error(`Error deploying DAPP token: ${error.message}`);
    }
  } else {
    console.log(`DAPP token already deployed at ${networkConfig.DApp.address}`);
  }
  
  // Deploy mETH token if needed
  if (!networkConfig.mETH || networkConfig.mETH.address === "0x0000000000000000000000000000000000000000") {
    console.log("\n" + "-".repeat(50));
    console.log("DEPLOYING mETH TOKEN");
    console.log("-".repeat(50));
    
    try {
      const result = await deployWithTimeout(Token, 'mETH', 'mETH', '1000000');
      networkConfig.mETH = { address: result.address };
      updated = true;
      console.log(`mETH token deployed to: ${result.address}`);
    } catch (error) {
      console.error(`Error deploying mETH token: ${error.message}`);
    }
  } else {
    console.log(`mETH token already deployed at ${networkConfig.mETH.address}`);
  }
  
  // Deploy mDAI token if needed
  if (!networkConfig.mDAI || networkConfig.mDAI.address === "0x0000000000000000000000000000000000000000") {
    console.log("\n" + "-".repeat(50));
    console.log("DEPLOYING mDAI TOKEN");
    console.log("-".repeat(50));
    
    try {
      const result = await deployWithTimeout(Token, 'mDAI', 'mDAI', '1000000');
      networkConfig.mDAI = { address: result.address };
      updated = true;
      console.log(`mDAI token deployed to: ${result.address}`);
    } catch (error) {
      console.error(`Error deploying mDAI token: ${error.message}`);
    }
  } else {
    console.log(`mDAI token already deployed at ${networkConfig.mDAI.address}`);
  }
  
  // Deploy Exchange if needed
  if (!networkConfig.exchange || networkConfig.exchange.address === "0x0000000000000000000000000000000000000000") {
    console.log("\n" + "-".repeat(50));
    console.log("DEPLOYING EXCHANGE");
    console.log("-".repeat(50));
    
    try {
      const result = await deployWithTimeout(Exchange, accounts[1].address, 10);
      networkConfig.exchange = { address: result.address };
      updated = true;
      console.log(`Exchange deployed to: ${result.address}`);
    } catch (error) {
      console.error(`Error deploying Exchange: ${error.message}`);
    }
  } else {
    console.log(`Exchange already deployed at ${networkConfig.exchange.address}`);
  }
  
  // Save updated config if needed
  if (updated) {
    saveConfig(chainId, networkConfig);
    console.log("Config file updated with new contract addresses");
  } else {
    console.log("No new contracts were deployed");
  }
  
  console.log("\nDeployment process complete!");
}

// ==============================
// CONTRACT CHECKING FUNCTIONS
// ==============================
async function checkContractCode(address) {
  const code = await ethers.provider.getCode(address);
  return code !== '0x'; // If code is not '0x', then contract exists
}

async function checkContracts() {
  console.log("Checking if contracts exist on chain...");
  
  // Get current network
  const { chainId } = await ethers.provider.getNetwork();
  console.log(`Network ID: ${chainId}`);
  
  if (chainId !== AMOY_CHAIN_ID) {
    console.error(`Not connected to Amoy testnet. Expected chain ID ${AMOY_CHAIN_ID}, got ${chainId}`);
    return;
  }
  
  // Load configuration for the current network
  const networkConfig = loadOrCreateConfig(chainId);
  
  console.log(`\nChecking contracts for Amoy testnet (${networkConfig.explorerURL}):`);
  
  // Check DAPP token
  if (networkConfig.DApp && networkConfig.DApp.address) {
    const address = networkConfig.DApp.address;
    console.log(`DAPP Token (${address}):`);
    
    try {
      const exists = await checkContractCode(address);
      if (exists) {
        console.log(`  ✅ Contract code exists on chain`);
        // Try to get some basic info
        try {
          const Token = await ethers.getContractFactory("Token");
          const dapp = await Token.attach(address);
          const name = await dapp.name();
          const symbol = await dapp.symbol();
          console.log(`  Name: ${name}`);
          console.log(`  Symbol: ${symbol}`);
        } catch (error) {
          console.log(`  ℹ️ Could not read contract details: ${error.message}`);
        }
      } else {
        console.log(`  ❌ No contract code at this address`);
      }
    } catch (error) {
      console.log(`  ❌ Error checking contract: ${error.message}`);
    }
  } else {
    console.log(`DAPP Token: Not deployed`);
  }
  
  // Check mETH token
  if (networkConfig.mETH && networkConfig.mETH.address) {
    const address = networkConfig.mETH.address;
    console.log(`\nmETH Token (${address}):`);
    
    try {
      const exists = await checkContractCode(address);
      if (exists) {
        console.log(`  ✅ Contract code exists on chain`);
        // Try to get some basic info
        try {
          const Token = await ethers.getContractFactory("Token");
          const mETH = await Token.attach(address);
          const name = await mETH.name();
          const symbol = await mETH.symbol();
          console.log(`  Name: ${name}`);
          console.log(`  Symbol: ${symbol}`);
        } catch (error) {
          console.log(`  ℹ️ Could not read contract details: ${error.message}`);
        }
      } else {
        console.log(`  ❌ No contract code at this address`);
      }
    } catch (error) {
      console.log(`  ❌ Error checking contract: ${error.message}`);
    }
  } else {
    console.log(`\nmETH Token: Not deployed`);
  }
  
  // Check mDAI token
  if (networkConfig.mDAI && networkConfig.mDAI.address) {
    const address = networkConfig.mDAI.address;
    console.log(`\nmDAI Token (${address}):`);
    
    try {
      const exists = await checkContractCode(address);
      if (exists) {
        console.log(`  ✅ Contract code exists on chain`);
        // Try to get some basic info
        try {
          const Token = await ethers.getContractFactory("Token");
          const mDAI = await Token.attach(address);
          const name = await mDAI.name();
          const symbol = await mDAI.symbol();
          console.log(`  Name: ${name}`);
          console.log(`  Symbol: ${symbol}`);
        } catch (error) {
          console.log(`  ℹ️ Could not read contract details: ${error.message}`);
        }
      } else {
        console.log(`  ❌ No contract code at this address`);
      }
    } catch (error) {
      console.log(`  ❌ Error checking contract: ${error.message}`);
    }
  } else {
    console.log(`\nmDAI Token: Not deployed`);
  }
  
  // Check Exchange
  if (networkConfig.exchange && networkConfig.exchange.address) {
    const address = networkConfig.exchange.address;
    console.log(`\nExchange (${address}):`);
    
    try {
      const exists = await checkContractCode(address);
      if (exists) {
        console.log(`  ✅ Contract code exists on chain`);
        // Try to get some basic info
        try {
          const Exchange = await ethers.getContractFactory("Exchange");
          const exchange = await Exchange.attach(address);
          const feeAccount = await exchange.feeAccount();
          const feePercent = await exchange.feePercent();
          console.log(`  Fee Account: ${feeAccount}`);
          console.log(`  Fee Percent: ${feePercent}%`);
        } catch (error) {
          console.log(`  ℹ️ Could not read contract details: ${error.message}`);
        }
      } else {
        console.log(`  ❌ No contract code at this address`);
      }
    } catch (error) {
      console.log(`  ❌ Error checking contract: ${error.message}`);
    }
  } else {
    console.log(`\nExchange: Not deployed`);
  }
  
  console.log("\nContract check complete!");
}

// ==============================
// ACCOUNT FUNCTIONS
// ==============================
async function checkAccountStatus() {
  console.log("Checking account status...");
  
  // Get network info
  const { chainId } = await ethers.provider.getNetwork();
  console.log(`Network ID: ${chainId}`);
  
  if (chainId !== AMOY_CHAIN_ID) {
    console.error(`Not connected to Amoy testnet. Expected chain ID ${AMOY_CHAIN_ID}, got ${chainId}`);
    return;
  }
  
  // Get accounts
  const accounts = await ethers.getSigners();
  const provider = ethers.provider;
  
  console.log("\nAccount Balances and Nonces:");
  
  // Check account 1
  const account1 = accounts[0];
  const balance1 = await provider.getBalance(account1.address);
  const pendingNonce1 = await provider.getTransactionCount(account1.address, "pending");
  const confirmedNonce1 = await provider.getTransactionCount(account1.address, "latest");
  
  console.log(`\nAccount 1 (${account1.address}):`);
  console.log(`  Balance: ${ethers.utils.formatEther(balance1)} MATIC`);
  console.log(`  Latest Confirmed Nonce: ${confirmedNonce1}`);
  console.log(`  Next Pending Nonce: ${pendingNonce1}`);
  
  if (pendingNonce1 > confirmedNonce1) {
    console.log(`  ⚠️ Has ${pendingNonce1 - confirmedNonce1} pending transactions`);
  } else {
    console.log(`  ✅ No pending transactions`);
  }
  
  // Check account 2
  const account2 = accounts[1];
  const balance2 = await provider.getBalance(account2.address);
  const pendingNonce2 = await provider.getTransactionCount(account2.address, "pending");
  const confirmedNonce2 = await provider.getTransactionCount(account2.address, "latest");
  
  console.log(`\nAccount 2 (${account2.address}):`);
  console.log(`  Balance: ${ethers.utils.formatEther(balance2)} MATIC`);
  console.log(`  Latest Confirmed Nonce: ${confirmedNonce2}`);
  console.log(`  Next Pending Nonce: ${pendingNonce2}`);
  
  if (pendingNonce2 > confirmedNonce2) {
    console.log(`  ⚠️ Has ${pendingNonce2 - confirmedNonce2} pending transactions`);
  } else {
    console.log(`  ✅ No pending transactions`);
  }
  
  // Try to check Exchange balance if deployed
  const networkConfig = loadOrCreateConfig(chainId);
  if (networkConfig.exchange && networkConfig.exchange.address) {
    try {
      const exchangeBalance = await provider.getBalance(networkConfig.exchange.address);
      console.log(`\nExchange Contract (${networkConfig.exchange.address}):`);
      console.log(`  Balance: ${ethers.utils.formatEther(exchangeBalance)} MATIC`);
    } catch (error) {
      console.log(`\nError checking Exchange contract balance: ${error.message}`);
    }
  }
  
  console.log("\nAccount status check complete!");
}

// ==============================
// TRANSACTION FUNCTIONS
// ==============================
async function checkTransaction(txHash) {
  if (!txHash) {
    console.error("No transaction hash provided");
    return;
  }
  
  console.log(`Checking transaction: ${txHash}`);
  
  // Get network info
  const { chainId } = await ethers.provider.getNetwork();
  console.log(`Network ID: ${chainId}`);
  
  if (chainId !== AMOY_CHAIN_ID) {
    console.error(`Not connected to Amoy testnet. Expected chain ID ${AMOY_CHAIN_ID}, got ${chainId}`);
    return;
  }
  
  // Get provider
  const provider = ethers.provider;
  
  // Get transaction
  try {
    const tx = await provider.getTransaction(txHash);
    
    if (!tx) {
      console.log("❌ Transaction not found on the network");
      return;
    }
    
    console.log("\nTransaction Details:");
    console.log(`From: ${tx.from}`);
    console.log(`To: ${tx.to || "Contract Creation"}`);
    console.log(`Value: ${ethers.utils.formatEther(tx.value)} MATIC`);
    console.log(`Gas Price: ${ethers.utils.formatUnits(tx.gasPrice, 'gwei')} gwei`);
    console.log(`Gas Limit: ${tx.gasLimit.toString()}`);
    console.log(`Nonce: ${tx.nonce}`);
    
    if (tx.blockNumber) {
      console.log(`✅ Transaction confirmed in block: ${tx.blockNumber}`);
      
      // Get receipt for more details
      const receipt = await provider.getTransactionReceipt(txHash);
      console.log(`Gas Used: ${receipt.gasUsed.toString()} (${(receipt.gasUsed.mul(100).div(tx.gasLimit)).toString()}%)`);
      
      if (receipt.status === 1) {
        console.log("✅ Transaction successful!");
      } else {
        console.log("❌ Transaction failed");
      }
      
      // If this was a contract creation
      if (receipt.contractAddress) {
        console.log(`Contract created at: ${receipt.contractAddress}`);
      }
    } else {
      console.log("⏳ Transaction pending - not yet included in a block");
    }
    
  } catch (error) {
    console.error(`Error retrieving transaction: ${error.message}`);
  }
}

// ==============================
// SEEDING FUNCTIONS
// ==============================
async function seedExchange() {
  console.log(`Preparing to seed tokens on exchange...`);
  
  // Get network info
  const { chainId } = await ethers.provider.getNetwork();
  console.log(`Network ID: ${chainId}`);
  
  if (chainId !== AMOY_CHAIN_ID) {
    console.error(`Not connected to Amoy testnet. Expected chain ID ${AMOY_CHAIN_ID}, got ${chainId}`);
    return;
  }
  
  // Load configuration
  const networkConfig = loadOrCreateConfig(chainId);
  
  // Check required contract addresses
  if (!networkConfig.exchange || !networkConfig.exchange.address ||
      !networkConfig.DApp || !networkConfig.DApp.address ||
      !networkConfig.mETH || !networkConfig.mETH.address ||
      !networkConfig.mDAI || !networkConfig.mDAI.address) {
    console.error("Missing contract addresses in config. Please deploy contracts first.");
    return;
  }
  
  console.log(`Exchange: ${networkConfig.exchange.address}`);
  console.log(`DAPP Token: ${networkConfig.DApp.address}`);
  console.log(`mETH Token: ${networkConfig.mETH.address}`);
  console.log(`mDAI Token: ${networkConfig.mDAI.address}`);
  
  // Get contracts
  const Exchange = await ethers.getContractFactory('Exchange');
  const Token = await ethers.getContractFactory('Token');
  
  // Get signers
  const [deployer, user1] = await ethers.getSigners();
  console.log(`\nDeployer: ${deployer.address}`);
  console.log(`User1: ${user1.address}`);
  
  // Fetch deployed contracts
  const exchange = await Exchange.attach(networkConfig.exchange.address);
  const dapp = await Token.attach(networkConfig.DApp.address);
  const mETH = await Token.attach(networkConfig.mETH.address);
  const mDAI = await Token.attach(networkConfig.mDAI.address);
  
  // Give tokens to user1
  const amount = ethers.utils.parseUnits('10000', 18); // 10,000 tokens
  
  console.log(`\nSeeding tokens to User1 (${user1.address})`);
  console.log(`-`.repeat(50));
  
  // Transfer DAPP
  console.log(`\nTransferring DAPP tokens...`);
  try {
    const dappBalance = await dapp.balanceOf(user1.address);
    if (dappBalance.gte(amount)) {
      console.log(`User1 already has ${ethers.utils.formatUnits(dappBalance, 18)} DAPP tokens`);
    } else {
      console.log(`Transferring ${ethers.utils.formatUnits(amount, 18)} DAPP tokens to ${user1.address}...`);
      const tx = await dapp.connect(deployer).transfer(user1.address, amount);
      console.log(`Transaction hash: ${tx.hash}`);
      console.log('Waiting for confirmation...');
      const receipt = await tx.wait();
      console.log(`Transfer complete, gas used: ${receipt.gasUsed.toString()}`);
    }
  } catch (error) {
    console.error(`Error transferring DAPP tokens: ${error.message}`);
  }
  
  // Transfer mETH
  console.log(`\nTransferring mETH tokens...`);
  try {
    const mETHBalance = await mETH.balanceOf(user1.address);
    if (mETHBalance.gte(amount)) {
      console.log(`User1 already has ${ethers.utils.formatUnits(mETHBalance, 18)} mETH tokens`);
    } else {
      console.log(`Transferring ${ethers.utils.formatUnits(amount, 18)} mETH tokens to ${user1.address}...`);
      const tx = await mETH.connect(deployer).transfer(user1.address, amount);
      console.log(`Transaction hash: ${tx.hash}`);
      console.log('Waiting for confirmation...');
      const receipt = await tx.wait();
      console.log(`Transfer complete, gas used: ${receipt.gasUsed.toString()}`);
    }
  } catch (error) {
    console.error(`Error transferring mETH tokens: ${error.message}`);
  }
  
  // Transfer mDAI
  console.log(`\nTransferring mDAI tokens...`);
  try {
    const mDAIBalance = await mDAI.balanceOf(user1.address);
    if (mDAIBalance.gte(amount)) {
      console.log(`User1 already has ${ethers.utils.formatUnits(mDAIBalance, 18)} mDAI tokens`);
    } else {
      console.log(`Transferring ${ethers.utils.formatUnits(amount, 18)} mDAI tokens to ${user1.address}...`);
      const tx = await mDAI.connect(deployer).transfer(user1.address, amount);
      console.log(`Transaction hash: ${tx.hash}`);
      console.log('Waiting for confirmation...');
      const receipt = await tx.wait();
      console.log(`Transfer complete, gas used: ${receipt.gasUsed.toString()}`);
    }
  } catch (error) {
    console.error(`Error transferring mDAI tokens: ${error.message}`);
  }
  
  // Set up exchange deposits
  console.log('\nSetting up exchange deposits...');
  console.log(`-`.repeat(50));
  
  const depositAmount = ethers.utils.parseUnits('1000', 18); // 1,000 tokens
  
  // Deposit DAPP
  console.log(`\nDepositing DAPP tokens to exchange...`);
  try {
    // Check allowance
    const dappAllowance = await dapp.allowance(user1.address, exchange.address);
    if (dappAllowance.lt(depositAmount)) {
      console.log(`Approving ${ethers.utils.formatUnits(depositAmount, 18)} DAPP tokens for exchange...`);
      const approveTx = await dapp.connect(user1).approve(exchange.address, depositAmount);
      console.log(`Transaction hash: ${approveTx.hash}`);
      console.log('Waiting for confirmation...');
      await approveTx.wait();
      console.log(`Approval complete`);
    } else {
      console.log(`Exchange already approved for ${ethers.utils.formatUnits(dappAllowance, 18)} DAPP tokens`);
    }
    
    // Check balance on exchange
    const dappExchangeBalance = await exchange.balanceOf(dapp.address, user1.address);
    if (dappExchangeBalance.gte(depositAmount)) {
      console.log(`User1 already has ${ethers.utils.formatUnits(dappExchangeBalance, 18)} DAPP tokens on exchange`);
    } else {
      console.log(`Depositing ${ethers.utils.formatUnits(depositAmount, 18)} DAPP tokens to exchange...`);
      const depositTx = await exchange.connect(user1).depositToken(dapp.address, depositAmount);
      console.log(`Transaction hash: ${depositTx.hash}`);
      console.log('Waiting for confirmation...');
      await depositTx.wait();
      console.log(`Deposit complete`);
    }
  } catch (error) {
    console.error(`Error depositing DAPP tokens: ${error.message}`);
  }
  
  // Deposit mETH
  console.log(`\nDepositing mETH tokens to exchange...`);
  try {
    // Check allowance
    const mETHAllowance = await mETH.allowance(user1.address, exchange.address);
    if (mETHAllowance.lt(depositAmount)) {
      console.log(`Approving ${ethers.utils.formatUnits(depositAmount, 18)} mETH tokens for exchange...`);
      const approveTx = await mETH.connect(user1).approve(exchange.address, depositAmount);
      console.log(`Transaction hash: ${approveTx.hash}`);
      console.log('Waiting for confirmation...');
      await approveTx.wait();
      console.log(`Approval complete`);
    } else {
      console.log(`Exchange already approved for ${ethers.utils.formatUnits(mETHAllowance, 18)} mETH tokens`);
    }
    
    // Check balance on exchange
    const mETHExchangeBalance = await exchange.balanceOf(mETH.address, user1.address);
    if (mETHExchangeBalance.gte(depositAmount)) {
      console.log(`User1 already has ${ethers.utils.formatUnits(mETHExchangeBalance, 18)} mETH tokens on exchange`);
    } else {
      console.log(`Depositing ${ethers.utils.formatUnits(depositAmount, 18)} mETH tokens to exchange...`);
      const depositTx = await exchange.connect(user1).depositToken(mETH.address, depositAmount);
      console.log(`Transaction hash: ${depositTx.hash}`);
      console.log('Waiting for confirmation...');
      await depositTx.wait();
      console.log(`Deposit complete`);
    }
  } catch (error) {
    console.error(`Error depositing mETH tokens: ${error.message}`);
  }
  
  console.log("\nToken seeding complete!");
}

// ==============================
// UTILITY FUNCTIONS
// ==============================
function loadOrCreateConfig(chainId) {
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
    config[chainId] = { 
      explorerURL: "https://amoy.polygonscan.com/",
      exchange: { address: "0x0000000000000000000000000000000000000000" },
      DApp: { address: "0x0000000000000000000000000000000000000000" },
      mETH: { address: "0x0000000000000000000000000000000000000000" },
      mDAI: { address: "0x0000000000000000000000000000000000000000" }
    };
  }
  
  return config[chainId];
}

function saveConfig(chainId, networkConfig) {
  const configPath = path.join(__dirname, '../src/config.json');
  
  // Load existing config
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    config = {};
  }
  
  // Update with new data
  config[chainId] = networkConfig;
  
  // Write back to file
  fs.writeFileSync(
    configPath,
    JSON.stringify(config, null, 2), // Pretty print with 2-space indentation
    'utf8'
  );
  
  console.log(`Config saved to ${configPath}`);
}

// ==============================
// MAIN FUNCTION
// ==============================
async function main() {
  // Get command from args
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  console.log(`Amoy Manager - Command: ${command}\n`);
  
  switch (command) {
    case 'deploy':
      await deployContracts();
      break;
    case 'check':
      await checkContracts();
      break;
    case 'status':
      await checkAccountStatus();
      break;
    case 'tx':
      await checkTransaction(args[1]);
      break;
    case 'seed':
      await seedExchange();
      break;
    case 'help':
    default:
      console.log("Amoy Manager - Help");
      console.log("-".repeat(50));
      console.log("Available commands:");
      console.log("  deploy    - Deploy contracts to Amoy testnet");
      console.log("  check     - Check status of deployed contracts");
      console.log("  status    - Check account balances and nonces");
      console.log("  tx <hash> - Check status of a transaction");
      console.log("  seed      - Seed the exchange with tokens");
      console.log("  help      - Show this help message");
      console.log("\nUsage:");
      console.log("  npx hardhat run --network amoy scripts/amoy_manager.js <command>");
      break;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });