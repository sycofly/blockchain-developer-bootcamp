const fs = require('fs');
const path = require('path');
const config = require('../src/config.json');

async function main() {
  // Get current network
  const { chainId } = await ethers.provider.getNetwork();
  console.log(`Current network Chain ID: ${chainId}`);
  
  // Get current account
  const accounts = await ethers.getSigners();
  const currentAccount = accounts[0].address;
  console.log(`Current account: ${currentAccount}`);
  
  // Check if config has this network
  if (!config[chainId]) {
    console.error(`No configuration found for network ${chainId} in config.json`);
    process.exit(1);
  }
  
  console.log(`\nChecking contract addresses from config.json for chainId ${chainId}:`);
  
  // Check each contract
  const contracts = ['exchange', 'DApp', 'mETH', 'mDAI'];
  for (const contract of contracts) {
    if (!config[chainId][contract] || !config[chainId][contract].address) {
      console.error(`Missing ${contract} address in config.json for chainId ${chainId}`);
      continue;
    }
    
    const address = config[chainId][contract].address;
    console.log(`\nVerifying ${contract} at ${address}...`);
    
    try {
      // Try to get code at address to check if it exists
      const code = await ethers.provider.getCode(address);
      if (code === '0x') {
        console.error(`❌ No contract found at address ${address} for ${contract}`);
        continue;
      }
      
      // Contract exists, try to interact with it based on type
      if (contract === 'exchange') {
        const Exchange = await ethers.getContractFactory('Exchange');
        const exchange = Exchange.attach(address);
        const feeAccount = await exchange.feeAccount();
        const feePercent = await exchange.feePercent();
        console.log(`✅ Exchange verified: Fee Account = ${feeAccount}, Fee Percent = ${feePercent}`);
      } else {
        // It's a token contract
        const Token = await ethers.getContractFactory('Token');
        const token = Token.attach(address);
        const name = await token.name();
        const symbol = await token.symbol();
        const totalSupply = await token.totalSupply();
        console.log(`✅ Token verified: Name = ${name}, Symbol = ${symbol}, Total Supply = ${ethers.utils.formatEther(totalSupply)}`);
        
        // Check token balances
        const balance = await token.balanceOf(currentAccount);
        console.log(`   Balance for current account (${currentAccount}): ${ethers.utils.formatEther(balance)}`);
        
        if (accounts.length > 1) {
          const account2Balance = await token.balanceOf(accounts[1].address);
          console.log(`   Balance for second account (${accounts[1].address}): ${ethers.utils.formatEther(account2Balance)}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error verifying ${contract}: ${error.message}`);
    }
  }
  
  // Additional checks for the exchange
  try {
    const exchangeAddress = config[chainId].exchange.address;
    const exchange = await ethers.getContractAt('Exchange', exchangeAddress);
    
    console.log('\nChecking token balances in exchange:');
    
    // Check exchange balances for tokens
    const dAppAddress = config[chainId].DApp.address;
    const mETHAddress = config[chainId].mETH.address;
    
    // Check for account[0]
    const dAppExchangeBalance0 = await exchange.balanceOf(dAppAddress, accounts[0].address);
    const mETHExchangeBalance0 = await exchange.balanceOf(mETHAddress, accounts[0].address);
    
    console.log(`DApp balance in exchange for ${accounts[0].address}: ${ethers.utils.formatEther(dAppExchangeBalance0)}`);
    console.log(`mETH balance in exchange for ${accounts[0].address}: ${ethers.utils.formatEther(mETHExchangeBalance0)}`);
    
    if (accounts.length > 1) {
      // Check for account[1]
      const dAppExchangeBalance1 = await exchange.balanceOf(dAppAddress, accounts[1].address);
      const mETHExchangeBalance1 = await exchange.balanceOf(mETHAddress, accounts[1].address);
      
      console.log(`DApp balance in exchange for ${accounts[1].address}: ${ethers.utils.formatEther(dAppExchangeBalance1)}`);
      console.log(`mETH balance in exchange for ${accounts[1].address}: ${ethers.utils.formatEther(mETHExchangeBalance1)}`);
    }
    
    // Check orders
    console.log('\nChecking order counts in exchange:');
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log(`Current block number: ${blockNumber}`);
    
    // Get order counts
    const orderStream = await exchange.queryFilter('Order', 0, blockNumber);
    const tradeStream = await exchange.queryFilter('Trade', 0, blockNumber);
    const cancelStream = await exchange.queryFilter('Cancel', 0, blockNumber);
    
    console.log(`Total orders created: ${orderStream.length}`);
    console.log(`Total orders filled: ${tradeStream.length}`);
    console.log(`Total orders cancelled: ${cancelStream.length}`);
    
  } catch (error) {
    console.error(`Error checking exchange details: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });