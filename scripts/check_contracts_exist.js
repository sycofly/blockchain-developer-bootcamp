const { ethers } = require('hardhat');
const config = require('../src/config.json');

async function checkContractCode(address) {
  const code = await ethers.provider.getCode(address);
  return code !== '0x'; // If code is not '0x', then contract exists
}

async function main() {
  console.log("Checking if contracts exist on chain...");
  
  // Get current network
  const { chainId } = await ethers.provider.getNetwork();
  console.log(`Network ID: ${chainId}`);
  
  // Load configuration for the current network
  const networkConfig = config[chainId];
  if (!networkConfig) {
    console.log(`No configuration found for network ${chainId}`);
    return;
  }
  
  console.log(`\nChecking contracts for network: ${chainId} (${networkConfig.explorerURL})`);
  
  // Check DAPP token
  if (networkConfig.DApp && networkConfig.DApp.address) {
    const address = networkConfig.DApp.address;
    console.log(`DAPP Token (${address}):`);
    
    try {
      const exists = await checkContractCode(address);
      if (exists) {
        console.log(`  ✅ Contract code exists on chain`);
      } else {
        console.log(`  ❌ No contract code at this address`);
      }
    } catch (error) {
      console.log(`  ❌ Error checking contract: ${error.message}`);
    }
  }
  
  // Check mETH token
  if (networkConfig.mETH && networkConfig.mETH.address) {
    const address = networkConfig.mETH.address;
    console.log(`\nmETH Token (${address}):`);
    
    try {
      const exists = await checkContractCode(address);
      if (exists) {
        console.log(`  ✅ Contract code exists on chain`);
      } else {
        console.log(`  ❌ No contract code at this address`);
      }
    } catch (error) {
      console.log(`  ❌ Error checking contract: ${error.message}`);
    }
  }
  
  // Check mDAI token
  if (networkConfig.mDAI && networkConfig.mDAI.address) {
    const address = networkConfig.mDAI.address;
    console.log(`\nmDAI Token (${address}):`);
    
    try {
      const exists = await checkContractCode(address);
      if (exists) {
        console.log(`  ✅ Contract code exists on chain`);
      } else {
        console.log(`  ❌ No contract code at this address`);
      }
    } catch (error) {
      console.log(`  ❌ Error checking contract: ${error.message}`);
    }
  }
  
  // Check Exchange
  if (networkConfig.exchange && networkConfig.exchange.address) {
    const address = networkConfig.exchange.address;
    console.log(`\nExchange (${address}):`);
    
    try {
      const exists = await checkContractCode(address);
      if (exists) {
        console.log(`  ✅ Contract code exists on chain`);
      } else {
        console.log(`  ❌ No contract code at this address`);
      }
    } catch (error) {
      console.log(`  ❌ Error checking contract: ${error.message}`);
    }
  }
  
  console.log("\nCheck complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });