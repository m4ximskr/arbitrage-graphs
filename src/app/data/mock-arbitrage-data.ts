import {
  ArbitrageData,
  ArbitrageLocation,
  ArbitrageLocationType,
} from "../arbitrage-graph/arbitrage-graph.model";

export function generateRandomArbitrage(): ArbitrageData {
  const exchanges = ['Binance', 'Kraken', 'Coinbase', 'Bitfinex', 'Huobi'];
  const chains = ['Ethereum', 'BSC', 'Polygon', 'Solana', 'Avalanche'];
  const symbols = ['BTC', 'USDT', 'ETH', 'DOGE', 'CRV', 'TRX'];
  const randomElementFromArrayFn = (array) => array[Math.floor(Math.random() * array.length)];

  const getRandomArbitrageLocation = (): ArbitrageLocation => {
    const isChain = Math.random() > 0.5;

    return {
      name: isChain ? randomElementFromArrayFn(chains) : randomElementFromArrayFn(exchanges),
      type: isChain ? ArbitrageLocationType.CHAIN : ArbitrageLocationType.EXCHANGE,
    }
  }

  return {
    direction: `${randomElementFromArrayFn(exchanges)} -> ${randomElementFromArrayFn(exchanges)}`,
    from: getRandomArbitrageLocation(),
    to: getRandomArbitrageLocation(),
    symbol: randomElementFromArrayFn(symbols),
    amountIn: Math.floor(Math.random() * 100) + 5,
    profit: parseFloat(((Math.random() * (10000)) + -5000).toFixed(2)),
  }
}

export function generateMultipleArbitrage(): ArbitrageData[] {
  return [
    {
      direction: `loh 1`,
      from: {
        name: 'Coinbase',
        type: ArbitrageLocationType.EXCHANGE,
      },
      to: {
        name: 'Coinbase',
        type: ArbitrageLocationType.EXCHANGE,
      },
      symbol: 'USDT',
      amountIn: 10,
      profit: 2000,
    },
    {
      direction: `loh 2`,
      from: {
        name: 'Coinbase',
        type: ArbitrageLocationType.EXCHANGE,
      },
      to: {
        name: 'Kraken',
        type: ArbitrageLocationType.EXCHANGE,
      },
      symbol: 'TRX',
      amountIn: 10,
      profit: 1000,
    },
    {
      direction: `loh 3`,
      from: {
        name: 'Coinbase',
        type: ArbitrageLocationType.EXCHANGE,
      },
      to: {
        name: 'Ethereum',
        type: ArbitrageLocationType.CHAIN,
      },
      symbol: 'TRX',
      amountIn: 10,
      profit: 1300,
    },
    {
      direction: `loh 4`,
      from: {
        name: 'Solana',
        type: ArbitrageLocationType.CHAIN,
      },
      to: {
        name: 'Kraken',
        type: ArbitrageLocationType.EXCHANGE,
      },
      symbol: 'TRX',
      amountIn: 10,
      profit: -1000,
    },
    {
      direction: `loh 5`,
      from: {
        name: 'Huobi',
        type: ArbitrageLocationType.EXCHANGE,
      },
      to: {
        name: 'Kraken',
        type: ArbitrageLocationType.EXCHANGE,
      },
      symbol: 'ETH',
      amountIn: 10,
      profit: 4000,
    },
    {
      direction: `loh 6`,
      from: {
        name: 'Solana',
        type: ArbitrageLocationType.CHAIN,
      },
      to: {
        name: 'Binance',
        type: ArbitrageLocationType.EXCHANGE,
      },
      symbol: 'DOGE',
      amountIn: 35,
      profit: 2000,
    }
  ]
}
