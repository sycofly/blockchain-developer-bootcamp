const config = require("../src/config.json");

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), "ether");
};

const wait = (seconds) => {
  const milliseconds = seconds * 1000;
  return new Promise(resolve => setTimeout(resolve, milliseconds));
};

async function main() {
  // fetch accounts from wallet - these are unlocked
  const accounts = await ethers.getSigners();

  //fetch network
  const { chainId } = await ethers.provider.getNetwork();
  console.log("Using ChainID:", chainId);
  
  if (chainId !== 11155111) {
    console.warn("Warning: Not running on Sepolia network! Chain ID:", chainId);
  }

  // Ensure config for this network exists
  if (!config[chainId]) {
    console.error(`No configuration found for network ${chainId}`);
    return;
  }

  console.log("Loading contract addresses from config...");
  const DApp = await ethers.getContractAt(
    "Token",
    config[chainId].DApp.address
  );
  console.log(`DApp Token fetched: ${DApp.address}`);

  const mETH = await ethers.getContractAt(
    "Token",
    config[chainId].mETH.address
  );
  console.log(`mETH Token fetched: ${mETH.address}`);

  const mDAI = await ethers.getContractAt(
    "Token",
    config[chainId].mDAI.address
  );
  console.log(`mDAI Token fetched: ${mDAI.address}`);

  // fetch the deployed exchange
  const exchange = await ethers.getContractAt(
    "Exchange",
    config[chainId].exchange.address
  );
  console.log(`Exchange - fetched: ${exchange.address}`);

  // give tokens to account[1]
  const sender = accounts[0];
  const receiver = accounts[1];
  let amount = tokens(10000);

  console.log("Transferring tokens to second account...");
  // user1 transfers 10,000 mETH...
  let transaction, result;
  transaction = await mETH.connect(sender).transfer(receiver.address, amount);
  await transaction.wait();
  console.log(`Transferred ${amount} tokens from ${sender.address} to ${receiver.address}`);

  // Add a longer wait to avoid rate limiting
  console.log("Waiting to avoid rate limits...");
  await wait(5);

  // setup exchange users
  const user1 = accounts[0];
  const user2 = accounts[1];
  amount = tokens(10000);

  console.log("Setting up exchange deposits...");
  // user1 approves 10,000 DApp...
  transaction = await DApp.connect(user1).approve(exchange.address, amount);
  await transaction.wait();
  console.log(`Approved ${amount} tokens from ${user1.address}`);
  await wait(5);

  // user1 deposits 10,000 DApp...
  transaction = await exchange
    .connect(user1)
    .depositToken(DApp.address, amount);
  await transaction.wait();
  console.log(`Deposited ${amount} Ether from ${user1.address}`);
  await wait(5);

  // user 2 approves mETH...
  transaction = await mETH.connect(user2).approve(exchange.address, amount);
  await transaction.wait();
  console.log(`Approved ${amount} tokens from ${user2.address}`);
  await wait(5);

  // user 2 deposits mETH...
  transaction = await exchange
    .connect(user2)
    .depositToken(mETH.address, amount);
  await transaction.wait();
  console.log(`Deposited ${amount} Ether from ${user2.address}`);
  await wait(5);

  //////////////////////////////////////////////////////////////
  // Seed a Cancelled Order
  //////////////////////////////////////////////////////////////
  console.log("Creating and cancelling a sample order...");
  // user1 makes an order to get tokens
  let orderId;
  transaction = await exchange
    .connect(user1)
    .makeOrder(
      mETH.address, 
      tokens(100), 
      DApp.address, 
      tokens(5)
    );
  result = await transaction.wait();
  console.log(`Made order from ${user1.address}`);
  await wait(5);

  // user 1 cancels order
  orderId = result.events[0].args.id;
  transaction = await exchange
    .connect(user1)
    .cancelOrder(orderId);
  result = await transaction.wait();
  console.log(`Cancelled order from ${user1.address}`);
  await wait(5);

  //////////////////////////////////////////////////////////////
  // Seed Filled Orders - reduced to just one for testnet
  //////////////////////////////////////////////////////////////
  console.log("Creating and filling a sample order...");
  // user1 makes order
  transaction = await exchange
    .connect(user1)
    .makeOrder(
      mETH.address, 
      tokens(100), 
      DApp.address, 
      tokens(10)
    );
  result = await transaction.wait();
  console.log(`Made order from ${user1.address}`);
  await wait(5);

  // user 2 fills order
  orderId = result.events[0].args.id;
  transaction = await exchange
    .connect(user2)
    .fillOrder(orderId);
  result = await transaction.wait();
  console.log(`Filled order from ${user1.address}`);
  await wait(5);

  //////////////////////////////////////////////////////////////
  // Seed Open Orders - reduced to just 3 for each user
  //////////////////////////////////////////////////////////////
  console.log("Creating 3 open orders for each user...");
  // user 1 makes 3 orders
  for (let i = 1; i <= 3; i++) {
    transaction = await exchange
      .connect(user1)
      .makeOrder(
        mETH.address, 
        tokens(10 * i), 
        DApp.address, 
        tokens(10)
      );
    result = await transaction.wait();
    console.log(`Made order ${i} from ${user1.address}`);
    await wait(5); // 5 seconds between orders to avoid rate limiting
  }

  // user 2 makes 3 orders
  for (let i = 1; i <= 3; i++) {
    transaction = await exchange
      .connect(user2)
      .makeOrder(
        DApp.address, 
        tokens(10), 
        mETH.address, 
        tokens(10 * i)
      );
    result = await transaction.wait();
    console.log(`Made order ${i} from ${user2.address}`);
    await wait(5); // 5 seconds between orders to avoid rate limiting
  }
  
  console.log("Seeding complete! Exchange ready for testing on Sepolia.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
  console.error(error);
  process.exitCode = 1;
});