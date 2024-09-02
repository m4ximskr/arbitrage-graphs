import {ArbitrageNodeData} from "../arbitrage-graph/arbitrage-graph.model";

export function generateRandomArbitrage(): ArbitrageNodeData {
  const cexes = ['Binance', 'Kraken', 'Coinbase', 'Bitfinex', 'Huobi'];
  const chains = ['Ethereum', 'BSC', 'Polygon', 'Solana', 'Avalanche'];
  const tickers = ['BTC', 'USDT', 'ETH', 'DOGE', 'CRV', 'TRX'];
  const randomElementFromArrayFn = (array) => array[Math.floor(Math.random() * array.length)];

  let currentTicker = randomElementFromArrayFn(tickers);
  const pairs = [];
  const length = Math.floor(Math.random() * 3) + 3;

  for (let i = 0; i < length; i++) {
    const nextTicker = randomElementFromArrayFn(tickers.filter(element => element !== currentTicker));

    pairs.push({
      symbol: `${currentTicker}/${nextTicker}`,
      cex: randomElementFromArrayFn(cexes),
      chain: randomElementFromArrayFn(chains)
    });

    currentTicker = nextTicker;
  }

  const amount = Math.floor(Math.random() * 100) + 5
  const profit =  ((Math.random() * (10000)) + -5000).toFixed(2);

  return {
    pairs,
    amount,
    profit: parseFloat(profit),
  };
}
