// Basic script to test calling cancelOrder directly
const { ethers } = require("hardhat");
const config = require("../src/config.json");

async function main() {
  // Get network ID
  const { chainId } = await ethers.provider.getNetwork();
  console.log(`Network ID: ${chainId}`);

  // Get signers
  const [signer] = await ethers.getSigners();
  console.log(`Using signer: ${signer.address}`);

  try {
    // Get exchange contract
    const exchange = await ethers.getContractAt(
      "Exchange",
      config[chainId].exchange.address
    );
    console.log(`Exchange contract address: ${exchange.address}`);
    
    // List available functions
    console.log("Exchange functions:", Object.keys(exchange.functions));
    
    // Get total orders (orderCount)
    const orderCount = await exchange.orderCount();
    console.log(`Total orders: ${orderCount}`);
    
    // Try to get order #1
    const order = await exchange.orders(1);
    console.log("Order #1:", {
      id: order.id.toString(),
      user: order.user,
      tokenGet: order.tokenGet,
      amountGet: order.amountGet.toString(),
      tokenGive: order.tokenGive,
      amountGive: order.amountGive.toString(),
      timestamp: order.timestamp.toString()
    });
    
    // Check if order is cancelled or filled
    const isCancelled = await exchange.orderCancelled(1);
    const isFilled = await exchange.orderFilled(1);
    console.log(`Order #1 - Cancelled: ${isCancelled}, Filled: ${isFilled}`);
    
    // Try to cancel order #1 if not already cancelled and not filled
    if (!isCancelled && !isFilled) {
      console.log("Attempting to cancel order #1...");
      const tx = await exchange.connect(signer).cancelOrder(1);
      console.log(`Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
      
      // Check if cancelled now
      const isNowCancelled = await exchange.orderCancelled(1);
      console.log(`Order #1 - Now cancelled: ${isNowCancelled}`);
    } else {
      console.log("Order #1 is already cancelled or filled, skipping cancellation");
    }
  } catch (error) {
    console.error("Error:", error);
    // Log detailed error information
    if (error.reason) console.error("Error reason:", error.reason);
    if (error.code) console.error("Error code:", error.code);
    if (error.message) console.error("Error message:", error.message);
    if (error.data) console.error("Error data:", error.data);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
