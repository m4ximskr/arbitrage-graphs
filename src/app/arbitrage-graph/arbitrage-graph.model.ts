import {NodeObject} from "force-graph";

export enum NodeGroup {
  ARBITRAGE = 'arbitrage',
  CEX = 'cex',
  CHAIN = 'chain',
  SYMBOL = 'symbol',
}

export interface GraphNodeObject<D = any> extends NodeObject {
  group: NodeGroup;
  color: string;
  label: string;
  size: number;
  data?: D
}

export interface ArbitragePair {
  symbol: string;
  cex: string;
  chain: string
}

export interface ArbitrageNodeData {
  profit: number;
  amount: number;
  pairs: ArbitragePair[];
}

export interface ArbitrageGraphFilters {
  cexes: string[];
  chains: string[];
  symbols: string[];
  profitFrom: number;
  profitTo: number;
  amountFrom: number;
  amountTo: number;
}
