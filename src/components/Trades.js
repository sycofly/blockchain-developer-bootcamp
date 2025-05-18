import { useSelector } from "react-redux";
import { filledOrdersSelector } from "../store/selectors";
import sort from '../assets/sort.svg'
import Banner from './Banner';
import { useEffect, useState, useMemo } from "react";

const Trades = () => {
  const symbols = useSelector((state) => state.tokens.symbols);
  // Get filled orders from both the selector and the raw state
  const processedFilledOrders = useSelector(filledOrdersSelector);
  const rawFilledOrders = useSelector((state) => state.exchange.filledOrders.data);
  const events = useSelector((state) => state.exchange.events);
  
  // Use the rawFilledOrders as fallback if the selector returns nothing
  const filledOrders = useMemo(() => {
    // First check if we have processed orders from the selector
    if (processedFilledOrders && processedFilledOrders.length > 0) {
      console.log("🔴 Using processed filled orders from selector:", processedFilledOrders.length);
      return processedFilledOrders;
    }
    
    // If not, use the raw filled orders directly
    if (rawFilledOrders && rawFilledOrders.length > 0) {
      console.log("🔴 Using raw filled orders from state:", rawFilledOrders.length);
      return rawFilledOrders;
    }
    
    // If both are empty, return an empty array
    return [];
  }, [processedFilledOrders, rawFilledOrders]);
  
  // Track when filled orders change for forced re-renders
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  
  // Track the last update timestamp from the reducer
  const lastTradeTimestamp = useSelector((state) => state.exchange.filledOrders.lastTradeTimestamp);
  const manualTradeAdded = useSelector((state) => state.exchange.filledOrders.manual);
  
  // Always log when trades change (whether in debug mode or not)
  useEffect(() => {
    console.log("🔴 Trades updated - filled orders count:", filledOrders?.length || 0);
    
    if (window._debugTradeExecution) {
      console.log("🔴 TRADES COMPONENT - Current filled orders:", filledOrders);
      console.log("🔴 TRADES COMPONENT - Raw events:", events);
    }
    
    // Force a re-render to ensure UI updates
    setLastUpdateTime(Date.now());
  }, [filledOrders, lastTradeTimestamp, events]);
  
  // Force re-render when events change
  useEffect(() => {
    if (events && events.length > 0) {
      // Check for any Trade events
      const hasTradeEvents = events.some(e => 
        e.event === 'Trade' || 
        (e.meta && e.meta.eventType === 'ORDER_FILL_SUCCESS')
      );
      
      if (hasTradeEvents) {
        console.log("🔴 TRADES COMPONENT - Trade events detected, forcing update");
        setLastUpdateTime(Date.now());
      }
    }
  }, [events]);
  
  // Special handling for manual trades
  useEffect(() => {
    if (manualTradeAdded) {
      console.log("🔴 TRADES COMPONENT - Manual trade detected, forcing update");
      setLastUpdateTime(Date.now());
    }
  }, [manualTradeAdded]);
  
  return (
    <div className="component exchange__trades">
      <div className="component__header flex-between">
        <h2>Trades</h2>
      </div>

      {!filledOrders || filledOrders.length === 0 ? (
        <Banner text="No Transactions" />
      ) : (
        <table>
          <thead>
            <tr>
              <th>Time<img src={sort} alt="Sort" /></th>
              <th>{symbols && symbols[0]}<img src={sort} alt="Sort" /></th>
              <th>{symbols && symbols[0]}/{symbols && symbols[1]}<img src={sort} alt="Sort" /></th>
            </tr>
          </thead>
          <tbody>
            {filledOrders.map((order, index) => {
              // Add debugging
              if (window._debugTradeExecution && index === 0) {
                console.log("🔴 TRADES COMPONENT - Rendering first order:", order);
              }
              
              // Format time string cleanly without comma between date and time
              let timeDisplay = order.formattedTimestamp;
              
              if (!timeDisplay && order.timestamp) {
                const date = new Date(order.timestamp * 1000);
                // Format as YYYY-MM-DD HH:MM:SS without comma
                timeDisplay = date.toISOString().slice(0, 10) + ' ' + 
                             date.toTimeString().slice(0, 8);
              } else if (!timeDisplay) {
                timeDisplay = 'Recent';
              }
              
              // Remove any commas in the timestamp
              timeDisplay = timeDisplay.replace(',', '');
              
              return (
                <tr key={order.id || order.transactionHash || index}>
                  <td className="trades__time">
                    {(Date.now() - lastUpdateTime < 5000) && order === filledOrders[0] ? (
                      <span>
                        <span style={{ color: '#25CE8F', fontWeight: 'bold', marginRight: '5px' }}>New!</span>
                        {timeDisplay}
                      </span>
                    ) : (
                      timeDisplay
                    )}
                  </td>
                  <td className="trades__amount" style={{ color: order.tokenPriceClass }}>
                    {order.token0Amount ? Number(order.token0Amount).toFixed(0) : '0'}
                  </td>
                  <td className="trades__price">{order.tokenPrice || '0'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Trades;
