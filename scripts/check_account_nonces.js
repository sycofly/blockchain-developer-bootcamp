const { ethers } = require('hardhat');

async function main() {
  console.log("Checking account nonce status...");
  
  // Get accounts
  const accounts = await ethers.getSigners();
  const provider = ethers.provider;
  
  console.log(`Network: ${(await provider.getNetwork()).name} (Chain ID: ${(await provider.getNetwork()).chainId})\n`);
  
  // Check nonce for account 1
  const account1 = accounts[0];
  const pendingNonce1 = await provider.getTransactionCount(account1.address, "pending");
  const confirmedNonce1 = await provider.getTransactionCount(account1.address, "latest");
  
  console.log(`Account 1 (${account1.address}):`);
  console.log(`  Latest Confirmed Nonce: ${confirmedNonce1}`);
  console.log(`  Next Pending Nonce: ${pendingNonce1}`);
  
  if (pendingNonce1 > confirmedNonce1) {
    console.log(`  ⚠️ Has ${pendingNonce1 - confirmedNonce1} pending transactions`);
  } else {
    console.log(`  ✅ No pending transactions`);
  }
  
  // Check nonce for account 2
  const account2 = accounts[1];
  const pendingNonce2 = await provider.getTransactionCount(account2.address, "pending");
  const confirmedNonce2 = await provider.getTransactionCount(account2.address, "latest");
  
  console.log(`\nAccount 2 (${account2.address}):`);
  console.log(`  Latest Confirmed Nonce: ${confirmedNonce2}`);
  console.log(`  Next Pending Nonce: ${pendingNonce2}`);
  
  if (pendingNonce2 > confirmedNonce2) {
    console.log(`  ⚠️ Has ${pendingNonce2 - confirmedNonce2} pending transactions`);
  } else {
    console.log(`  ✅ No pending transactions`);
  }
  
  console.log("\nCheck complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });