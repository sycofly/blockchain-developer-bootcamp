import { useSelector } from "react-redux";
import priceUpIcon from "../assets/price-up.svg";
import metamaskIcon from "../assets/metamask.svg";
import priceDownIcon from "../assets/price-down.svg";
import priceNeutralIcon from "../assets/price-neutral.svg";
import Chart from "react-apexcharts";
import { options, defaultSeries } from "./PriceChart.config";
import { priceChartSelector } from "../store/selectors";
// import Banner from './Banner';

const PriceChart = () => {
  const account = useSelector((state) => state.provider.account);
  const symbols = useSelector((state) => state.tokens.symbols);
  const priceChart = useSelector(priceChartSelector);

  // Calculate price change direction and percentage
  let priceDirection = 0; // 0 for no change, 1 for up, -1 for down
  let priceChange = 0;

  if (priceChart && priceChart.series && priceChart.series[0].data.length > 0) {
    // Get first and last candle data to calculate price change
    const firstCandle = priceChart.series[0].data[0];
    const lastCandle = priceChart.series[0].data[priceChart.series[0].data.length - 1];

    // Closing prices (index 3 in the y array contains the closing price)
    const firstPrice = firstCandle.y[3]; // Closing price of first candle
    const lastPrice = lastCandle.y[3]; // Closing price of last candle

    // Calculate direction and percentage change
    priceDirection = lastPrice > firstPrice ? 1 : lastPrice < firstPrice ? -1 : 0;
    priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;
  }

  return (
    <div className="component exchange__chart">
      <div className="component__header flex-between">
        <div className="flex">
          <h2>{symbols && `${symbols[0]}/${symbols[1]}`}</h2>

          <div className="price-indicator flex">
            {priceDirection === 1 ? (
              <img src={priceUpIcon} alt="Price up" className="price-icon up" />
            ) : priceDirection === -1 ? (
              <img
                src={priceDownIcon}
                alt="Price down"
                className="price-icon down"
              />
            ) : (
              <img
                src={priceNeutralIcon}
                alt="Price neutral"
                className="price-icon neutral"
              />
            )}
            <span className={
              priceDirection === 1 ? "price-up" :
              priceDirection === -1 ? "price-down" :
              "price-neutral"
            }>
              {priceDirection === 0
                ? "0.00%"
                : `${priceDirection === 1 ? "+" : ""}${Math.abs(priceChange).toFixed(2)}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Price chart goes here */}
      {!account ? (
        <div className="exchange__chart--message">
          <div className="metamask-message">
            <img src={metamaskIcon} alt="MetaMask" className="metamask-icon" />
            <h3 className="gradient-text">Please Connect to MetaMask</h3>
          </div>
        </div>
      ) : (
        <Chart
          type="candlestick"
          options={options}
          series={priceChart ? priceChart.series : defaultSeries}
          width="100%"
          height="100%"
        />
      )}
    </div>
  );
};

export default PriceChart;
