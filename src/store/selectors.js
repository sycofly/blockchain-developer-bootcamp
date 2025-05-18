import { createSelector } from "reselect";
import { get, groupBy, reject, maxBy, minBy } from "lodash";
import moment from "moment";
import { ethers } from "ethers";

const RED = "#F45353";
const GREEN = "#25CE8F";

const account = state => get(state, "provider.account");
const tokens = state => get(state, "tokens.contracts");
const events = state => get(state, "exchange.events");

const allOrders = state => get(state, "exchange.allOrders.data", []);
const cancelledOrders = state => get(state, "exchange.cancelledOrders.data", []);
const filledOrders = state => get(state, "exchange.filledOrders.data", []);

const openOrders = state => {
  const all = allOrders(state);
  const filled = filledOrders(state);
  const cancelled = cancelledOrders(state);

  const openOrders = reject(all, (order) => {
    const orderFilled = filled.some((o) => o.id.toString() === order.id.toString());
    const orderCancelled = cancelled.some((o) => o.id.toString() === order.id.toString());
    return orderFilled || orderCancelled;
  });

  return openOrders;

};

//-------------------------------------------------------------
// my events 
//-------------------------------------------------------------
export const myEventsSelector = createSelector(
  account,
  events,
  (account, events) => {
    events = events.filter((e) => e.args.user === account);
    console.log(events);
    return events;
  }
)


//-------------------------------------------------------------
// my open orders
//-------------------------------------------------------------
export const myOpenOrdersSelector = createSelector(
  account,
  tokens,
  openOrders,
  (account, tokens, orders) => {
    if (!tokens[0] || !tokens[1]) {
      return;
    }

    // filter orderscreated by current account
    orders = orders.filter((o) => o.user === account);

    // filter orders by token address
    orders = orders.filter((o) => o.tokenGet === tokens[0].address || o.tokenGet === tokens[1].address);
    orders = orders.filter((o) => o.tokenGive === tokens[0].address || o.tokenGive === tokens[1].address);

    // decorate orders and display attributes
    orders = decorateMyOpenOrders(orders, tokens);

    // sort orders by date descending
    orders = orders.sort((a, b) => b.timestamp - a.timestamp);

    return orders;
  }
)

const decorateMyOpenOrders = (orders, tokens) => {
  return(
    orders.map((order) => {
      order = decorateOrder(order, tokens);
      order = decorateMyOpenOrder(order, tokens);
      return (order)
    })
  )
};

const decorateMyOpenOrder = (order, tokens) => {
  let orderType = order.tokenGive === tokens[1].address ? "buy" : "sell";

  return {
    ...order,
    orderType,
    orderTypeClass: (orderType === "buy" ? GREEN : RED)
  }
};

