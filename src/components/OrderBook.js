import { useSelector, useDispatch } from "react-redux"
import sort from "../assets/sort.svg"
import { orderBookSelector } from "../store/selectors"
import { fillOrder } from "../store/interactions"

const OrderBook = () => {
  const provider = useSelector(state => state.provider.connection);
  const exchange = useSelector(state => state.exchange.contract);
  const symbols = useSelector(state => state.tokens.symbols);
  const orderBook = useSelector(orderBookSelector);

  const dispatch = useDispatch();

  const fillOrderHandler = (order) => {
    fillOrder(provider, exchange, order, dispatch);
  };

  return (
    <div className="component exchange__orderbook" style={{ marginTop: '-60px' }}>
      <div className="component__header flex-between">
        <h2>Order Book</h2>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '-15px' }}>
        <div style={{ width: '45%' }}>
          <h3 style={{ marginBottom: '5px', color: 'var(--clr-red)' }}>Selling</h3>
          {!orderBook || orderBook.sellOrders.length === 0 ? (
            <p className="flex-center">No Sell Orders</p>
          ) : (
            <table className="exchange__orderbook--sell" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>
                    {symbols && symbols[0]}
                    <img src={sort} alt="Sort" />
                  </th>
                  <th>
                    {symbols && symbols[0]}/{symbols && symbols[1]}
                    <img src={sort} alt="Sort" />
                  </th>
                  <th>
                    {symbols && symbols[1]}
                    <img src={sort} alt="Sort" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {orderBook && orderBook.sellOrders.map((order, index) => {
                    const oColor = order.orderTypeClass;
                    return (
                      <tr key={index} onClick={() => fillOrderHandler(order)}>
                        <td>{order.token0Amount ? Number(order.token0Amount).toFixed(0) : '0'}</td>
                        <td style={{ color: oColor }}>{order.tokenPrice || '0'}</td>
                        <td>{order.token1Amount ? Number(order.token1Amount).toFixed(0) : '0'}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ width: '10%', display: 'flex', justifyContent: 'center' }}>
          <div className="divider"></div>
        </div>
        
        <div style={{ width: '45%' }}>
          <h3 style={{ marginBottom: '5px', color: 'var(--clr-green)' }}>Buying</h3>
          {!orderBook || orderBook.buyOrders.length === 0 ? (
            <p className="flex-center">No Buy Orders</p>
          ) : (
            <table className="exchange__orderbook--buy" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>
                    {symbols && symbols[0]}
                    <img src={sort} alt="Sort" />
                  </th>
                  <th>
                    {symbols && symbols[0]}/{symbols && symbols[1]}
                    <img src={sort} alt="Sort" />
                  </th>
                  <th>
                    {symbols && symbols[1]}
                    <img src={sort} alt="Sort" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {orderBook &&
                  orderBook.buyOrders.map((order, index) => {
                    const oColor = order.orderTypeClass;
                    return (
                      <tr key={index} onClick={() => fillOrderHandler(order)}>
                        <td>{order.token0Amount ? Number(order.token0Amount).toFixed(0) : '0'}</td>
                        <td style={{ color: oColor }}>{order.tokenPrice || '0'}</td>
                        <td>{order.token1Amount ? Number(order.token1Amount).toFixed(0) : '0'}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderBook;
