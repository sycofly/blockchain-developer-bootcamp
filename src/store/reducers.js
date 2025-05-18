import { ethers } from "ethers";

export const provider = (state = {}, action) => {
  switch (action.type) {
    case "PROVIDER_LOADED":
      return {
        ...state,
        connection: action.connection,
      };
    case "NETWORK_LOADED":
      return {
        ...state,
        chainId: action.chainId,
      };
    case "ACCOUNT_LOADED":
      return {
        ...state,
        account: action.account,
      };
    case "ETHER_BALANCE_LOADED":
      return {
        ...state,
        balance: action.balance,
      };

    default:
      return state;
  }
};

const DEFAULT_TOKENS_STATE = {
  loaded: false,
  contracts: [],
  symbols: [],
  balances: ['0', '0'] // Initialize with zero balances
};

export const tokens = (state = DEFAULT_TOKENS_STATE, action) => {
  switch (action.type) {
    case "TOKEN_1_LOADED":
      return {
        ...state,
        loaded: true,
        contracts: [action.token],
        symbols: [action.symbol],
      };
    case "TOKEN_1_BALANCE_LOADED":
      return {
        ...state,
        balances: state.balances ? [action.balance, state.balances[1]] : [action.balance, '0'],
      };
    case "TOKEN_2_LOADED":
      return {
        ...state,
        loaded: true,
        contracts: [...state.contracts, action.token],
        symbols: [...state.symbols, action.symbol],
      };
    case "TOKEN_2_BALANCE_LOADED":
      return {
        ...state,
        balances: state.balances ? [state.balances[0], action.balance] : ['0', action.balance],
      };
    // New case to handle batched balance updates
    case "BALANCES_LOADED":
      console.log("🔶 TOKEN REDUCER: Processing BALANCES_LOADED action", {
        token1Wallet: action.token1Wallet,
        token2Wallet: action.token2Wallet,
        timestamp: action.timestamp
      });
      
      // Explicitly copy the full state to ensure we're not losing anything
      const newState = {
        ...state,
        balances: [action.token1Wallet, action.token2Wallet],
        lastBalanceUpdate: action.timestamp
      };
      
      console.log("🔶 TOKEN REDUCER: New state after balance update", {
        newBalances: newState.balances,
        lastUpdate: newState.lastBalanceUpdate
      });
      
      return newState;

    default:
      return state;
  }
};

const DEFAULT_EXCHANGE_STATE = {
  loaded: false,
  contract: {},
  transaction: {
    isSuccessful: false,
  },
  allOrders: {
    loaded: false,
    loading: false,
    data: [],
  },
  cancelledOrders: {
    loaded: false,
    loading: false,
    data: [],
  },
  filledOrders: {
    loaded: false,
    loading: false,
    data: [],
  },
  events: [],
  balances: ['0', '0'], // Initialize with zero balances
  lastBalanceUpdate: null
};