const decorateOrder = (order, tokens) => {
  try {
    // If order already has these fields, just return it as is
    if (order.token0Amount && order.token1Amount && order.tokenPrice) {
      console.log("Order already decorated with amounts:", {
        id: order.id,
        token0Amount: order.token0Amount,
        token1Amount: order.token1Amount,
        tokenPrice: order.tokenPrice
      });
      return {
        ...order,
        // Ensure timestamp is properly formatted
        formattedTimestamp: order.formattedTimestamp || 
          moment.unix(order.timestamp).format("YYYY-MM-DD HH:mm:ss").replace(',', ''),
      };
    }
    
    // Otherwise calculate the amounts
    let token0Amount, token1Amount;
    
    if (order.tokenGive === tokens[1].address) {
      token0Amount = order.amountGive;
      token1Amount = order.amountGet;
    } else {
      token0Amount = order.amountGet;
      token1Amount = order.amountGive;
    }

    // Make sure we're working with BigNumber objects
    try {
      if (!ethers.BigNumber.isBigNumber(token0Amount)) {
        token0Amount = ethers.BigNumber.from(token0Amount.toString());
      }
      if (!ethers.BigNumber.isBigNumber(token1Amount)) {
        token1Amount = ethers.BigNumber.from(token1Amount.toString());
      }
    } catch (err) {
      console.warn("Error converting to BigNumber, using string values:", err);
      // Continue with string values
    }

    // Calculate and format the price
    const precisionUI = 10;
    const precision = 100000;
    let tokenPrice;
    
    try {
      const token0Formatted = ethers.utils.formatUnits(token0Amount, "ether");
      const token1Formatted = ethers.utils.formatUnits(token1Amount, "ether");
      
      const token0Num = parseFloat(token0Formatted);
      const token1Num = parseFloat(token1Formatted);
      
      if (token0Num > 0) {
        tokenPrice = token1Num / token0Num;
        tokenPrice = Math.round(tokenPrice * precision) / precision;
        tokenPrice = tokenPrice.toFixed(precisionUI);
      } else {
        tokenPrice = '0';
      }
      
      // Console log the formatted data for debugging
      console.log(`Decorated order ${order.id} - Token0: ${token0Formatted}, Token1: ${token1Formatted}, Price: ${tokenPrice}`);
      
      return {
        ...order,
        token0Amount: token0Formatted,
        token1Amount: token1Formatted,
        tokenPrice,
        formattedTimestamp: order.formattedTimestamp || 
          moment.unix(order.timestamp).format("YYYY-MM-DD HH:mm:ss").replace(',', ''),
      };
    } catch (err) {
      console.warn("Error formatting order amounts:", err, order);
      // Return order with basic string formatting as fallback
      return {
        ...order,
        token0Amount: token0Amount.toString(),
        token1Amount: token1Amount.toString(),
        tokenPrice: '0',
        formattedTimestamp: order.formattedTimestamp || 
          moment.unix(order.timestamp).format("YYYY-MM-DD HH:mm:ss").replace(',', ''),
      };
    }
  } catch (err) {
    console.error("Fatal error decorating order:", err, order);
    // Return original order as fallback
    return order;
  }
};


//-------------------------------------------------------------
// all filled orders
//-------------------------------------------------------------
export const filledOrdersSelector = createSelector(
  filledOrders,
  tokens,
  (orders, tokens) => {
    if (!tokens[0] || !tokens[1]) {
      return [];
    }
    
    // Ensure orders exists and is an array
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      console.log("No filled orders to display");
      return [];
    }

    // Check each order for required properties
    orders = orders.filter(o => {
      // Check if this is a valid order object
      if (!o || typeof o !== 'object') {
        console.warn("Invalid order object found:", o);
        return false;
      }
      
      // Make sure necessary addresses exist
      if (!o.tokenGet || !o.tokenGive) {
        console.warn("Order missing token addresses:", o);
        return false;
      }
      
      return true;
    });
    
    // filter orders by selected tokens 
    try {
      orders = orders.filter((o) => o.tokenGet === tokens[0].address || o.tokenGet === tokens[1].address);
      orders = orders.filter((o) => o.tokenGive === tokens[0].address || o.tokenGive === tokens[1].address);
      
      // Ensure timestamp exists for each order
      orders = orders.map(order => {
        if (!order.timestamp) {
          console.log("Adding missing timestamp to order");
          return { ...order, timestamp: Math.floor(Date.now() / 1000) };
        }
        return order;
      });

      // step 1 sort orders by time Ascending
      orders = orders.sort((a, b) => a.timestamp - b.timestamp);

      // step 2. apply order colors (only if we have orders)
      if (orders.length > 0) {
        orders = decorateFilledOrders(orders, tokens);
      }

      // step 3. sort orders by time descending
      orders = orders.sort((a, b) => b.timestamp - a.timestamp);

      return orders;
    } catch (error) {
      console.error("Error in filledOrdersSelector:", error);
      return [];
    }
  }
);

