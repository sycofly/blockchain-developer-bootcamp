import { useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { myOpenOrdersSelector, myFilledOrdersSelector} from "../store/selectors";
import sort from "../assets/sort.svg";
import { cancelOrder } from "../store/interactions";
import Banner from "./Banner";

const Transactions = () => {
  const [showMyOrders, setShowMyOrders] = useState(true);

  const provider = useSelector(state => state.provider.connection);
  const exchange = useSelector(state => state.exchange.contract);
  const symbols = useSelector(state => state.tokens.symbols);
  const myOpenOrders = useSelector(myOpenOrdersSelector);
  const myFIlledOrders = useSelector(myFilledOrdersSelector);

  const dispatch = useDispatch();

  const tradeRef = useRef(null);
  const orderRef = useRef(null);

  const tabHandler = (e) => {
    if (e.target.className !== orderRef.current.className) {
      e.target.className = "tab tab--active";
      orderRef.current.className = "tab";
      setShowMyOrders(false);
    } else {
      e.target.className = "tab tab--active";
      tradeRef.current.className = "tab";
      setShowMyOrders(true);
    }
  };

  const cancelHandler = (order) => {
    console.log("Cancel button clicked for order:", order);
    // Log specific order properties before sending
    console.log("Order ID type:", typeof order.id);
    console.log("Order properties:", {
      id: order.id ? order.id.toString() : 'undefined',
      user: order.user,
      tokenGet: order.tokenGet,
      tokenGive: order.tokenGive
    });

    cancelOrder(provider, exchange, order, dispatch);
  };

  return (
    <div className="component exchange__transactions">
      {showMyOrders ? (
        <div>
          <div className="component__header flex-between">
            <h2>My Orders</h2>

            <div className="tabs">
              <button onClick={tabHandler} ref={orderRef} className="tab tab--active">Orders</button>
              <button onClick={tabHandler} ref={tradeRef} className="tab">Trades</button>
            </div>
          </div>

          {!myOpenOrders || myOpenOrders.length === 0 ? (
            <Banner text="No Open Orders" />
          ) : (
            <table>
              <thead>
                <tr>
                  <th> {symbols && symbols[0]}<img src={sort} alt="Sort" /></th>
                  <th> {symbols && symbols[0]}/{symbols && symbols[1]}<img src={sort} alt="Sort" /></th>
                  <th>My Orders</th>
                </tr>
              </thead>
              <tbody>
                {myOpenOrders && myOpenOrders.map((order, index) => {
                    return (
                      <tr key={index}>
                        <td className="trades__amount" style={{color: `${order.orderTypeClass}`}}>{order.token0Amount ? Number(order.token0Amount).toFixed(0) : '0'}</td>
                        <td className="trades__price">{order.tokenPrice || '0'}</td>
                        <td><button className="button--sm" onClick={() => cancelHandler(order)}>Cancel</button></td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div>
          <div className="component__header flex-between">
            <h2>My Transactions</h2>

            <div className="tabs">
              <button onClick={tabHandler} ref={orderRef} className="tab tab--active">Orders</button>
              <button onClick={tabHandler} ref={tradeRef} className="tab">Trades</button>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Time<img src={sort} alt="Sort" /></th>
                <th>{symbols && symbols[0]}<img src={sort} alt="Sort" /></th>
                <th>{symbols && symbols[0]}/{symbols && symbols[1]}<img src={sort} alt="Sort" /></th>
              </tr>
            </thead>
            <tbody>

              {myFIlledOrders && myFIlledOrders.map((order, index) => {
                  return (
                    <tr key={index}>
                      <td className="trades__time">{order.formattedTimestamp ? order.formattedTimestamp.replace(',', '') : ''}</td>
                      <td style={{color: `${order.orderClass}`}}>{order.orderSign}{order.token0Amount ? Number(order.token0Amount).toFixed(0) : '0'}</td>
                      <td className="trades__price">{order.tokenPrice || '0'}</td>
                    </tr>
                  );
                })}

            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Transactions;
