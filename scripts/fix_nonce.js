const { ethers } = require('hardhat');

async function main() {
  console.log("Checking account nonce status...");
  
  // Get signer
  const [account] = await ethers.getSigners();
  console.log(`Account: ${account.address}`);
  
  // Get nonce information
  const pendingNonce = await ethers.provider.getTransactionCount(account.address, "pending");
  const confirmedNonce = await ethers.provider.getTransactionCount(account.address, "latest");
  
  console.log(`Latest Confirmed Nonce: ${confirmedNonce}`);
  console.log(`Next Pending Nonce: ${pendingNonce}`);
  
  if (pendingNonce > confirmedNonce) {
    console.log(`Number of pending transactions: ${pendingNonce - confirmedNonce}`);
    console.log("\nOptions to fix nonce issues:");
    console.log("1. Wait for pending transactions to confirm");
    console.log("2. Send a 'replacement' transaction with the same nonce but higher gas price");
    console.log("3. Clear the transaction pool by sending empty transactions");
    
    const args = process.argv.slice(2);
    if (args.length > 0 && args[0] === "fix") {
      console.log("\nAttempting to fix nonce issues by sending empty transactions...");
      
      // Start from the confirmed nonce
      let currentNonce = confirmedNonce;
      
      // Send empty transactions for each pending nonce
      while (currentNonce < pendingNonce) {
        console.log(`Sending empty transaction with nonce ${currentNonce}...`);
        
        try {
          // Create and send an empty transaction with a high gas price to replace any pending tx
          const tx = await account.sendTransaction({
            to: account.address, // send to self
            value: ethers.utils.parseEther("0"), // send 0 ETH
            nonce: currentNonce,
            gasPrice: ethers.utils.parseUnits("30", "gwei"), // Use higher gas price
            gasLimit: 21000 // Minimum gas for a basic transaction
          });
          
          console.log(`Transaction sent: ${tx.hash}`);
          await tx.wait(1); // Wait for 1 confirmation
          console.log(`Transaction confirmed!`);
        } catch (error) {
          console.error(`Error sending transaction: ${error.message}`);
        }
        
        currentNonce++;
      }
      
      console.log("\nNonce reset complete. Check your account status again to verify.");
    } else {
      console.log("\nTo fix nonce issues, run this script with the 'fix' parameter:");
      console.log("npx hardhat run scripts/fix_nonce.js fix --network amoy");
    }
  } else {
    console.log("✅ No pending transactions detected. Account is ready for new transactions.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });