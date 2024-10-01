import {Injectable} from '@angular/core';
import {
  ArbitrageData,
  ArbitrageLocationType,
  ArbitrageNodeData, GraphLinkObject,
  GraphNodeObject,
  NodeGroup,
  ParentData
} from "./arbitrage-graph.model";

@Injectable({
  providedIn: 'root'
})
export class ArbitrageGraphService {
  private _nodesMap = new Map<(string | number), GraphNodeObject>()
  get nodesMap() {
    return this._nodesMap;
  }
  private _nodesConnectionsMap = new Map<(string | number), Set<(string | number)>>()
  get nodesConnectionsMap() {
    return this._nodesConnectionsMap;
  }
  private _linksMap = new Map<(string | number), GraphLinkObject[]>()
  get linksMap() {
    return this._linksMap;
  }
  private _symbolNodesSet = new Set<string | number>()
  get symbolNodesSet() {
    return this._symbolNodesSet;
  }

  private _arbNodesSet = new Set<string | number>()
  get arbNodesSet() {
    return this._arbNodesSet;
  }

  private _flickerInterval = 1000;
  get flickerInterval() {
    return this._flickerInterval;
  }
  private _nodesFlickerStartTimes = new Map<string | number, number>();
  get nodesFlickerStartTimes() {
    return this._nodesFlickerStartTimes;
  }

  private _nodeLifeTime = 50000;

  constructor() { }

  handleArbitrageEvent(data: ArbitrageData, nodes: GraphNodeObject[]): {nodes: GraphNodeObject[], links: GraphLinkObject[]} {
    const { direction, amountIn, profit, from, to, symbol, createdAt } = data;

    let maxAbsProfit = Math.abs(profit);

    nodes.forEach(node => {
      if (node.group === NodeGroup.ARBITRAGE) {
        const nodeProfit = Math.abs((node.data as ArbitrageNodeData).profit);
        maxAbsProfit = Math.max(maxAbsProfit, nodeProfit);
      }
    });

    const minNodeSize = 5;
    const maxNodeSize = 40;

    nodes.forEach(node => {
      if (node.group === NodeGroup.ARBITRAGE) {
        const nodeSize = (Math.abs((node.data as ArbitrageData).profit) / maxAbsProfit) * maxNodeSize;
        node.size = Math.max(nodeSize, minNodeSize);

        node.fx = node.x;
        node.fy = node.y;
      }
    });

    let arbNodeSize = (Math.abs(profit) / maxAbsProfit) * maxNodeSize;
    arbNodeSize = Math.max(arbNodeSize, minNodeSize);

    const arbNode: GraphNodeObject<ArbitrageData> = {
      id: `arb-${createdAt}`,
      label: `
        <b>$${profit}</b><br><br>
        from: ${from.name} ${from.type}<br>
        to: ${to.name} ${to.type}<br>
        amount: ${amountIn} ${symbol} <br><br>
        ${direction}
      `,
      group: NodeGroup.ARBITRAGE,
      color: profit > 0 ? 'green' : 'red',
      size: arbNodeSize,
      data,
      createdAt: createdAt,
    };

    this._nodesMap.set(arbNode.id, arbNode)
    this._arbNodesSet.add(arbNode.id);

    const fromNodeGroup = from.type === ArbitrageLocationType.EXCHANGE ? NodeGroup.EXCHANGE : NodeGroup.CHAIN
    const toNodeGroup = to.type === ArbitrageLocationType.EXCHANGE ? NodeGroup.EXCHANGE : NodeGroup.CHAIN

    const fromParent = this.getParentNodeOrCreate(from.name, fromNodeGroup, arbNode.id, nodes);
    const toParent = this.getParentNodeOrCreate(to.name, toNodeGroup, arbNode.id, nodes);
    const symbolParent = this.getParentNodeOrCreate(symbol, NodeGroup.SYMBOL, arbNode.id, nodes);

    const newNodes = [arbNode]

    if (fromParent.isNew) {
      newNodes.push(fromParent.node)
    }

    if (toParent.isNew) {
      newNodes.push(toParent.node)
    }

    if (symbolParent.isNew) {
      newNodes.push(symbolParent.node)
      this._symbolNodesSet.add(symbolParent.node.id);
    }

    const newLinks = this.createLinks(arbNode, fromParent.node, toParent.node, symbolParent.node)
    this._linksMap.set(arbNode.id, newLinks)

    return {
      links: newLinks,
      nodes: newNodes
    }
  }

  handleNodeFlickering(arbNodeId: string | number, lifetime = this._nodeLifeTime) {
    setTimeout(() => {
      this._nodesFlickerStartTimes.set(arbNodeId, Date.now());
    }, lifetime - this._flickerInterval * 3)
  }

