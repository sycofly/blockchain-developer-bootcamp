const fs = require('fs');
const path = require('path');
const config = require('../src/config.json');

async function checkTransactionStatus(txHash) {
  if (!txHash) return null;
  
  try {
    console.log(`Checking transaction status for hash: ${txHash}`);
    const tx = await ethers.provider.getTransaction(txHash);
    
    if (!tx) {
      console.log("❌ Transaction not found on the network");
      return null;
    }
    
    console.log(`Transaction found on network. From: ${tx.from}`);
    
    if (!tx.blockNumber) {
      console.log("⏳ Transaction still pending, not yet included in a block");
      return null;
    }
    
    const receipt = await ethers.provider.getTransactionReceipt(txHash);
    
    if (receipt.status === 1) {
      console.log("✅ Transaction successful!");
      if (receipt.contractAddress) {
        console.log(`Contract created at: ${receipt.contractAddress}`);
        return receipt.contractAddress;
      }
    } else {
      console.log("❌ Transaction failed");
    }
    
    return null;
  } catch (error) {
    console.error(`Error checking transaction: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log("Checking Amoy deployment status...");
  
  // Get network ID (Amoy is 80002)
  const { chainId } = await ethers.provider.getNetwork();
  console.log(`Current Network ID: ${chainId}`);
  
  // Check if we're on Amoy
  if (chainId !== 80002) {
    console.warn("Warning: Not running on Amoy network! Chain ID:", chainId);
    console.log("Please connect to Amoy network and try again.");
    return;
  }
  
  // Allow checking transaction status
  // Get transaction hash from command line arguments if provided
  const args = process.argv.slice(2);
  if (args.length > 0 && args[0].startsWith("0x")) {
    const contractAddress = await checkTransactionStatus(args[0]);
    if (contractAddress) {
      console.log("You can add this address to your config.json");
    }
    return;
  }
  
  console.log("Connected to Amoy testnet (Chain ID: 80002)");
  
  // Load configuration for Amoy
  const amoyConfig = config[chainId];
  if (!amoyConfig) {
    console.log("No configuration found for Amoy network");
    return;
  }
  
  console.log("\nDeployed Contract Addresses:");
  
  // Check DAPP token
  if (amoyConfig.DApp && amoyConfig.DApp.address && amoyConfig.DApp.address !== "0x0000000000000000000000000000000000000000") {
    console.log(`DAPP Token: ${amoyConfig.DApp.address}`);
    
    // Try to get token instance and verify it works
    const Token = await ethers.getContractFactory("Token");
    try {
      const dapp = await Token.attach(amoyConfig.DApp.address);
      const name = await dapp.name();
      const symbol = await dapp.symbol();
      const totalSupply = await dapp.totalSupply();
      console.log(`  Name: ${name}`);
      console.log(`  Symbol: ${symbol}`);
      console.log(`  Total Supply: ${ethers.utils.formatUnits(totalSupply, 18)}`);
      console.log("  ✅ DAPP token is accessible and working");
    } catch (error) {
      console.log(`  ❌ Error accessing DAPP token: ${error.message}`);
    }
  } else {
    console.log("DAPP Token: Not deployed or invalid address");
  }
  
  // Check mETH token
  if (amoyConfig.mETH && amoyConfig.mETH.address && amoyConfig.mETH.address !== "0x0000000000000000000000000000000000000000") {
    console.log(`\nmETH Token: ${amoyConfig.mETH.address}`);
    
    // Try to get token instance and verify it works
    const Token = await ethers.getContractFactory("Token");
    try {
      const mETH = await Token.attach(amoyConfig.mETH.address);
      const name = await mETH.name();
      const symbol = await mETH.symbol();
      const totalSupply = await mETH.totalSupply();
      console.log(`  Name: ${name}`);
      console.log(`  Symbol: ${symbol}`);
      console.log(`  Total Supply: ${ethers.utils.formatUnits(totalSupply, 18)}`);
      console.log("  ✅ mETH token is accessible and working");
    } catch (error) {
      console.log(`  ❌ Error accessing mETH token: ${error.message}`);
    }
  } else {
    console.log("mETH Token: Not deployed or invalid address");
  }
  
  // Check mDAI token
  if (amoyConfig.mDAI && amoyConfig.mDAI.address && amoyConfig.mDAI.address !== "0x0000000000000000000000000000000000000000") {
    console.log(`\nmDAI Token: ${amoyConfig.mDAI.address}`);
    
    // Try to get token instance and verify it works
    const Token = await ethers.getContractFactory("Token");
    try {
      const mDAI = await Token.attach(amoyConfig.mDAI.address);
      const name = await mDAI.name();
      const symbol = await mDAI.symbol();
      const totalSupply = await mDAI.totalSupply();
      console.log(`  Name: ${name}`);
      console.log(`  Symbol: ${symbol}`);
      console.log(`  Total Supply: ${ethers.utils.formatUnits(totalSupply, 18)}`);
      console.log("  ✅ mDAI token is accessible and working");
    } catch (error) {
      console.log(`  ❌ Error accessing mDAI token: ${error.message}`);
    }
  } else {
    console.log("mDAI Token: Not deployed or invalid address");
  }
  
  // Check Exchange
  if (amoyConfig.exchange && amoyConfig.exchange.address && amoyConfig.exchange.address !== "0x0000000000000000000000000000000000000000") {
    console.log(`\nExchange: ${amoyConfig.exchange.address}`);
    
    // Try to get exchange instance and verify it works
    const Exchange = await ethers.getContractFactory("Exchange");
    try {
      const exchange = await Exchange.attach(amoyConfig.exchange.address);
      const feeAccount = await exchange.feeAccount();
      const feePercent = await exchange.feePercent();
      console.log(`  Fee Account: ${feeAccount}`);
      console.log(`  Fee Percent: ${feePercent}%`);
      console.log("  ✅ Exchange is accessible and working");
    } catch (error) {
      console.log(`  ❌ Error accessing Exchange: ${error.message}`);
    }
  } else {
    console.log("Exchange: Not deployed or invalid address");
  }
  
  console.log("\nExplorer URL:", amoyConfig.explorerURL);
  console.log("\nDeployment check complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});