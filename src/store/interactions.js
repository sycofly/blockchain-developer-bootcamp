// SPDX-License-Identifier: UNLICENSED
import { ethers } from "ethers";
import TOKEN_ABI from "../abis/Token.json";
import EXCHANGE_ABI from "../abis/Exchange.json";

// Helper function to get the appropriate default address based on network chainId
const getDefaultAddressForNetwork = (chainId) => {
  // Convert numeric chainId to string for comparison
  const chainIdStr = String(chainId);
  
  switch(chainIdStr) {
    case '11155111': // Sepolia
      return process.env.REACT_APP_SEPOLIA_DEFAULT_ACCOUNT;
    case '80002': // Polygon Mumbai testnet
      return process.env.REACT_APP_POLYGON_AMOY_DEFAULT_ACCOUNT;
    case '137': // Polygon mainnet
      return process.env.REACT_APP_POLYGON_MAINNET_DEFAULT_ACCOUNT;
    case '31337': // Hardhat local network
      return process.env.REACT_APP_LOCAL_DEFAULT_ACCOUNT || process.env.REACT_APP_DEFAULT_ACCOUNT;
    default:
      return process.env.REACT_APP_DEFAULT_ACCOUNT; // Generic fallback
  }
};


export const loadProvider = (dispatch) => {
  let connection;
  
  // Check if MetaMask is available - this is the best approach to avoid CORS issues
  if (window.ethereum) {
    // Use MetaMask when available - this avoids CORS issues
    connection = new ethers.providers.Web3Provider(window.ethereum);
    console.log("Using MetaMask provider");
    
    // DON'T automatically request accounts - only set up the provider
    // This prevents the app from prompting for connection when MetaMask is locked
    console.log("MetaMask detected - using Web3Provider in read-only mode until user connects");
    
    // Set up event listener for account changes (when user connects later)
    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length > 0) {
        const account = ethers.utils.getAddress(accounts[0]);
        console.log("MetaMask account changed:", account);
        dispatch({ type: "ACCOUNT_LOADED", account });
        
        // Get ETH balance
        connection.getBalance(account).then(balance => {
          dispatch({ 
            type: "ETHER_BALANCE_LOADED", 
            balance: ethers.utils.formatEther(balance)
          });
        }).catch(error => {
          console.warn("Error loading balance:", error);
        });
      } else {
        // User disconnected all accounts
        console.log("No MetaMask accounts available - switching to read-only mode");
        setReadOnlyMode();
      }
    });
    
    // Initially start in read-only mode
    setReadOnlyMode();
  } else {
    // MetaMask not available - use read-only mode with a local hardcoded provider
    // This avoids CORS issues by not making direct API calls
    console.log("MetaMask not detected - using local read-only mode");
    // Create a simple provider that uses the hardhat local network or a mock
    connection = new ethers.providers.JsonRpcProvider("http://localhost:8545");
    
    // Set read-only mode
    setReadOnlyMode();
  }
  
  // Function to set up read-only mode with address from environment variable
  function setReadOnlyMode() {
    // Default to using the generic default account since we don't know the network yet
    // Network-specific account will be set later in loadNetwork
    const defaultAccount = process.env.REACT_APP_DEFAULT_ACCOUNT || "0xa1DA1044a8F22B74e323A37A9d0e74d1a08668D0";
    
    setTimeout(() => {
      dispatch({ 
        type: "ACCOUNT_LOADED", 
        account: defaultAccount
      });
    }, 500);
  }
  
  // Store the provider for other functions to use
  dispatch({ type: "PROVIDER_LOADED", connection });
  
  return connection;
};


export const loadNetwork = async (provider, dispatch) => {
  try {
    const { chainId } = await provider.getNetwork();
    dispatch({ type: "NETWORK_LOADED", chainId });
    
    // Get the appropriate default address for this network
    const networkDefaultAccount = getDefaultAddressForNetwork(chainId);
    
    // For read-only mode or specific networks, set the account
    if (!window.ethereum || chainId === 11155111 || chainId === 80001 || chainId === 137) {
      console.log(`Network ${chainId} detected, using read-only mode with network-specific address`);
      
      setTimeout(() => {
        dispatch({ 
          type: "ACCOUNT_LOADED", 
          account: networkDefaultAccount
        });
      }, 500);
    }
    
    return chainId;
  } catch (error) {
    console.error("Error loading network:", error);
    // Assume Sepolia if we can't detect (allows read-only mode)
    const assumedChainId = 11155111;
    
    // Get the appropriate default address for Sepolia
    const networkDefaultAccount = getDefaultAddressForNetwork(assumedChainId);
    
    dispatch({ type: "NETWORK_LOADED", chainId: assumedChainId });
    dispatch({ type: "ACCOUNT_LOADED", account: networkDefaultAccount });
    
    return assumedChainId;
  }
};