  handleNodeLifetime(callbackFn: () => void, lifetime = this._nodeLifeTime) {
    setTimeout(() => {
      callbackFn();
    }, lifetime);
  }

  getFilteredNodesAndLinks(arbNodeId: string | number, nodes: GraphNodeObject[], links: GraphLinkObject[]): [GraphNodeObject[], GraphLinkObject[]] {
    this._arbNodesSet.delete(arbNodeId);
    this._nodesFlickerStartTimes.delete(arbNodeId);
    this._linksMap.delete(arbNodeId);

    const filteredNodes = nodes.reduce((filteredNodes, node) => {
      if (node.group === NodeGroup.ARBITRAGE) {
        if (node.id !== arbNodeId) {
          filteredNodes.push(node);
        } else {
          this._nodesMap.delete(node.id)
          this._nodesConnectionsMap.delete(node.id)
        }
      } else {
        const connections = [...this._nodesConnectionsMap.get(node.id)]
        const filteredConnections = connections.filter(connectedArbNodeId => connectedArbNodeId !== arbNodeId)

        if (filteredConnections.length > 0) {
          filteredNodes.push(node)

          this._nodesConnectionsMap.set(node.id, new Set(filteredConnections))
          const nodeWithFilteredArbs: GraphNodeObject<ParentData> = {
            ...this._nodesMap.get(node.id),
            data: {
              arbIds: new Set(filteredConnections)
            }
          }
          this._nodesMap.set(node.id, nodeWithFilteredArbs)
        }

        if (filteredConnections.length === 0) {
          this._nodesMap.delete(node.id)
          this._nodesConnectionsMap.delete(node.id)

          if (node.group === NodeGroup.SYMBOL) {
            this._symbolNodesSet.delete(node.id)
          }
        }
      }
      return filteredNodes;
    }, []);
    const filteredLinks = links.filter(link => link.source.group === NodeGroup.ARBITRAGE ? link.source.id !== arbNodeId : link.target.id !== arbNodeId);

    return [filteredNodes, filteredLinks];
  }

  private getParentNodeOrCreate(label: string, group: NodeGroup, arbNodeId: string | number, nodes: GraphNodeObject[]): {node: GraphNodeObject, isNew: boolean} {
    const id = `${label}-${group}`;

    let color: string;

    switch (group) {
      case NodeGroup.EXCHANGE:
        color = 'gold';
        break;
      case NodeGroup.CHAIN:
        color = 'pink';
        break;
      case NodeGroup.SYMBOL:
        color = 'lightblue';
        break;
    }

    let node = nodes.find(n => n.id === id);
    let isNew = false;

    if (!node) {
      node = {
        id,
        label,
        group,
        color,
        size: 50,
      };
      isNew = true;
    }

    node.data = {
      arbIds: new Set([...node.data?.arbIds || [], arbNodeId])
    }

    if (isNew) {
      this._nodesMap.set(node.id, node)
    }

    const nodeConnections = this._nodesConnectionsMap.get(node.id) || new Set([]);
    this._nodesConnectionsMap.set(node.id, new Set([...nodeConnections, arbNodeId]))

    const arbNodeConnections = this._nodesConnectionsMap.get(arbNodeId) || new Set([]);
    this._nodesConnectionsMap.set(arbNodeId, new Set([...arbNodeConnections, node.id]))

    return {node, isNew};
  }

  private createLinks(arbNode: GraphNodeObject, fromNode: GraphNodeObject, toNode: GraphNodeObject, symbolNode: GraphNodeObject): GraphLinkObject[] {
    let linksColor = 'lightgrey';
    if (fromNode.group === NodeGroup.EXCHANGE && toNode.group === NodeGroup.CHAIN) {
      linksColor = 'blue';
    }

    if (fromNode.group === NodeGroup.CHAIN && toNode.group === NodeGroup.EXCHANGE) {
      linksColor = 'red';
    }

    if (fromNode.group === NodeGroup.EXCHANGE && toNode.group === NodeGroup.EXCHANGE) {
      linksColor = 'gold';
    }

    if (fromNode.group === NodeGroup.CHAIN && toNode.group === NodeGroup.CHAIN) {
      linksColor = 'green';
    }

    const linkFrom: GraphLinkObject = { id: `link-from-${arbNode.createdAt}`, source: fromNode, target: arbNode, color: linksColor}
    const linkTo: GraphLinkObject = { id: `link-to-${arbNode.createdAt}`, source: arbNode, target: toNode, color: linksColor}
    const linkSymbol: GraphLinkObject = { id: `link-symbol-${arbNode.createdAt}`, source: arbNode, target: symbolNode, color: 'lightgrey'}

    return [linkFrom, linkTo, linkSymbol]
  }
}