const decorateFilledOrders = (orders, tokens) => {
  if (!orders || orders.length === 0) {
    return [];
  }
  
  try {
    // track previous order to compare history
    let previousOrder = orders[0];
    
    if (!previousOrder) {
      return orders;
    }

    return orders.map((order) => {
      try {
        // Skip invalid orders
        if (!order || typeof order !== 'object') {
          console.warn("Invalid order in decorateFilledOrders");
          return order;
        }
        
        // decorate each individual order
        const decoratedOrder = decorateOrder(order, tokens);
        const finalOrder = decorateFilledOrder(decoratedOrder, previousOrder);
        previousOrder = finalOrder; // update previous order once decorated
        return finalOrder;
      } catch (error) {
        console.error("Error decorating individual order:", error, order);
        return order; // Return original order if decoration fails
      }
    });
  } catch (error) {
    console.error("Error in decorateFilledOrders:", error);
    return orders; // Return original orders if decoration completely fails
  }
};

const decorateFilledOrder = (order, previousOrder) => {
  if (!order || !previousOrder) {
    return order;
  }
  
  try {
    return {
      ...order,
      tokenPriceClass: tokenPriceClass(order.tokenPrice, order.id, previousOrder),
    };
  } catch (error) {
    console.error("Error in decorateFilledOrder:", error);
    return {
      ...order,
      tokenPriceClass: GREEN // Default to green on error
    };
  }
};

const tokenPriceClass = (tokenPrice, orderId, previousOrder) => {
  // Handle missing data
  if (!previousOrder || !orderId || previousOrder.id === undefined) {
    return GREEN;
  }
  
  // show green price if only one order exists
  if (previousOrder.id && orderId && previousOrder.id.toString() === orderId.toString()) {
    return GREEN;
  }

  // Handle missing prices
  if (tokenPrice === undefined || previousOrder.tokenPrice === undefined) {
    return GREEN;
  }

  // Parse prices to ensure they're numbers
  const currentPrice = parseFloat(tokenPrice);
  const prevPrice = parseFloat(previousOrder.tokenPrice);
  
  // show green price if order price higher than previous order
  // show red price if order price lower than previous order
  if (prevPrice <= currentPrice) {
    return GREEN; // success
  } else {
    return RED; // danger
  }
};


//-------------------------------------------------------------
// my filled ordders
//-------------------------------------------------------------
export const myFilledOrdersSelector = createSelector(
  account,
  tokens,
  filledOrders,
  (account, tokens, orders) => {
    if (!tokens[0] || !tokens[1]) {
      return;
    }

    // find our orders
    orders = orders.filter((o) => o.user === account || o.creator === account)
    // only orders for current trading pair
    orders = orders.filter((o) => o.tokenGet === tokens[0].address || o.tokenGet === tokens[1].address);
    orders = orders.filter((o) => o.tokenGive === tokens[0].address || o.tokenGive === tokens[1].address);

    // sort by date descending
    orders = orders.sort((a, b) => b.timestamp - a.timestamp);

    // decorate ordres and display attributes
    orders = decorateMyFilledOrders(orders, account, tokens);

    return orders;
  }
)

const decorateMyFilledOrders = (orders, account, tokens) => {
  return(
    orders.map((order) => {
      order = decorateOrder(order, tokens);
      order = decorateMyFilledOrder(order, account, tokens);
      return(order)
    })
  )
}

const decorateMyFilledOrder = (order, account, tokens) => {
  const myOrder = order.creator === account;

  let orderType
  if(myOrder) {
    orderType = order.tokenGive === tokens[1].address ? "buy" : "sell";
  } else {
    orderType = order.tokenGive === tokens[1].address ? "sell" : "buy";
  }
  return({
    ...order,
    orderType,
    orderClass: (orderType === "buy" ? GREEN : RED),
    orderSign: (orderType === "buy" ? "+" : "-")
  })
};


