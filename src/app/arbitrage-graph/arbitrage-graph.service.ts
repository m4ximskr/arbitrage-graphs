import {Injectable} from '@angular/core';
import {ArbitrageGraphFilters, ArbitrageNodeData} from "./arbitrage-graph.model";
import {Params} from "@angular/router";

@Injectable({
  providedIn: 'root'
})
export class ArbitrageGraphService {

  private graphFilters: ArbitrageGraphFilters = {
    cexes: [],
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

    this.graphFilters.cexes = prepareArrayValues(params['cexes'] || [])
    this.graphFilters.chains = prepareArrayValues(params['chains'] || [])
    this.graphFilters.symbols = prepareArrayValues(params['symbols'] || [])
    this.graphFilters.profitFrom = prepareFloatValue(params['profit_from'])
    this.graphFilters.profitTo = prepareFloatValue(params['profit_to'])
  }

  filterArbitrageNodeData(arbNodeData: ArbitrageNodeData[]): boolean {
    let includesCexes = false;
    let includesChains = false;
    let includesSymbols = false;
    let includesArbNodeByProfit = false;
    let includesArbNodeByAmount = false;

    const {cexes, chains, symbols, profitFrom, profitTo, amountFrom, amountTo} = this.graphFilters

    arbNodeData.forEach((arbData) => {
      if (cexes.length > 0) {
        if (!includesCexes) {
          includesCexes = cexes.some(cex => {
            return arbData.pairs.map(pair => pair.cex).some(cexInArb => cexInArb.toLowerCase().includes(cex.toLowerCase()))
          })
        }
      } else {
        includesCexes = true
      }

      if (chains.length > 0) {
        if (!includesChains) {
          includesChains = chains.some(chain => {
            return arbData.pairs.map(pair => pair.chain).some(chainInArb => chainInArb.toLowerCase().includes(chain.toLowerCase()))
          })
        }
      } else {
        includesChains = true
      }

      if (symbols.length > 0) {
        if (!includesSymbols) {
          includesSymbols = symbols.some(symbol => {
            return arbData.pairs.map(pair => pair.symbol).some(symbolInArb => symbolInArb.toLowerCase().includes(symbol.toLowerCase()))
          })
        }
      } else {
        includesSymbols = true;
      }

      if (!isNaN(profitFrom) || !isNaN(profitTo)) {
        if (!includesArbNodeByProfit) {
          if (!isNaN(profitFrom) && isNaN(profitTo)) {
            includesArbNodeByProfit = arbData.profit >= profitFrom
          } else if (isNaN(profitFrom) && !isNaN(profitTo)) {
            includesArbNodeByProfit = arbData.profit <= profitTo
          } else {
            includesArbNodeByProfit = arbData.profit >= profitFrom && arbData.profit <= profitTo
          }
        }
      } else {
        includesArbNodeByProfit = true;
      }

      if (!isNaN(amountFrom) || !isNaN(amountTo)) {
        if (!includesArbNodeByAmount) {
          if (!isNaN(amountFrom) && isNaN(amountTo)) {
            includesArbNodeByAmount = arbData.amount >= amountFrom
          } else if (isNaN(amountFrom) && !isNaN(amountTo)) {
            includesArbNodeByAmount = arbData.amount <= amountTo
          } else {
            includesArbNodeByAmount = arbData.amount >= amountFrom && arbData.amount <= amountTo
          }
        }
      } else {
        includesArbNodeByAmount = true;
      }

    })

    return includesCexes && includesChains && includesSymbols && includesArbNodeByProfit && includesArbNodeByAmount
  }
}
