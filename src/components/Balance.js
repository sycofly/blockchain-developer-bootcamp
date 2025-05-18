import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import dapp from "../assets/dapp.svg";
import eth from "../assets/eth.svg";

import { loadBalances, transferTokens } from "../store/interactions";

const Balance = () => {
  const [isDeposit, setIsDeposit] = useState(true);

  const [token1TransferAmount, setToken1TransferAmount] = useState(0);
  const [token2TransferAmount, setToken2TransferAmount] = useState(0);

  const dispatch = useDispatch();

  const provider = useSelector((state) => state.provider.connection);
  const account = useSelector((state) => state.provider.account);

  const exchange = useSelector((state) => state.exchange.contract);
  const exchangeBalances = useSelector((state) => state.exchange.balances);
  const transferInProgress = useSelector(
    (state) => state.exchange.transferInProgress
  );

  const tokens = useSelector((state) => state.tokens.contracts);
  const symbols = useSelector((state) => state.tokens.symbols);
  const tokenBalances = useSelector((state) => state.tokens.balances);

  const depositRef = useRef(null);
  const withdrawRef = useRef(null);

  const tabHandler = (e) => {
    if (e.target.className !== depositRef.current.className) {
      e.target.className = "tab tab--active";
      depositRef.current.className = "tab";
      setIsDeposit(false);
    } else {
      e.target.className = "tab tab--active";
      withdrawRef.current.className = "tab";
      setIsDeposit(true);
    }
  };

  const amountHandler = (e, token) => {
    if (token.address === tokens[0].address) {
      setToken1TransferAmount(e.target.value);
    } else {
      setToken2TransferAmount(e.target.value);
    }
  };

  const depositHandler = (e, token) => {
    e.preventDefault();

    if (token.address === tokens[0].address) {
      transferTokens(
        provider,
        exchange,
        "Deposit",
        token,
        token1TransferAmount,
        dispatch
      );
      setToken1TransferAmount(0);
    } else {
      transferTokens(
        provider,
        exchange,
        "Deposit",
        token,
        token2TransferAmount,
        dispatch
      );
      setToken2TransferAmount(0);
    }
  };

  const withdrawHandler = (e, token) => {
    e.preventDefault();

    if (token.address === tokens[0].address) {
      transferTokens(
        provider,
        exchange,
        "Withdraw",
        token,
        token1TransferAmount,
        dispatch
      );
      setToken1TransferAmount(0);
    } else {
      transferTokens(
        provider,
        exchange,
        "Withdraw",
        token,
        token2TransferAmount,
        dispatch
      );
      setToken2TransferAmount(0);
    }
  };

  // Log when balance props change
  useEffect(() => {
    // Check if we're in trade debug mode
    if (window._debugTradeExecution) {
      console.log("🟣 BALANCE COMPONENT - Current token balances:", tokenBalances);
      console.log("🟣 BALANCE COMPONENT - Current exchange balances:", exchangeBalances);
    }
  }, [tokenBalances, exchangeBalances]);
  
  // Combined useEffect to handle both initial loading and post-transfer updates
  useEffect(() => {
    if (exchange && tokens[0] && tokens[1] && account) {
      // Only log first balance load, not refreshes
      if (!window._balanceLoadStarted) {
        console.log("Loading balances...");
        window._balanceLoadStarted = true;
      }
      
      // Store a flag to know if this component is still mounted
      let isMounted = true;
      
      // Log in trade debug mode
      if (window._debugTradeExecution) {
        console.log("🟣 BALANCE COMPONENT - Starting balance load with:", {
          exchangeAddress: exchange?.address,
          token0Address: tokens[0]?.address,
          token1Address: tokens[1]?.address,
          account: account,
          transferInProgress: transferInProgress
        });
      }
      
      const loadBalancesWithRetention = async () => {
        try {
          // If this is a post-transfer update, add a small delay
          if (transferInProgress === false) {
            // Only log the first time after a transfer
            if (!window._transferCompleteLogged) {
              console.log("Transfer completed, reloading balances with delay...");
              window._transferCompleteLogged = true;
              // Reset this flag after a few seconds
              setTimeout(() => { window._transferCompleteLogged = false; }, 5000);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          // Only proceed if component is still mounted
          if (isMounted) {
            // Log before loading balances in debug mode
            if (window._debugTradeExecution) {
              console.log("🟣 BALANCE COMPONENT - About to call loadBalances");
            }
            
            await loadBalances(exchange, tokens, account, dispatch);
            
            // Log after loading balances in debug mode
            if (window._debugTradeExecution) {
              console.log("🟣 BALANCE COMPONENT - loadBalances completed");
            }
            
            // Set a refresh interval to maintain balances (with reduced logging)
            const refreshInterval = setInterval(() => {
              if (isMounted) {
                // Don't log routine refreshes to keep console clean
                loadBalances(exchange, tokens, account, dispatch);
              }
            }, 30000); // Refresh every 30 seconds
            
            return () => clearInterval(refreshInterval);
          }
        } catch (error) {
          console.error("Error loading balances:", error);
        }
      };
      
      loadBalancesWithRetention();
      
      // Cleanup function
      return () => {
        isMounted = false;
      };
    }
  }, [exchange, tokens, account, transferInProgress, dispatch]);

  return (
    <div className="component exchange__transfers">
      <div className="component__header flex-between">
        <h2>Balance</h2>
        <div className="tabs">
          <button onClick={tabHandler} ref={depositRef} className="tab tab--active" > Deposit </button>
          <button onClick={tabHandler} ref={withdrawRef} className="tab"> Withdraw </button>
        </div>
      </div>

      {/* Deposit/Withdraw Component 1 (DApp) */}

      <div className="exchange__transfers--form">
        <div className="flex-between">
          <p>
            <small>Token</small>
            <br />
            <img src={dapp} alt="Token Logo" />
            {symbols && symbols[0]}
          </p>
          <p>
            <small>Wallet</small>
            <br />
            {tokenBalances && tokenBalances[0]}
          </p>
          <p>
            <small>Exchange</small>
            <br />
            {exchangeBalances && exchangeBalances[0]}
          </p>
        </div>

        <form onSubmit={isDeposit ? (e) => depositHandler(e, tokens[0]) : (e) => withdrawHandler(e, tokens[0])}>
          <label htmlFor="token0">{symbols && symbols[0]} Amount</label>
          <input
            type="text"
            id="token0"
            placeholder="0.0000"
            value={token1TransferAmount === 0 ? "" : token1TransferAmount}
            onChange={(e) => amountHandler(e, tokens[0])}
          />

          <button className="button" type="submit">
            {isDeposit ? (
              <span>Deposit</span>
            ) : (
              <span>Withdraw</span>
            )}
          </button>
        </form>
      </div>

      <hr />

      {/* Deposit/Withdraw Component 2 (mETH) */}

      <div className="exchange__transfers--form">
        <div className="flex-between">
          <p>
            <small>Token</small>
            <br />
            <img src={eth} alt="Token Logo" />
            {symbols && symbols[1]}
          </p>
          <p>
            <small>Wallet</small>
            <br />
            {tokenBalances && tokenBalances[1]}
          </p>
          <p>
            <small>Exchange</small>
            <br />
            {exchangeBalances && exchangeBalances[1]}
          </p>
        </div>

        <form onSubmit={isDeposit ? (e) => depositHandler(e, tokens[1]) : (e) => withdrawHandler(e, tokens[1])}>
          <label htmlFor="token1">{symbols && symbols[1]} Amount</label>
          <input
            type="text"
            id="token1"
            placeholder="0.0000"
            value={token2TransferAmount === 0 ? "" : token2TransferAmount}
            onChange={(e) => amountHandler(e, tokens[1])}
          />

          <button className="button" type="submit">
            {isDeposit ? (
              <span>Deposit</span>
            ) : (
              <span>Withdraw</span>
            )}
          </button>
        </form>
      </div>

      <hr />
    </div>
  );
};

export default Balance;
