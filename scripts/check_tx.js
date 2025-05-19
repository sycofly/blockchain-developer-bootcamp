const { ethers } = require('hardhat');

async function main() {
  // Get the transaction hash from command line arguments
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Please provide a transaction hash as an argument");
    process.exit(1);
  }
  
  const txHash = args[0];
  console.log(`Checking transaction: ${txHash}`);
  
  // Get provider and network information
  const provider = ethers.provider;
  const network = await provider.getNetwork();
  console.log(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
  
  // Get transaction
  try {
    const tx = await provider.getTransaction(txHash);
    
    if (!tx) {
      console.log("❌ Transaction not found on the network");
      process.exit(1);
    }
    
    console.log("\nTransaction Details:");
    console.log(`From: ${tx.from}`);
    console.log(`To: ${tx.to || "Contract Creation"}`);
    console.log(`Value: ${ethers.utils.formatEther(tx.value)} ETH`);
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
      
      // Check pending transactions for this account
      const accounts = await ethers.getSigners();
      const pendingCount = await provider.getTransactionCount(accounts[0].address, "pending");
      const confirmedCount = await provider.getTransactionCount(accounts[0].address, "latest");
      
      console.log(`\nAccount Status (${accounts[0].address}):`);
      console.log(`Confirmed Nonce: ${confirmedCount}`);
      console.log(`Pending Nonce: ${pendingCount}`);
      console.log(`Pending Transactions: ${pendingCount - confirmedCount}`);
      
      if (tx.nonce < confirmedCount) {
        console.log("❌ This transaction has been replaced by a transaction with the same nonce");
      } else if (pendingCount > tx.nonce + 1) {
        console.log("⚠️ There are transactions with higher nonces that depend on this one");
      }
    }
    
  } catch (error) {
    console.error(`Error retrieving transaction: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });