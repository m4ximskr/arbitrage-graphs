import {LinkObject, NodeObject} from "force-graph";

export enum NodeGroup {
  ARBITRAGE = 'arbitrage',
  EXCHANGE = 'exchange',
  CHAIN = 'chain',
  SYMBOL = 'symbol',
}

export interface GraphNodeObject<D = any> extends NodeObject {
  group: NodeGroup;
  color: string;
  label: string;
  size: number;
  data?: D;
  isNew?: boolean;
}

export interface GraphLinkObject<D = any> extends LinkObject {
  id: string;
  source: GraphNodeObject<D>;
  target: GraphNodeObject<D>;
  color: string;
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

export enum ArbitrageLocationType {
  EXCHANGE = 'exchange',
  CHAIN = 'chain',
}

export interface ArbitrageLocation {
  name: string;
  type: ArbitrageLocationType
}

export interface ArbitrageData {
  direction: string;
  from: ArbitrageLocation
  to: ArbitrageLocation
  symbol: string,
  amountIn: number;
  profit: number;
}

export interface ParentData {
  arbIds: Set<string | number>;
}

export interface ArbitrageGraphFilters {
  exchanges: string[];
  chains: string[];
  symbols: string[];
  profitFrom: number;
  profitTo: number;
  amountFrom: number;
  amountTo: number;
}

export type NodePositionsByGroup = {
  [key in NodeGroup]: {x: number, y: number};
}