export const exchange = (state = DEFAULT_EXCHANGE_STATE, action) => {
  let index, data;
  switch (action.type) {
    case "EXCHANGE_LOADED":
      return {
        ...state,
        loaded: true,
        contract: action.exchange,
      };
      
    // -------------------
    // ORDERS LOADING STATES
    // -------------------
    case "ORDERS_LOADING":
      return {
        ...state,
        allOrders: {
          ...state.allOrders,
          loading: true,
        },
        filledOrders: {
          ...state.filledOrders,
          loading: true,
        },
        cancelledOrders: {
          ...state.cancelledOrders,
          loading: true,
        }
      };
      
    // Special case to force reload of filled orders
    case "FILLED_ORDERS_RELOAD_REQUEST":
      console.log("🔷 EXCHANGE REDUCER: Forcing filled orders reload");
      return {
        ...state,
        filledOrders: {
          ...state.filledOrders,
          loaded: false, // Set to false to force selectors to recompute
          loading: true,
          reloadCounter: (state.filledOrders.reloadCounter || 0) + 1 // Force rerender
        }
      };
      
    case "ORDERS_LOADING_FAILED":
      return {
        ...state,
        allOrders: {
          ...state.allOrders,
          loading: false,
          error: action.error
        },
        filledOrders: {
          ...state.filledOrders,
          loading: false,
          error: action.error
        },
        cancelledOrders: {
          ...state.cancelledOrders,
          loading: false,
          error: action.error
        }
      };
    
    case "CANCELLED_ORDERS_LOADED":
      return {
        ...state,
        cancelledOrders: {
          loaded: true,
          loading: false,
          data: action.cancelledOrders,
        },
      };
    case "FILLED_ORDERS_LOADED":
      return {
        ...state,
        filledOrders: {
          loaded: true,
          loading: false,
          data: action.filledOrders,
        },
      };
      
    // Special case for manually adding a trade
    case "MANUAL_TRADE_ADDED":
      console.log("🔷 EXCHANGE REDUCER: Processing MANUAL_TRADE_ADDED with trade:", action.trade);
      
      // Check if this trade is already in the list
      const existingTradeIndex = state.filledOrders.data.findIndex(
        order => order.id && action.trade.id && order.id.toString() === action.trade.id.toString()
      );
      
      // Only add if it's not already in the list
      if (existingTradeIndex === -1) {
        console.log("🔷 EXCHANGE REDUCER: Adding new trade to filled orders");
        return {
          ...state,
          filledOrders: {
            ...state.filledOrders,
            data: [action.trade, ...state.filledOrders.data], // Add to the beginning
            loaded: true,
            manual: true, // Flag that we've manually added a trade
            lastTradeTimestamp: Date.now()
          }
        };
      }
      
      // If trade already exists, just update the timestamp to force a refresh
      return {
        ...state,
        filledOrders: {
          ...state.filledOrders,
          lastTradeTimestamp: Date.now()
        }
      };
    case "ALL_ORDERS_LOADED":
      return {
        ...state,
        allOrders: {
          loaded: true,
          loading: false,
          data: action.allOrders,
        },
      };

    //-----------------------------
    // CANCELLING ORDERS
    //-----------------------------
    case "ORDER_CANCEL_REQUEST":
      return {
        ...state,
        transaction: {
          transactionType: "Cancel",
          isPending: true,
          isSuccessful: false,
        }
    }

    case "ORDER_CANCEL_SUCCESS":
      return {
        ...state,
        transaction: {
          transactionType: "Cancel",
          isPending: false,
          isSuccessful: true,
        },
        cancelledOrders: {
          ...state.cancelledOrders,
          data: [
            ...state.cancelledOrders.data,
            action.order,
          ]
        },
        events: [action.event, ...state.events],
    }

    case "ORDER_CANCEL_FAIL":
      return {
        ...state,
        transaction: {
          transactionType: "Cancel",
          isPending: false,
          isSuccessful: false,
          isError: true,
        },
      };

    //-----------------------------
    // FILLING ORDERS
    //-----------------------------
    case "ORDER_FILL_REQUEST":
      return {
        ...state,
        transaction: {
          transactionType: "Fill Order",
          isPending: true,
          isSuccessful: false,
        }
    }

    case "ORDER_FILL_SUCCESS":
      // Safely handle the order data from event
      const orderData = action.order || (action.event && action.event.args);
      
      if (!orderData) {
        console.error("Missing order data in ORDER_FILL_SUCCESS");
        return state;
      }
      
      console.log("🔶 ORDER_FILL_SUCCESS received with data:", orderData);
      
      // Add essential properties to ensure selectors work correctly
      const completeOrder = {
        ...orderData,
        // Add a timestamp if missing (essential for sorting)
        timestamp: orderData.timestamp || Math.floor(Date.now() / 1000),
        // Ensure id exists
        id: orderData.id || 
            (action.event && `${action.event.transactionHash}-${action.event.logIndex}`) ||
            `order-${Date.now()}`, // Fallback unique ID
        // Add formatted timestamp for display without comma
        formattedTimestamp: orderData.formattedTimestamp || new Date().toLocaleString().replace(',', ''),
        // Add transaction info 
        transactionHash: orderData.transactionHash || (action.event && action.event.transactionHash),
        blockNumber: orderData.blockNumber || (action.event && action.event.blockNumber)
      };
      
      // Format amounts for display directly here
      let displayOrder = {
        ...completeOrder,
        token0Amount: completeOrder.token0Amount || 
                     (completeOrder.amountGive ? 
                        ethers.utils.formatUnits(completeOrder.amountGive, 18) : '0'),
        token1Amount: completeOrder.token1Amount || 
                     (completeOrder.amountGet ? 
                        ethers.utils.formatUnits(completeOrder.amountGet, 18) : '0')
      };
      
      // Calculate price for display
      if (!displayOrder.tokenPrice && displayOrder.token0Amount && displayOrder.token1Amount) {
        const amount0 = parseFloat(displayOrder.token0Amount);
        const amount1 = parseFloat(displayOrder.token1Amount);
        if (amount0 > 0) {
          displayOrder.tokenPrice = (amount1 / amount0).toFixed(10);
        } else {
          displayOrder.tokenPrice = '0';
        }
      }
      
      // Always use green for new trades
      displayOrder.tokenPriceClass = "#25CE8F";
      
      console.log("🔶 Complete display order:", displayOrder);
      
      // Prevent duplicate orders - use a more robust check
      index = state.filledOrders.data.findIndex(order => {
        // Check by ID if available
        if (order.id && displayOrder.id) {
          return order.id.toString() === displayOrder.id.toString();
        }
        
        // Check by transaction hash and log index
        if (order.transactionHash && displayOrder.transactionHash) {
          return order.transactionHash === displayOrder.transactionHash;
        }
        
        // Fallback: check exact amounts and timestamp
        return (
          order.amountGet?.toString() === displayOrder.amountGet?.toString() &&
          order.amountGive?.toString() === displayOrder.amountGive?.toString() &&
          Math.abs(order.timestamp - displayOrder.timestamp) < 10 // Within 10 seconds
        );
      });

      if (index === -1) {
        console.log("🔶 Adding new filled order to state:", displayOrder);
        // Add to beginning of array for immediate visibility
        data = [displayOrder, ...state.filledOrders.data];
      } else {
        console.log("🔶 Order already exists in filled orders, updating it");
        // Update the existing order with new display properties
        data = [...state.filledOrders.data];
        data[index] = {
          ...data[index],
          ...displayOrder
        };
      }

      return {
        ...state,
        transaction: {
          transactionType: "Fill Order",
          isPending: false,
          isSuccessful: true,
        },
        filledOrders: {
          ...state.filledOrders,
          data,
          loaded: true,
          lastUpdate: Date.now() // Add timestamp to force UI updates
        },
        events: [action.event, ...state.events],
    }

    case "ORDER_FILL_FAIL":
      return {
        ...state,
        transaction: {
          transactionType: "Fill Order",
          isPending: false,
          isSuccessful: false,
          isError: true,
        },
      };

    //-----------------------------
    // BALANCE CASES
    //-----------------------------
    case "EXCHANGE_TOKEN_1_BALANCE_LOADED":
      return {
        ...state,
        balances: state.balances ? [action.balance, state.balances[1]] : [action.balance, '0'],
      };
    case "EXCHANGE_TOKEN_2_BALANCE_LOADED":
      return {
        ...state,
        balances: state.balances ? [state.balances[0], action.balance] : ['0', action.balance],
      };
    // New case to handle batched balance updates
    case "BALANCES_LOADED":
      console.log("🔷 EXCHANGE REDUCER: Processing BALANCES_LOADED action", {
        token1Exchange: action.token1Exchange,
        token2Exchange: action.token2Exchange,
        timestamp: action.timestamp
      });
      
      // Explicitly copy the full state to ensure we're not losing anything
      const updatedState = {
        ...state,
        balances: [action.token1Exchange, action.token2Exchange],
        lastBalanceUpdate: action.timestamp
      };
      
      console.log("🔷 EXCHANGE REDUCER: New state after balance update", {
        newBalances: updatedState.balances,
        lastUpdate: updatedState.lastBalanceUpdate
      });
      
      return updatedState;

    //-----------------------------
    // TRANSFERING ORDERS
    //-----------------------------
    case "TRANSFER_REQUEST":
      return {
        ...state,
        transaction: {
          transactionType: "Transfer",
          isPending: true,
          isSuccessful: false,
        },
        transferInProgress: true,
      };
    case "TRANSFER_SUCCESS":
      return {
        ...state,
        transaction: {
          transactionType: "Transfer",
          isPending: false,
          isSuccessful: true,
        },
        transferInProgress: false,
        events: [action.event, ...state.events],
      };
    case "TRANSFER_FAIL":
      return {
        ...state,
        transaction: {
          transactionType: "Transfer",
          isPending: false,
          isSuccessful: false,
          isError: true,
          errorMessage: action.error // Include the error message
        },
        transferInProgress: false,
      };

    //-----------------------------
    // NEW ORDERS
    //-----------------------------
    case "NEW_ORDER_REQUEST":
      return {
        ...state,
        transaction: {
          transactionType: "New Order",
          isPending: true,
          isSuccessful: false,
        },
      };
    case "NEW_ORDER_SUCCESS":
      // Check if action.order exists and has an id property
      if (action.order && action.order.id) {
        index = state.allOrders.data.findIndex(order => order.id.toString() === action.order.id.toString());

        if (index === -1) {
          data = [...state.allOrders.data, action.order];
        } else {
          data = state.allOrders.data;
        }
      } else {
        console.error("Missing or invalid order in NEW_ORDER_SUCCESS:", action);
        data = state.allOrders.data;
      }

      return {
        ...state,
        allOrders: {
          ...state.allOrders,
          data,
        },
        transaction: {
          transactionType: "New Order",
          isPending: false,
          isSuccessful: true, // This was false before, changed to true
        },
        events: [action.event, ...state.events],
      };
    case "NEW_ORDER_FAIL":
      return {
        ...state,
        transaction: {
          transactionType: "New Order",
          isPending: false,
          isSuccessful: false,
          isError: true,
        },
      };

    default:
      return state;
  }
};
