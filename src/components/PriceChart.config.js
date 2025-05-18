export const options = {
  chart: {
    animations: { enabled: true },
    toolbar: { show: false },
    width: '100px'
  },
  tooltip: {
    enabled: true,
    theme: 'dark',
    style: {
      fontSize: '12px',
      fontFamily: 'DM Sans'
    },
    custom: ({ seriesIndex, dataPointIndex, w }) => {
      try {
        // Try to get data from series points directly
        let o, h, l, c;

        // In the candlestick chart data format, the y property contains [open, high, low, close]
        if (w.config.series[seriesIndex] && w.config.series[seriesIndex].data[dataPointIndex]) {
          // Direct access to the data point's y array
          const dataPoint = w.config.series[seriesIndex].data[dataPointIndex];
          if (dataPoint && Array.isArray(dataPoint.y) && dataPoint.y.length === 4) {
            [o, h, l, c] = dataPoint.y;
          }
        }

        // Fallback to candle series if needed
        if (o === undefined) {
          o = w.globals.seriesCandleO?.[seriesIndex]?.[dataPointIndex];
          h = w.globals.seriesCandleH?.[seriesIndex]?.[dataPointIndex];
          l = w.globals.seriesCandleL?.[seriesIndex]?.[dataPointIndex];
          c = w.globals.seriesCandleC?.[seriesIndex]?.[dataPointIndex];
        }

        // Format date
        const date = new Date(w.globals.seriesX[seriesIndex][dataPointIndex]);
        // Format as "DD MMM HH:MM" (e.g., "15 May 14:30")
        const day = date.getDate();
        const month = date.toLocaleString('en-US', { month: 'short' });
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const formattedDate = `${day} ${month} ${hours}:${minutes}`;

        // Ensure values are numbers and use safe formatting
        const formatValue = (value) => {
          if (typeof value === 'string') {
            // If value is a numeric string, convert it to number first
            const num = parseFloat(value);
            return isNaN(num) ? '0.000000' : num.toFixed(6);
          }
          return typeof value === 'number' ? value.toFixed(6) : '0.000000';
        };

        // Create tooltip HTML
        return `
          <div class="apexcharts-tooltip-box" style="background: #121A29; color: #F1F2F9; padding: 8px; border-radius: 5px; border: 1px solid #1E3B8A; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
            <div style="font-weight: bold; margin-bottom: 5px;">${formattedDate}</div>
            <div style="display: flex; justify-content: space-between;">
              <span>Open:</span>
              <span style="font-weight: bold;">${formatValue(o)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>High:</span>
              <span style="font-weight: bold; color: #25CE8F;">${formatValue(h)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Low:</span>
              <span style="font-weight: bold; color: #F45353;">${formatValue(l)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Close:</span>
              <span style="font-weight: bold;">${formatValue(c)}</span>
            </div>
          </div>
        `;
      } catch (error) {
        // Fallback for any errors
        return `
          <div class="apexcharts-tooltip-box" style="background: #121A29; color: #F1F2F9; padding: 8px; border-radius: 5px; border: 1px solid #1E3B8A; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
            <div style="font-weight: bold; margin-bottom: 5px;">No data available</div>
          </div>
        `;
      }
    },
    x: {
      show: true,
      format: 'dd MMM',
    },
    y: {
      show: true,
      title: 'price'
    },
    marker: {
      show: false,
    },
    fixed: {
      enabled: false,
      position: 'topRight',
      offsetX: 0,
      offsetY: 0,
    },
  },
  grid: {
    show: true,
    borderColor: '#767F92',
    strokeDashArray: 0
  },
  plotOptions: {
    candlestick: {
      colors: {
        upward: '#25CE8F',
        downward: '#F45353'
      }
    }
  },
  xaxis: {
    type: 'datetime',
    labels: {
      show: true,
      style: {
        colors: '#767F92',
        fontSize: '14px',
        cssClass: 'apexcharts-xaxis-label',
      },
    }
  },
  yaxis: {
    labels: {
      show: true,
      minWidth: 0,
      maxWidth: 160,
      style: {
        color: '#F1F2F9',
        fontSize: '14px',
        cssClass: 'apexcharts-yaxis-label',
      },
      offsetX: 0,
      offsetY: 0,
      rotate: 0,
    }
  }
}

// Code in the series as a temporary placeholder for demonstration
export const defaultSeries = []

export const series = [
  {
    data: [
      [24.01, [6593.34, 6600, 6582.63, 6600]],
      [25.01, [6600, 6604.76, 6590.73, 6593.86]],
      [26.01, [6593.86, 6625.76, 6590.73, 6620.00]],
      [27.01, [6620.00, 6604.76, 6590.73, 6605.86]],
      [28.01, [6605.86, 6604.76, 6590.73, 6590.75]],
      [29.01, [6590.75, 6604.76, 6590.73, 6582.10]],
      [30.01, [6582.10, 6604.76, 6516.73, 6550.10]],
      [31.01, [6550.10, 6604.76, 6550.73, 6600.23]],
      [32.01, [6600.23, 6604.76, 6590.73, 6652.89]],
      [33.01, [6652.89, 6670.00, 6632.89, 6660.89]],
      [34.01, [6660.89, 6670.00, 6632.89, 6650.89]],
      [35.01, [6650.89, 6670.00, 6632.89, 6638.89]],
      [36.01, [6638.89, 6670.00, 6598.89, 6618.89]],
    ]
  }
]
