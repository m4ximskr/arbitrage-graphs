import {Injectable} from '@angular/core';
import {ArbitrageData, ArbitrageGraphFilters, GraphNodeObject, NodeGroup, ParentData} from "./arbitrage-graph.model";
import {Params} from "@angular/router";
import {intersection} from "lodash";

@Injectable({
  providedIn: 'root'
})
export class ArbitrageGraphService {

  private graphFilters: ArbitrageGraphFilters = {
    exchanges: [],
    chains: [],
    symbols: [],
    profitFrom: undefined,
    profitTo: undefined,
    amountFrom: undefined,
    amountTo: undefined,
  };

  constructor() { }

  updateGraphFilters(params: Params) {
    const prepareArrayValues = (items) => {
      return Array.isArray(items) ? items : [items]
    }

    const prepareFloatValue = (value: string): number => {
      const parsedValue = parseFloat(value)
      return isNaN(parsedValue) ? undefined : parsedValue
    }

    this.graphFilters.exchanges = prepareArrayValues(params['exchanges'] || [])
    this.graphFilters.chains = prepareArrayValues(params['chains'] || [])
    this.graphFilters.symbols = prepareArrayValues(params['symbols'] || [])
    this.graphFilters.profitFrom = prepareFloatValue(params['profit_from'])
    this.graphFilters.profitTo = prepareFloatValue(params['profit_to'])
    this.graphFilters.amountFrom = prepareFloatValue(params['amount_from'])
    this.graphFilters.amountTo = prepareFloatValue(params['amount_to'])
  }

  filterArbitrageNodeData(connectedArbNodes: GraphNodeObject<ArbitrageData>[], connectedParentNodes: GraphNodeObject<ParentData>[], node: GraphNodeObject): boolean {
    const {exchanges, chains, symbols, profitFrom, profitTo, amountFrom, amountTo} = this.graphFilters;
    const includesByName = (label: string, filterValues: string[]) =>
      filterValues.some(filter => label.toLowerCase().includes(filter.toLowerCase()))

    const includesByRange = (value: number, min: number, max: number) =>
      (isNaN(min) || value >= min) && (isNaN(max) || value <= max);

    let includedExchangesArbIdsToCheck = new Set([]);
    let includedChainsArbIdsToCheck = new Set([]);
    let includedSymbolsArbIdsToCheck = new Set([]);

    connectedParentNodes.forEach(connectedParentNode => {
      if (connectedParentNode.group === NodeGroup.EXCHANGE) {
        if (exchanges.length > 0) {
          if (includesByName(connectedParentNode.label, exchanges)) {
            includedExchangesArbIdsToCheck = new Set([...includedExchangesArbIdsToCheck, ...connectedParentNode.data.arbIds])
          }
        }
      }

      if (connectedParentNode.group === NodeGroup.CHAIN) {
        if (chains.length > 0) {
          if (includesByName(connectedParentNode.label, chains)) {
            includedChainsArbIdsToCheck = new Set([...includedChainsArbIdsToCheck, ...connectedParentNode.data.arbIds])
          }
        }
      }

      if (connectedParentNode.group === NodeGroup.SYMBOL) {
        if (symbols.length > 0) {
          if (includesByName(connectedParentNode.label, symbols)) {
            includedSymbolsArbIdsToCheck = new Set([...includedSymbolsArbIdsToCheck, ...connectedParentNode.data.arbIds])
          }
        }
      }
    })

    const includesExchanges = exchanges.length === 0 || includedExchangesArbIdsToCheck.size > 0;
    const includesChains = chains.length === 0 || includedChainsArbIdsToCheck.size > 0;
    const includesSymbols = symbols.length === 0 || includedSymbolsArbIdsToCheck.size > 0;

    const includedByProfitAndAmountArbIdsToCheck = connectedArbNodes.reduce((arbIds, connectedArbNode) => {
      const {profit, amountIn} = connectedArbNode.data;

      if (includesByRange(profit, profitFrom, profitTo) && includesByRange(amountIn, amountFrom, amountTo)) {
        arbIds.add(connectedArbNode.id);
      }

      return arbIds;
    }, new Set([]));

    const includesArbNodeByProfitAndAmount = includedByProfitAndAmountArbIdsToCheck.size > 0;

    const currentNodeArbIds = node.group === NodeGroup.ARBITRAGE ? [node.id] : [...node.data.arbIds]

    const arbIdsIntersectionToCheck = [
      [...includedExchangesArbIdsToCheck],
      [...includedChainsArbIdsToCheck],
      [...includedSymbolsArbIdsToCheck],
      [...includedByProfitAndAmountArbIdsToCheck],
      currentNodeArbIds
    ].filter(arbIds => arbIds?.length > 0)

    if (arbIdsIntersectionToCheck.length > 1) {
      const arbIdsIntersections = intersection(...arbIdsIntersectionToCheck);
      return arbIdsIntersections.length > 0 && includesExchanges && includesChains && includesSymbols && includesArbNodeByProfitAndAmount;
    } else {
      return includesExchanges && includesChains && includesSymbols && includesArbNodeByProfitAndAmount
    }
  }
}
