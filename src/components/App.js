import { useEffect } from "react";
import { useDispatch } from "react-redux";
import config from "../config.json";

import {
  loadProvider,
  loadNetwork,
  loadAccount,
  loadTokens,
  loadExchange,
  loadAllOrders,
  subscribeToEvents
} from "../store/interactions";

import Navbar from "./Navbar";
import Markets from "./Markets";
import Balance from "./Balance";
import Order from "./Order";
import PriceChart from "./PriceChart";
import Transactions from "./Transactions";
import Trades from "./Trades";
import OrderBook from "./OrderBook";
import Alert from "./Alert";

function App() {
  const dispatch = useDispatch();

  const loadBlockchainData = async () => {
    // connect ethers to blockchain
    const provider = loadProvider(dispatch);

    // fetch current network's chainId (e.g hardhat: 31337, sepolia: 11155111)
    const chainId = await loadNetwork(provider, dispatch);

    // reload page when network changes
    window.ethereum.on("chainChanged", () => {
      window.location.reload();
    });

    // Note: We only set up this listener if one doesn't already exist
    // This prevents duplicate event listeners that could cause race conditions
    if (!window._hasAccountsChangedListener && window.ethereum) {
      console.log("Setting up accountsChanged listener in App.js");
      window._hasAccountsChangedListener = true;
      
      // fetch current account & balance from metamask
      window.ethereum.on("accountsChanged", (accounts) => {
        console.log("Accounts changed in App.js event listener:", accounts);
        if (accounts.length > 0) {
          loadAccount(provider, dispatch);
        } else {
          // User disconnected all accounts - reflect this in UI
          console.log("No accounts available - switching to read-only mode");
          dispatch({ type: "ACCOUNT_LOADED", account: null });
        }
      });
    }

    // load token smart contracts
    const DApp = config[chainId].DApp;
    const mETH = config[chainId].mETH;
    await loadTokens(provider, [DApp.address, mETH.address], dispatch);

    // load exchange smart contract
    const exchangeConfig = config[chainId].exchange;
    const exchange = await loadExchange(
      provider,
      exchangeConfig.address,
      dispatch
    );

    // Re-enable order loading with optimized settings
    loadAllOrders(provider, exchange, dispatch);

    // listen to events
    subscribeToEvents(exchange, dispatch);
  };

  /**
   * Load blockchain data on component mount
   * Dependencies are intentionally empty to run once on mount
   */
  useEffect(() => {
    loadBlockchainData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <Navbar />

      <main className="exchange grid">
        <section className="exchange__section--left grid">
          <Markets />
          <Balance />
          <Order />
        </section>
        <section className="exchange__section--right grid">
          <PriceChart />
          <Transactions />
          <Trades />
          <OrderBook />
        </section>
      </main>

      <Alert />
    </div>
  );
}

export default App;