//-------------------------------------------------------------
// order book
//-------------------------------------------------------------
export const orderBookSelector = createSelector(
  openOrders,
  tokens,
  (orders, tokens) => {
    if (!tokens[0] || !tokens[1]) {
      return;
    }

    // filter orders by selected tokens
    orders = orders.filter((o) => o.tokenGet === tokens[0].address || o.tokenGet === tokens[1].address);
    orders = orders.filter((o) => o.tokenGive === tokens[0].address || o.tokenGive === tokens[1].address);

    // decoreate orders
    orders = decorateOrderBookOrders(orders, tokens);

    // group oders by orderType
    orders = groupBy(orders, "orderType");

    // fetch buy orders
    const buyOrders = get(orders, "buy", []);

      // sort buy orders by token price
      orders = {
        ...orders,
        buyOrders: buyOrders.sort((a, b) => b.tokenPrice - a.tokenPrice),
      };

    // fetch sell orders
    const sellOrders = get(orders, "sell", []);

      // sort sell orders by token price
      orders = {
        ...orders,
        sellOrders: sellOrders.sort((a, b) => b.tokenPrice - a.tokenPrice),
      };

    return orders;
  }
);

const decorateOrderBookOrders = (orders, tokens) => {
  return( 
    orders.map((order) => {
      order = decorateOrder(order, tokens);
      order = decorateOrderBookOrder(order, tokens);
    return order;
    })
  )
};

const decorateOrderBookOrder = (order, tokens) => {
  const orderType = order.tokenGive === tokens[0].address ? "buy" : "sell";

  return {
    ...order,
    orderType,
    orderTypeClass: (orderType === "buy" ? GREEN : RED),
    orderFillAction: (orderType === "buy" ? "sell" : "buy"),
  };
};


//-------------------------------------------------------------
// price chart
//-------------------------------------------------------------
export const priceChartSelector = createSelector(
  filledOrders,
  tokens,
  (orders, tokens) => {
    if (!tokens[0] || !tokens[1]) {
      return;
    }

    // filter oders by selected tokens
    orders = orders.filter((o) => o.tokenGet === tokens[0].address || o.tokenGet === tokens[1].address);
    orders = orders.filter((o) => o.tokenGive === tokens[0].address || o.tokenGive === tokens[1].address);

    // sort orders by date ascending to compare history
    orders = orders.sort((a, b) => a.timestamp - b.timestamp);

    // decorate orders and display attributes
    orders = orders.map((o) => decorateOrder(o, tokens));

    // get last 2 order for final price & price chnage
    let secondLastOrder, lastOrder
    [secondLastOrder, lastOrder] = orders.slice(orders.length - 2, orders.length)

    // get last order price
    const lastPrice = get(lastOrder, "tokenPrice", 0);

    // get second last order price
    const secondLastPrice = get(secondLastOrder, "tokenPrice", 0);

    return({
      lastPrice,
      lastPriceChange: (lastPrice >= secondLastPrice ? '+' : '-'),
      series: [ {
          data: buildGraphData(orders),
        }],
      })

  }
);

const buildGraphData = (orders) => {
  // group the orders by hour for the graph
  orders = groupBy(orders, (o) => moment.unix(o.timestamp).startOf("hour").format());

  // get the hour where data exists
  const hours = Object.keys(orders);

  // build the graph series
  const graphData = hours.map((hour) => {
    // fetch all orders from currect hour
    const group = orders[hour];

    // calulate price values: open, high, low, close
    const open = group[0] // first order
    const high = maxBy(group, "tokenPrice") // high price
    const low = minBy(group, "tokenPrice") // low price
    const close = group[group.length - 1] //last order

    // Ensure all values are numbers by parsing them
    // const openPrice = parseFloat(open.tokenPrice);
    // const highPrice = parseFloat(high.tokenPrice);
    // const lowPrice = parseFloat(low.tokenPrice);
    // const closePrice = parseFloat(close.tokenPrice);

    return {
      x: new Date(hour),
      y: [open.tokenPrice, high.tokenPrice, low.tokenPrice, close.tokenPrice],
    };
  });

  return graphData;
};