export const loadAccount = async (provider, dispatch) => {
  try {
    if (window.ethereum) {
      // Check if user is already connected first without prompting
      let accounts = await window.ethereum.request({ method: "eth_accounts" });
      
      // If not connected and we need to request access, do it explicitly
      if (accounts.length === 0) {
        console.log("No accounts found, requesting access...");
        accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      }
      
      if (accounts.length > 0) {
        const account = ethers.utils.getAddress(accounts[0]);
        console.log("Account loaded:", account);
        
        dispatch({ type: "ACCOUNT_LOADED", account });
        
        // Try to get balance with retry logic
        const getBalanceWithRetry = async (attempt = 0) => {
          try {
            let balance = await provider.getBalance(account);
            balance = ethers.utils.formatEther(balance);
            console.log(`ETH balance loaded for ${account}: ${balance}`);
            
            // Set a minimum display balance for transaction purposes if we're on testnet
            // This is to allow transactions even when we can't accurately get the balance
            const network = await provider.getNetwork().catch(() => ({ chainId: 0 }));
            if (network.chainId === 11155111 || network.chainId === 80001) {
              // On testnets, use a small non-zero balance as fallback if the real one is empty
              // This allows transactions to attempt to go through despite rate limits
              if (parseFloat(balance) === 0) {
                console.log("Zero balance detected on testnet - using fallback minimum for UI");
                balance = "0.01"; // Small non-zero value for testnets
              }
            }
            
            dispatch({ type: "ETHER_BALANCE_LOADED", balance });
            return balance;
          } catch (error) {
            console.warn(`Error loading ETH balance (attempt ${attempt + 1}):`, error);
            
            // Retry logic for rate limit or network errors
            if (attempt < 2) {
              const delay = Math.min(1000 * (attempt + 1), 3000);
              console.log(`Retrying ETH balance load in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              return getBalanceWithRetry(attempt + 1);
            }
            
            // After retries failed, set a small balance for testnets to enable transactions
            const network = await provider.getNetwork().catch(() => ({ chainId: 0 }));
            if (network.chainId === 11155111 || network.chainId === 80001) {
              // On testnets, use a small non-zero balance
              console.log("Using fallback ETH balance for testnet");
              const fallbackBalance = "0.01";
              dispatch({ type: "ETHER_BALANCE_LOADED", balance: fallbackBalance });
              return fallbackBalance;
            } else {
              // On mainnet or others, use real 0 since we want to be accurate
              dispatch({ type: "ETHER_BALANCE_LOADED", balance: "0" });
              return "0";
            }
          }
        };
        
        // Get balance with retry
        await getBalanceWithRetry();
        
        return account;
      } else {
        console.log("No accounts available even after request");
        // Fall through to read-only mode
      }
    } else {
      // We're in read-only mode, use the network-specific default account
      // Get the current chainId to find the correct address
      const chainId = await provider.getNetwork().then(n => n.chainId).catch(() => 11155111);
      const networkDefaultAccount = getDefaultAddressForNetwork(chainId);
      
      dispatch({ type: "ACCOUNT_LOADED", account: networkDefaultAccount });
      
      // Try to fetch the real ETH balance for the account
      try {
        let balance = await provider.getBalance(networkDefaultAccount);
        balance = ethers.utils.formatEther(balance);
        dispatch({ type: "ETHER_BALANCE_LOADED", balance });
        console.log(`Loaded ETH balance for read-only account: ${balance}`);
      } catch (error) {
        console.warn("Error loading ETH balance in read-only mode:", error);
        dispatch({ type: "ETHER_BALANCE_LOADED", balance: "0" });
      }
      return networkDefaultAccount;
    }
  } catch (error) {
    console.error("Error loading account:", error);
    // Set default account for read-only mode based on network
    const chainId = await provider.getNetwork().then(n => n.chainId).catch(() => 11155111);
    const networkDefaultAccount = getDefaultAddressForNetwork(chainId);
    dispatch({ type: "ACCOUNT_LOADED", account: networkDefaultAccount });
    
    // Try to fetch the real ETH balance for the account
    try {
      let balance = await provider.getBalance(networkDefaultAccount);
      balance = ethers.utils.formatEther(balance);
      dispatch({ type: "ETHER_BALANCE_LOADED", balance });
      console.log(`Loaded ETH balance for read-only account: ${balance}`);
    } catch (error) {
      console.warn("Error loading ETH balance in read-only mode:", error);
      dispatch({ type: "ETHER_BALANCE_LOADED", balance: "0" });
    }
    return networkDefaultAccount;
  }
};


export const loadTokens = async (provider, addresses, dispatch) => {
  try {
    let token1, token2, symbol1, symbol2;

    // Create a function to load token with retry and fallback
    const loadTokenWithRetry = async (address, tokenAbi, attempt = 0) => {
      try {
        const token = new ethers.Contract(address, tokenAbi, provider);
        
        // Add necessary mock methods if we're in read-only mode and hit rate limits
        if (!token.balanceOf) {
          console.log(`Adding stub balanceOf method to token ${address}`);
          token.balanceOf = async () => {
            console.log(`Using stub balanceOf for ${address}`);
            return ethers.BigNumber.from(0);
          };
        }
        
        // Try to get symbol, but don't fail if we can't
        let symbol;
        try {
          symbol = await token.symbol();
        } catch (err) {
          console.warn(`Couldn't get symbol for token ${address}, using default`);
          symbol = address === addresses[0] ? "DAPP" : "mETH";
        }
        
        return { token, symbol };
      } catch (error) {
        console.error(`Error loading token at ${address} (attempt ${attempt + 1}):`, error);
        
        // If rate limited and we haven't tried too many times, wait and retry
        if (error?.error?.message?.includes('Too Many Requests') && attempt < 2) {
          console.log(`Rate limited, retrying in ${(attempt + 1) * 1000}ms...`);
          await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
          return loadTokenWithRetry(address, tokenAbi, attempt + 1);
        }
        
        // Create a minimal token object with the address
        const minimalToken = { 
          address,
          // Add stub methods that would normally exist on the contract
          balanceOf: async () => {
            console.log(`Using stub balanceOf for ${address}`);
            return ethers.BigNumber.from(0);
          }
        };
        
        return { 
          token: minimalToken, 
          symbol: address === addresses[0] ? "DAPP" : "mETH" 
        };
      }
    };

    // Load both tokens (in parallel for efficiency)
    const [token1Result, token2Result] = await Promise.all([
      loadTokenWithRetry(addresses[0], TOKEN_ABI),
      loadTokenWithRetry(addresses[1], TOKEN_ABI)
    ]);
    
    // Extract results
    token1 = token1Result.token;
    symbol1 = token1Result.symbol;
    token2 = token2Result.token;
    symbol2 = token2Result.symbol;
    
    // Dispatch actions
    dispatch({ type: "TOKEN_1_LOADED", token: token1, symbol: symbol1 });
    dispatch({ type: "TOKEN_2_LOADED", token: token2, symbol: symbol2 });

    return [token1, token2];
  } catch (error) {
    console.error("Error in loadTokens:", error);
    
    // Create minimal token objects with stubs to prevent crashes
    const minimalToken1 = { 
      address: addresses[0],
      balanceOf: async () => ethers.BigNumber.from(0)
    };
    
    const minimalToken2 = { 
      address: addresses[1],
      balanceOf: async () => ethers.BigNumber.from(0)
    };
    
    // Still dispatch actions with our minimal tokens
    dispatch({ type: "TOKEN_1_LOADED", token: minimalToken1, symbol: "DAPP" });
    dispatch({ type: "TOKEN_2_LOADED", token: minimalToken2, symbol: "mETH" });
    
    return [minimalToken1, minimalToken2];
  }
};


export const loadExchange = async (provider, address, dispatch) => {
  const loadExchangeWithRetry = async (attempt = 0) => {
    try {
      const exchange = new ethers.Contract(address, EXCHANGE_ABI, provider);
      
      // Ensure all critical methods exist
      if (!exchange.balanceOf) {
        console.log("Adding missing balanceOf method to exchange contract");
        exchange.balanceOf = async () => ethers.BigNumber.from(0);
      }
      
      // Try to make a simple call to test connectivity
      await exchange.deployed().catch(() => {
        console.log("Exchange contract might not be deployed, but continuing anyway");
      });
      
      return exchange;
    } catch (error) {
      console.error(`Error loading exchange (attempt ${attempt + 1}):`, error);
      
      // If rate limited and we haven't tried too many times, wait and retry
      if (error?.message?.includes('Too Many Requests') && attempt < 2) {
        console.log(`Rate limited, retrying exchange load in ${(attempt + 1) * 1500}ms...`);
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1500));
        return loadExchangeWithRetry(attempt + 1);
      }
      
      // Create minimal exchange object with necessary methods
      console.log("Creating minimal exchange object with stubs");
      const minimalExchange = { 
        address,
        interface: new ethers.utils.Interface(EXCHANGE_ABI),
        // Add stub methods that would normally exist
        balanceOf: async () => ethers.BigNumber.from(0),
        makeOrder: async () => { throw new Error("Exchange in fallback mode") },
        cancelOrder: async () => { throw new Error("Exchange in fallback mode") },
        fillOrder: async () => { throw new Error("Exchange in fallback mode") },
        depositToken: async () => { throw new Error("Exchange in fallback mode") },
        withdrawToken: async () => { throw new Error("Exchange in fallback mode") },
        // Add queryFilter for event loading
        queryFilter: async () => []
      };
      return minimalExchange;
    }
  };
  
  try {
    const exchange = await loadExchangeWithRetry();
    dispatch({ type: "EXCHANGE_LOADED", exchange });
    return exchange;
  } catch (error) {
    console.error("Fatal error loading exchange:", error);
    // Create minimal exchange object to prevent crashes
    const minimalExchange = { 
      address,
      interface: new ethers.utils.Interface(EXCHANGE_ABI),
      // Add stub methods that would normally exist
      balanceOf: async () => ethers.BigNumber.from(0),
      queryFilter: async () => []
    };
    dispatch({ type: "EXCHANGE_LOADED", exchange: minimalExchange });
    return minimalExchange;
  }
};


//------------------------------------
// subscribe to events
//-----------------------------------
export const subscribeToEvents = (exchange, dispatch) => {
  // Keep track of processed events to avoid duplicates
  const processedEvents = new Set();
  
  // Helper to handle events consistently
  const processEvent = (eventType, event) => {
    // Create a unique ID for the event
    const eventId = `${eventType}-${event.transactionHash}-${event.logIndex}`;
    
    // Skip if we've already processed this event
    if (processedEvents.has(eventId)) {
      return;
    }
    
    processedEvents.add(eventId);
    console.log(`Processing ${eventType} event: ${eventId}`);
    
    // For order events, extract the order data
    const order = event.args;
    
    // Include block number for ordering events correctly
    dispatch({ 
      type: eventType, 
      ...(order ? { order } : {}),
      event,
      meta: {
        blockNumber: event.blockNumber,
        timestamp: Date.now()  // Client-side timestamp for UI ordering
      }
    });
  };

  // Set up event listeners with the processor
  exchange.on("Cancel", (...args) => {
    const event = args[args.length - 1];
    processEvent("ORDER_CANCEL_SUCCESS", event);
  });

  exchange.on("Trade", (...args) => {
    const event = args[args.length - 1];
    
    // Extract all arguments properly for Trade events
    console.log("Trade event received:", event);
    
    // Make sure we reload balances when a trade occurs
    try {
      if (window.lastAccount) {
        console.log("Triggering balance refresh after trade");
        // Use setTimeout to ensure this happens after the event processing
        setTimeout(() => {
          if (window.lastExchange && window.lastTokens) {
            loadBalances(window.lastExchange, window.lastTokens, window.lastAccount, dispatch);
          }
        }, 2000);
      }
    } catch (err) {
      console.error("Error handling trade event:", err);
    }
    
    processEvent("ORDER_FILL_SUCCESS", event);
  });

  exchange.on("Deposit", (...args) => {
    const event = args[args.length - 1];
    processEvent("TRANSFER_SUCCESS", event);
  });

  exchange.on("Withdraw", (...args) => {
    const event = args[args.length - 1];
    processEvent("TRANSFER_SUCCESS", event);
  });

  exchange.on("Order", (...args) => {
    const event = args[args.length - 1];
    processEvent("NEW_ORDER_SUCCESS", event);
  });
  
  console.log('Event subscriptions set up');
};


//------------------------------------
// deposit
//-----------------------------------
export const depositToken = async ( provider, exchange, address, amount, dispatch) => {
  let transaction;

  dispatch({ type: "TRANSFER_REQUEST" });

  try {
    const signer = await provider.getSigner();
    const amountToTransfer = ethers.utils.parseUnits(amount.toString(), 18);

    const token = new ethers.Contract(address, TOKEN_ABI, signer);
    transaction = await token.approve(exchange.address, amountToTransfer);
    await transaction.wait();

    transaction = await exchange
      .connect(signer)
      .depositToken(token.address, amountToTransfer);

    // Success - get event from receipt
    const receipt = await transaction.wait();
    const event = receipt.events[1]; // Deposit event should be the second event
    dispatch({ type: "TRANSFER_SUCCESS", event });
  } catch (error) {
    console.error("Transfer error:", error);
    dispatch({ type: "TRANSFER_FAIL" });
  }
};


//------------------------------------
// load user balances (wallet & exchange)
//-----------------------------------
export const loadBalances = async (exchange, tokens, account, dispatch) => {
  try {
    // Check if we're in trade debug mode
    const isTradeDebug = window._debugTradeExecution === true;
    
    // Always log when in trade debug mode
    if (isTradeDebug) {
      console.log("🟢 loadBalances called with:", {
        exchangeAddress: exchange?.address,
        token0Address: tokens?.[0]?.address,
        token1Address: tokens?.[1]?.address,
        account: account
      });
    }
    
    // Validate inputs
    if (!exchange) {
      console.error("🟢 Exchange object is missing in loadBalances!");
      return;
    }
    
    if (!tokens || tokens.length < 2) {
      console.error("🟢 Tokens array is invalid in loadBalances:", tokens);
      return;
    }
    
    if (!account) {
      console.error("🟢 Account is missing in loadBalances!");
      return;
    }
    
    // Store these values globally so event handlers can access them
    window.lastExchange = exchange;
    window.lastTokens = tokens;
    window.lastAccount = account;
    
    if (isTradeDebug) {
      console.log("🟢 Global state variables stored");
    }
    
    // Only log detailed debug info if debug flag is set or in trade debug mode
    if (process.env.NODE_ENV === 'development' && (window._debugBalances || isTradeDebug)) {
      console.log("🟢 Loading token and exchange balances...");
      console.log("🟢 Tokens:", tokens);
      console.log("🟢 Account:", account);
    }
    
    // Helper function to safely call balanceOf with retries and robust error handling
    const safeBalanceOf = async (contract, methodName, ...args) => {
      // For tokens, we call token.balanceOf(account)
      // For exchange, we call exchange.balanceOf(tokenAddress, account)
      const getBalance = async (attempt = 0) => {
        try {
          // Check if we're dealing with a real contract or our minimal backup
          if (!contract) {
            // Contract is completely missing
            console.log(`Contract object missing for ${methodName}, using zero fallback`);
            return ethers.BigNumber.from(0);
          }
          
          if (typeof contract[methodName] !== 'function') {
            // Silence this warning as it's expected in some cases and not critical
            if (window._debugTradeExecution) {
              console.log(`${methodName} not available on contract at ${contract.address}, using zero fallback`);
            }
            return ethers.BigNumber.from(0);
          }
          
          // Handle address validation without triggering ENS lookups
          let resolvedArgs = [...args];
          if (args.length > 0 && typeof args[0] === 'string') {
            try {
              // Check if this is already a valid address (without ENS resolution)
              const isValidAddress = ethers.utils.isAddress(args[0]);
              
              if (isValidAddress) {
                // If it's already valid, just normalize the address format
                resolvedArgs[0] = ethers.utils.getAddress(args[0]);
              } else {
                // If it's not a valid address, we'll skip and use fallback
                // This avoids ENS resolution attempts completely
                if (attempt === 0) { // Only log on first attempt
                  // Use a flag to prevent repeated logging
                  if (!window._addressWarnings) window._addressWarnings = {};
                  if (!window._addressWarnings[args[0]]) {
                    window._addressWarnings[args[0]] = true;
                    console.log(`Skipping invalid address format: ${args[0].substring(0, 6)}...`);
                  }
                }
                return ethers.BigNumber.from(0);
              }
            } catch (error) {
              // Any error here means we couldn't handle the address - use fallback
              return ethers.BigNumber.from(0);
            }
          }
          
          // Call the method with resolved arguments
          const result = await contract[methodName](...resolvedArgs);
          return result;
        } catch (error) {
          // Only log non-ENS errors to reduce console spam
          const errorMsg = error.message || String(error);
          
          // Skip logging for ENS errors completely
          if (!errorMsg.includes('ENS') && !errorMsg.includes('network does not support')) {
            if (attempt === 0) { // Only log first attempt errors
              console.warn(`Error in ${methodName}:`, errorMsg.substring(0, 100));
            }
          }
          
          // Handle specific error types
          if (attempt < 2) {
            // Retry logic for rate limit or network errors (but not ENS errors)
            if (
              errorMsg.includes('Too Many Requests') || 
              errorMsg.includes('429')
            ) {
              const delay = Math.min(1000 * (attempt + 1), 3000);
              if (attempt === 0) console.log(`Retrying due to rate limit...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              return getBalance(attempt + 1);
            }
          }
          
          // Fallback to zero if all retries fail
          return ethers.BigNumber.from(0);
        }
      };
      
      return await getBalance();
    };
    
    // Track if this is the first load to show minimal info
    const isFirstLoad = !window._balancesEverLoaded;
    
    // Load balances one at a time to reduce concurrent requests
    if (isFirstLoad) console.log("Loading balances...");
    const token1WalletBalance = await safeBalanceOf(tokens[0], 'balanceOf', account);
    const token1ExchangeBalance = await safeBalanceOf(exchange, 'balanceOf', tokens[0].address, account);
    const token2WalletBalance = await safeBalanceOf(tokens[1], 'balanceOf', account);
    const token2ExchangeBalance = await safeBalanceOf(exchange, 'balanceOf', tokens[1].address, account);
    
    // Mark that we've loaded balances at least once
    window._balancesEverLoaded = true;
    
    // Format all balances with safe formatting
    const formatSafely = (value, decimals = 18) => {
      try {
        if (!value || !ethers.BigNumber.isBigNumber(value)) {
          return '0';
        }
        return ethers.utils.formatUnits(value, decimals);
      } catch (error) {
        // Only log formatting errors in development mode
        if (process.env.NODE_ENV === 'development') {
          console.warn("Error formatting balance");
        }
        return '0';
      }
    };
    
    const token1WalletFormatted = formatSafely(token1WalletBalance);
    const token1ExchangeFormatted = formatSafely(token1ExchangeBalance);
    const token2WalletFormatted = formatSafely(token2WalletBalance);
    const token2ExchangeFormatted = formatSafely(token2ExchangeBalance);
    
    // Only log balances in development mode with debug flag
    if (process.env.NODE_ENV === 'development' && window._debugBalances) {
      console.log(`Token 1 wallet balance formatted: ${token1WalletFormatted}`);
      console.log(`Token 1 exchange balance formatted: ${token1ExchangeFormatted}`);
      console.log(`Token 2 wallet balance formatted: ${token2WalletFormatted}`);
      console.log(`Token 2 exchange balance formatted: ${token2ExchangeFormatted}`);
    }
    
    // Log balance values when debugging trades
    if (window._debugTradeExecution) {
      console.log("🟢 BALANCE VALUES CALCULATED:", {
        token1Wallet: token1WalletFormatted,
        token1Exchange: token1ExchangeFormatted, 
        token2Wallet: token2WalletFormatted,
        token2Exchange: token2ExchangeFormatted
      });
    }
    
    // Create a batch update object to ensure all balances are updated at once
    // This prevents partial state updates that could cause UI inconsistencies
    const batchUpdate = {
      type: "BALANCES_LOADED",
      token1Wallet: token1WalletFormatted,
      token1Exchange: token1ExchangeFormatted,
      token2Wallet: token2WalletFormatted,
      token2Exchange: token2ExchangeFormatted,
      timestamp: Date.now() // Add timestamp to track when balances were last loaded
    };
    
    // Dispatch a single action with all balance data
    if (window._debugTradeExecution) {
      console.log("🟢 DISPATCHING BALANCE UPDATE:", batchUpdate);
    }
    dispatch(batchUpdate);
    
    // Log completion
    if (isFirstLoad || window._debugTradeExecution) {
      console.log(window._debugTradeExecution ? "🟢 Balance loading complete" : "Balance loading complete");
    }
  } catch (error) {
    console.error("Error in loadBalances:", error);
    // Set default values in case of overall failure using the batch update pattern
    dispatch({
      type: "BALANCES_LOADED",
      token1Wallet: '0',
      token1Exchange: '0',
      token2Wallet: '0',
      token2Exchange: '0',
      timestamp: Date.now(),
      isError: true
    });
  }
};


//------------------------------------
// load all orders
//-----------------------------------
export const loadAllOrders = async (provider, exchange, dispatch) => {
  // Set a flag to indicate we're loading orders
  window._isLoadingOrders = true;
  console.log("📋 STARTING order loading process...");
  
  try {
    // Improved retry logic for fetching with exponential backoff and jitter
    const fetchWithRetry = async (fn, retries = 3) => {
      let lastError;
      
      for (let i = 0; i < retries; i++) {
        try {
          return await fn();
        } catch (error) {
          console.warn(`Attempt ${i+1} failed:`, error.message || error);
          lastError = error;
          
          // If we have a "Too Many Requests" error or network error
          if (i < retries - 1) {
            // Exponential backoff with jitter to avoid thundering herd
            const baseDelay = Math.min(2000 * Math.pow(2, i), 10000); // Max 10 seconds
            const jitter = Math.random() * 1000;
            const delay = baseDelay + jitter;
            
            console.log(`Waiting ${Math.round(delay)}ms before retry ${i+1}...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // After all retries failed, try to recover gracefully instead of throwing
      console.error("All retries failed:", lastError);
      return null; // Return null instead of throwing to allow partial data loading
    };

    // Get the current block number with retry logic and fallbacks
    const getBlockNumber = async () => {
      try {
        const blockNumber = await provider.getBlockNumber();
        return blockNumber;
      } catch (error) {
        console.warn("Failed to get block number from primary provider:", error);
        
        // Try backup provider if available
        if (window.getBackupProvider) {
          try {
            console.log("Using backup provider for block number");
            return await window.getBackupProvider().getBlockNumber();
          } catch (backupError) {
            console.error("Backup provider also failed:", backupError);
          }
        }
        
        // Last resort: Return a reasonable default for the detected network
        try {
          const network = await provider.getNetwork();
          if (network.chainId === 11155111) {
            // Sepolia testnet - return a recent block number
            console.log("Using hardcoded recent block for Sepolia");
            return 8342180 + 10000; // Start from a known block + some buffer
          } else if (network.chainId === 31337) {
            // Hardhat - should be low
            return 1000;
          } else if (network.chainId === 80001 || network.chainId === 137) {
            // Polygon networks - return reasonable defaults
            return 5000;
          }
        } catch (netError) {
          console.error("Failed to detect network:", netError);
        }
        
        // Absolute fallback
        console.log("Using absolute fallback block number");
        return 8342180; // Known Sepolia block as absolute fallback
      }
    };

    // Get the block number with retries
    const block = await fetchWithRetry(getBlockNumber) || 8342180;
    console.log(`Current block number (or fallback): ${block}`);

    // Use a much smaller chunk size to avoid rate limiting
    // Different sizes for different networks
    const networkId = await provider.getNetwork().then(n => n.chainId);
    
    // Use extremely small chunks for testnet to avoid rate limiting
    const chunkSize = networkId === 31337 ? 2000 : 100; // 2000 for local, 100 for testnets
    
    // Define a starting block for Sepolia based on your contract deployment
    // Set to the block number from the transaction history where the Exchange was deployed
    const startBlock = networkId === 31337 ? 0 : 8342180; // Start from Exchange deployment at block 8342183
    
    console.log(`Using chunk size of ${chunkSize} for network ${networkId}`); 
    
    // Helper to fetch events with fallback to backup providers
    const fetchEventsWithFallback = async (eventName, fromBlock, toBlock) => {
      try {
        return await exchange.queryFilter(eventName, fromBlock, toBlock);
      } catch (error) {
        if (window.getBackupProvider) {
          console.log(`Using backup provider for ${eventName} events from ${fromBlock} to ${toBlock}`);
          
          // Create a new contract instance with the backup provider
          const backupProvider = window.getBackupProvider();
          const backupExchange = new ethers.Contract(
            exchange.address, 
            exchange.interface, 
            backupProvider
          );
          
          return await backupExchange.queryFilter(eventName, fromBlock, toBlock);
        }
        throw error;
      }
    };

    // Fetch events in chunks with fallback to backup providers
    const fetchEvents = async (eventName, fromBlock, toBlock) => {
      const events = [];
      
      // Use smaller chunks for more frequent events
      for (let i = fromBlock; i <= toBlock; i += chunkSize) {
        const end = Math.min(i + chunkSize - 1, toBlock);
        
        try {
          console.log(`Fetching ${eventName} events from block ${i} to ${end}`);
          
          // Try to fetch this chunk with retries and fallback
          const chunk = await fetchWithRetry(() => 
            fetchEventsWithFallback(eventName, i, end)
          );
          
          console.log(`Found ${chunk.length} ${eventName} events from block ${i} to ${end}`);
          events.push(...chunk);
          
        } catch (error) {
          console.warn(`Error fetching ${eventName} events for block range ${i}-${end}:`, error);
          // Continue with next chunk instead of failing completely
        }
      }
      
      return events;
    };

    // Start loading state
    dispatch({ type: "ORDERS_LOADING" });
    
    // On Sepolia, fetch events sequentially to avoid rate limits
    console.log("Fetching order events...");
    
    let cancelStream, tradeStream, orderStream;
    
    if (networkId === 31337) {
      // On localhost, fetch in parallel for speed
      [cancelStream, tradeStream, orderStream] = await Promise.all([
        fetchEvents("Cancel", 0, block),
        fetchEvents("Trade", 0, block),
        fetchEvents("Order", 0, block)
      ]);
    } else {
      // On testnet, fetch sequentially to reduce concurrent requests
      // Use startBlock instead of 0 to avoid scanning the entire chain
      console.log(`Fetching cancelled orders from block ${startBlock}...`);
      cancelStream = await fetchEvents("Cancel", startBlock, block);
      console.log(`Fetching filled orders from block ${startBlock}...`);
      tradeStream = await fetchEvents("Trade", startBlock, block);
      console.log(`Fetching all orders from block ${startBlock}...`);
      orderStream = await fetchEvents("Order", startBlock, block);
    }
    
    // Process all event data with enhanced information
    const cancelledOrders = cancelStream.map((event) => ({
      ...event.args,
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber,
      logIndex: event.logIndex
    }));
    
    const filledOrders = tradeStream.map(event => ({
      ...event.args,
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber,
      logIndex: event.logIndex,
      timestamp: event.args.timestamp || Math.floor(Date.now() / 1000) // Ensure timestamp exists
    }));
    
    const allOrders = orderStream.map(event => ({
      ...event.args,
      transactionHash: event.transactionHash,
      blockNumber: event.blockNumber,
      logIndex: event.logIndex
    }));
    
    console.log(`Fetched ${cancelledOrders.length} cancelled, ${filledOrders.length} filled, and ${allOrders.length} total orders`);
    
    // Dispatch all order data in a consistent sequence to avoid race conditions
    dispatch({ type: "CANCELLED_ORDERS_LOADED", cancelledOrders });
    dispatch({ type: "FILLED_ORDERS_LOADED", filledOrders });
    dispatch({ type: "ALL_ORDERS_LOADED", allOrders });
    
    // Clear the loading flag
    window._isLoadingOrders = false;
    console.log("📋 Order loading complete");
    
  } catch (error) {
    console.error("Failed to load orders:", error);
    dispatch({ type: "ORDERS_LOADING_FAILED", error });
  }
};


//-----------------------------------
// transfer tokens (deposit/withdraw)
//-----------------------------------
export const transferTokens = async (provider, exchange, transferType, token, amount, dispatch) => {
  let transaction;

  dispatch({ type: "TRANSFER_REQUEST" });

  try {
    // First check if MetaMask is connected and unlocked
    let accounts = [];
    
    if (window.ethereum) {
      try {
        accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length === 0) {
          console.error("No MetaMask accounts available. Please connect MetaMask first.");
          throw new Error("Please connect your MetaMask wallet first by clicking the Connect button.");
        }
      } catch (metaMaskError) {
        console.error("Error checking MetaMask accounts:", metaMaskError);
        throw new Error("Cannot access your MetaMask wallet. Please make sure MetaMask is installed and unlocked.");
      }
    } else {
      console.error("MetaMask not detected");
      throw new Error("MetaMask not detected. Please install MetaMask to use this feature.");
    }
    
    // Get the signer with explicit error handling
    let signer;
    try {
      signer = await provider.getSigner();
      // Verify we can get the address (will fail if MetaMask is locked)
      const address = await signer.getAddress();
      console.log(`Using account ${address} for ${transferType}`);
    } catch (signerError) {
      console.error("Error getting signer:", signerError);
      throw new Error("Could not access your wallet. Please check that MetaMask is unlocked and connected.");
    }
    
    const amountToTransfer = ethers.utils.parseUnits(amount.toString(), 18);

    if (transferType === "Deposit") {
      console.log(`Approving ${amount} tokens for deposit...`);
      transaction = await token.connect(signer).approve(exchange.address, amountToTransfer);
      await transaction.wait();
      
      console.log(`Depositing ${amount} tokens to exchange...`);
      transaction = await exchange.connect(signer).depositToken(token.address, amountToTransfer);
    } else {
      console.log(`Withdrawing ${amount} tokens from exchange...`);
      transaction = await exchange.connect(signer).withdrawToken(token.address, amountToTransfer);
    }

    // Wait for transaction to be mined
    const receipt = await transaction.wait();
    
    // Check for events in the receipt
    const event = receipt.events?.find(e => e.event === "Deposit" || e.event === "Withdraw");
    
    if (event) {
      // If we found the event in the receipt, dispatch with it
      console.log(`${transferType} successful, emitting event`);
      dispatch({ type: "TRANSFER_SUCCESS", event });
    } else {
      // Otherwise dispatch a basic success with the transfer details
      console.log(`${transferType} successful, no event found in receipt`);
      dispatch({ 
        type: "TRANSFER_SUCCESS", 
        transferType, 
        token: token.address,
        amount: amount.toString() 
      });
    }
  } catch (error) {
    console.error(`${transferType} failed:`, error);
    dispatch({ type: "TRANSFER_FAIL", error: error.message });
  }
}


//------------------------------------
// make order
//-----------------------------------
export const makeBuyOrder = async (provider, exchange, tokens, order, dispatch) => {
  const tokenGet = tokens[0].address
  const amountGet = ethers.utils.parseEther(order.amount)
  const tokenGive = tokens[1].address
  const amountGive = ethers.utils.parseEther((order.amount * order.price).toString(), 18)

  dispatch({ type: "NEW_ORDER_REQUEST" })

  try {
    const signer = await provider.getSigner();
    const transaction = await exchange.connect(signer).makeOrder(tokenGet, amountGet, tokenGive, amountGive);
    await transaction.wait();
  } catch (error) {
    dispatch({ type: "NEW_ORDER_FAIL" });
  }
};


export const makeSellOrder = async (provider, exchange, tokens, order, dispatch) => {
  const tokenGet = tokens[1].address;
  const amountGet = ethers.utils.parseEther((order.amount * order.price).toString(), 18);
  const tokenGive = tokens[0].address;
  const amountGive = ethers.utils.parseEther(order.amount, 18);

  dispatch({ type: "NEW_ORDER_REQUEST" });

  try {
    const signer = await provider.getSigner();
    const transaction = await exchange.connect(signer).makeOrder(tokenGet, amountGet, tokenGive, amountGive);
    await transaction.wait();
  } catch (error) {
    dispatch({ type: "NEW_ORDER_FAIL" });
  }
};


//-----------------------------------
// cancel order
//-----------------------------------
export const cancelOrder = async (provider, exchange, order, dispatch) => {
  dispatch({ type: "ORDER_CANCEL_REQUEST" });

  try {
    const signer = await provider.getSigner();
    const transaction = await exchange.connect(signer).cancelOrder(order.id);
    await transaction.wait();
  } catch (error) {
    dispatch({ type: "ORDER_CANCEL_FAIL" });
  }
};


//-----------------------------------
// fill order
//-----------------------------------
export const fillOrder = async (provider, exchange, order, dispatch) => {
  // TRADE DEBUGGING: Add debug flag to track trade execution
  window._debugTradeExecution = true;
  
  console.log("🔵 STARTING fill order with id:", order.id);
  console.log("🔵 Original order data:", order);
  
  // Store the order for debugging
  window._lastOrderFilled = order;
  
  // Log exactly what would appear in the Trades list
  try {
    console.log("🔵 EXPECTED TRADE DISPLAY VALUES:");
    console.log("   Amount: ", parseFloat(ethers.utils.formatUnits(order.amountGive, 18)));
    console.log("   Price: ", parseFloat(ethers.utils.formatUnits(order.amountGet, 18)) / 
                             parseFloat(ethers.utils.formatUnits(order.amountGive, 18)));
  } catch (err) {
    console.log("🔵 Error calculating expected display values:", err);
  }
  
  // Pre-calculate the amounts for the trade before execution
  let token0Amount, token1Amount, tokenPrice;
  try {
    token0Amount = ethers.utils.formatUnits(order.amountGive, 18);
    token1Amount = ethers.utils.formatUnits(order.amountGet, 18);
    tokenPrice = (parseFloat(token1Amount) / parseFloat(token0Amount)).toFixed(10);
    console.log("🔵 Pre-calculated trade amounts:", { token0Amount, token1Amount, tokenPrice });
  } catch (err) {
    console.warn("🔵 Could not pre-calculate amounts:", err);
  }
  
  dispatch({ type: "ORDER_FILL_REQUEST" });

  try {
    // Log the current state of lastExchange, lastTokens, lastAccount
    console.log("🔵 Before trade - Global state check:", {
      hasLastExchange: !!window.lastExchange,
      hasLastTokens: !!window.lastTokens && Array.isArray(window.lastTokens),
      hasLastAccount: !!window.lastAccount,
      tokenAddresses: window.lastTokens ? window.lastTokens.map(t => t?.address).join(', ') : 'none'
    });
    
    const signer = await provider.getSigner();
    console.log("🔵 Got signer, filling order");
    const transaction = await exchange.connect(signer).fillOrder(order.id);
    console.log("🔵 Order fill transaction submitted:", transaction.hash);
    
    // Store the current tokens and accounts explicitly before waiting for receipt
    const currentExchange = exchange;
    const currentTokens = window.lastTokens || [];
    let currentAccount = window.lastAccount;
    
    // Try to get the current account if not set
    if (!currentAccount) {
      try {
        currentAccount = await signer.getAddress();
        console.log("🔵 Retrieved account from signer:", currentAccount);
      } catch (e) {
        console.warn("🔵 Could not get account from signer:", e);
      }
    }
    
    // Wait for the transaction
    console.log("🔵 Waiting for transaction confirmation...");
    const receipt = await transaction.wait();
    console.log("🔵 Order fill transaction confirmed:", receipt);
    
    // Look for the Trade event in the receipt
    const tradeEvent = receipt.events?.find(e => e.event === "Trade");
    
    if (tradeEvent) {
      console.log("🔵 Trade event found in receipt:", tradeEvent);
      
      // Log the event args
      console.log("🔵 Trade event args:", tradeEvent.args);
      
      // Create enriched order with guaranteed transaction info and pre-calculated values
      const enrichedOrder = {
        ...tradeEvent.args,
        id: tradeEvent.args.id || order.id,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        timestamp: Math.floor(Date.now() / 1000), // Add current timestamp for sorting
        logIndex: tradeEvent.logIndex || 0,
        formattedTimestamp: new Date().toLocaleString(), // Add formatted timestamp for display
        // Include pre-calculated values if available
        token0Amount: token0Amount || ethers.utils.formatUnits(order.amountGive, 18),
        token1Amount: token1Amount || ethers.utils.formatUnits(order.amountGet, 18),
        tokenPrice: tokenPrice || (parseFloat(ethers.utils.formatUnits(order.amountGet, 18)) / 
                                 parseFloat(ethers.utils.formatUnits(order.amountGive, 18))).toFixed(10),
        tokenPriceClass: "#25CE8F" // Default to green for new trades
      };
      
      console.log("🔵 Enriched order data for dispatch:", enrichedOrder);
      
      // Force all filled orders to reload
      dispatch({ type: "FILLED_ORDERS_RELOAD_REQUEST" });
      
      // Then dispatch the success event with enriched data
      dispatch({ 
        type: "ORDER_FILL_SUCCESS", 
        order: enrichedOrder,
        event: {
          ...tradeEvent,
          meta: {
            eventType: "ORDER_FILL_SUCCESS",
            timestamp: Date.now()
          }
        }
      });
      
      // No need for a separate MANUAL_TRADE_ADDED action now that we've enhanced ORDER_FILL_SUCCESS
      
      // Force a reload of all orders after a short delay
      setTimeout(() => {
        if (!window._isLoadingOrders) {
          console.log("🔵 Reloading all orders after trade completion");
          loadAllOrders(provider, exchange, dispatch);
        }
      }, 3000);
      
      // FORCE RELOAD BALANCES IMMEDIATELY AFTER TRADE
      console.log("🔵 FORCE RELOADING BALANCES after trade");
      
      // Take multiple approaches to reload balances
      try {
        // Method 1: Using global variables (might be outdated)
        if (window.lastExchange && window.lastTokens && window.lastAccount) {
          console.log("🔵 Method 1: Reloading balances using global vars");
          loadBalances(window.lastExchange, window.lastTokens, window.lastAccount, dispatch);
        }
        
        // Method 2: Using captured variables from this function scope
        console.log("🔵 Method 2: Reloading balances using captured vars");
        if (currentExchange && currentTokens.length > 0 && currentAccount) {
          // Double check the tokens have addresses
          if (currentTokens[0]?.address && currentTokens[1]?.address) {
            console.log("🔵 Captured variables look valid, reloading balances");
            loadBalances(currentExchange, currentTokens, currentAccount, dispatch);
          }
        }
        
        // Method 3: Try again after a short delay 
        setTimeout(() => {
          console.log("🔵 Method 3: Delayed balance reload");
          if (window.lastExchange && window.lastTokens && window.lastAccount) {
            loadBalances(window.lastExchange, window.lastTokens, window.lastAccount, dispatch);
          }
        }, 2000);
      } catch (balanceError) {
        console.error("🔵 Error reloading balances:", balanceError);
      }
    } else {
      console.warn("🔵 No Trade event found in receipt");
      dispatch({ type: "ORDER_FILL_SUCCESS", order, event: receipt });
    }
    
    // One last attempt after everything else
    setTimeout(() => {
      console.log("🔵 Final attempt to reload balances");
      if (window.lastExchange && window.lastTokens && window.lastAccount) {
        loadBalances(window.lastExchange, window.lastTokens, window.lastAccount, dispatch);
      }
    }, 5000);
    
  } catch (error) {
    console.error("🔵 Error filling order:", error);
    dispatch({ type: "ORDER_FILL_FAIL", error: error.message });
  }
};
