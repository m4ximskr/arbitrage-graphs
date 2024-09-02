import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
} from '@angular/core';

import ForceGraph, {ForceGraphInstance, LinkObject} from 'force-graph';
import {forceCenter, forceCollide, forceLink} from 'd3-force';
import {ActivatedRoute} from "@angular/router";
import {
  ArbitrageNodeData,
  ArbitragePair,
  GraphNodeObject,
  NodeGroup,
} from "./arbitrage-graph.model";
import {ArbitrageGraphService} from "./arbitrage-graph.service";
import {generateRandomArbitrage} from "../data/mock-arbitrage-data";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

@Component({
  selector: 'app-arbitrage-graph',
  templateUrl: './arbitrage-graph.component.html',
  styleUrl: './arbitrage-graph.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArbitrageGraphComponent implements AfterViewInit {
  areEventsFiring = false;

  private dataSimulationInterval;

  private graph: ForceGraphInstance;
  private nodes: GraphNodeObject[] = []
  private links: LinkObject[] = []

  private nodesConnectionsMap = new Map<(string | number), Set<(string | number)>>()
  private nodesMap = new Map<(string | number), GraphNodeObject>()

  private nodeLifeTimeInMilliseconds = 10000;

  constructor(
    private elementRef: ElementRef,
    private activatedRoute: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private arbitrageGraphService: ArbitrageGraphService,
    private destroyRef: DestroyRef,
) {}

  ngAfterViewInit() {
    this.initializeGraph();
    this.listenToFilterChanges();
  }

  toggleArbitrageGraph() {
    this.areEventsFiring = !this.areEventsFiring;
    if (this.areEventsFiring) {
      this.startDataSimulation()
    } else {
      clearInterval(this.dataSimulationInterval)
    }
  }
  private startDataSimulation() {
    this.dataSimulationInterval = setInterval(() => {
      const data = generateRandomArbitrage();
      this.handleNewArbitrage(data);
    }, 1000);
  }

  private handleNewArbitrage(data: ArbitrageNodeData) {
    const { pairs, amount, profit } = data;

    let maxAbsProfit = Math.abs(profit);

    this.nodes.forEach(node => {
      if (node.group === NodeGroup.ARBITRAGE) {
        const nodeProfit = Math.abs((node.data as ArbitrageNodeData).profit);
        maxAbsProfit = Math.max(maxAbsProfit, nodeProfit);
      }
    });

    const minNodeSize = 5;
    const maxNodeSize = 25;

    let arbNodeSize = (Math.abs(profit) / maxAbsProfit) * maxNodeSize;
    arbNodeSize = Math.max(arbNodeSize, minNodeSize);

    const arbNode: GraphNodeObject<ArbitrageNodeData> = {
      id: `arb-${Date.now()}`,
      label: `
        $${profit} <br>
        ${pairs.map(p => p.symbol).join(' -> ')} <br>
        ${amount} tokens <br>
        ${pairs.map(p => p.chain).join(' -> ')} <br>
         ${pairs.map(p => p.cex).join(' -> ')}
      `,
      group: NodeGroup.ARBITRAGE,
      color: profit > 0 ? 'green' : 'red',
      size: arbNodeSize,
      data
    };

    this.nodes.forEach(node => {
      if (node.group === NodeGroup.ARBITRAGE) {
        const nodeSize = (Math.abs((node.data as ArbitrageNodeData).profit) / maxAbsProfit) * maxNodeSize;
        node.size = Math.max(nodeSize, minNodeSize);
      }
    });

    this.nodes.push(arbNode);
    this.nodesConnectionsMap.set(arbNode.id, new Set([]))
    this.nodesMap.set(arbNode.id, arbNode)

    pairs.forEach(pair => {
      const cexNode = this.getParentNodeOrCreate(pair, NodeGroup.CEX, arbNode.id);
      const chainNode = this.getParentNodeOrCreate(pair, NodeGroup.CHAIN, arbNode.id);
      const symbolNode = this.getParentNodeOrCreate(pair, NodeGroup.SYMBOL, arbNode.id);

      const arbNodeConnections = this.nodesConnectionsMap.get(arbNode.id);
      this.nodesConnectionsMap.set(arbNode.id, new Set([...arbNodeConnections, cexNode.id, chainNode.id, symbolNode.id]))

      this.links.push({ source: arbNode.id, target: cexNode.id });
      this.links.push({ source: arbNode.id, target: chainNode.id });
      this.links.push({ source: arbNode.id, target: symbolNode.id });
    })

    this.updateGraph();
    this.handleNodeLifetime(arbNode)
  }

  private handleNodeLifetime(arbNode: GraphNodeObject) {
    setTimeout(() => {
      this.nodes = this.nodes.reduce((filteredNodes, node) => {
        if (node.group === NodeGroup.ARBITRAGE) {
          if (node.id !== arbNode.id) {
            filteredNodes.push(node);
          }
        } else {
          const connections = [...this.nodesConnectionsMap.get(node.id)]
          const filteredConnections = connections.filter(arbNodeId => arbNodeId !== arbNode.id)
          if (filteredConnections.length > 0) {
            filteredNodes.push(node)
          }
          this.nodesConnectionsMap.set(node.id, new Set(filteredConnections))
        }
        return filteredNodes;
      }, []);
      this.links = this.links.filter(link => (link.source as GraphNodeObject).id !== arbNode.id);
      this.updateGraph();
    }, this.nodeLifeTimeInMilliseconds);
  }

  private updateGraph() {
    this.graph.graphData({ nodes: this.nodes, links: this.links });
  }

  private getParentNodeOrCreate(pair: ArbitragePair, group: NodeGroup, arbNodeId: string | number): GraphNodeObject {
    let id, color: string;

    switch (group) {
      case NodeGroup.CEX:
        id = pair.cex;
        color = 'gold';
        break;
      case NodeGroup.CHAIN:
        id = pair.chain;
        color = 'pink';
        break;
      case NodeGroup.SYMBOL:
        id = pair.symbol;
        color = 'lightblue';
        break;
    }

    let node: GraphNodeObject = this.nodes.find(n => n.id === id);

    if (!node) {
      node = {
        id,
        group,
        color,
        label: id,
        size: 50,
      };
      this.nodes.push(node);
      this.nodesMap.set(node.id, node)
    }

    const nodeConnections = this.nodesConnectionsMap.get(node.id) || new Set([]);
    this.nodesConnectionsMap.set(node.id, new Set([...nodeConnections, arbNodeId]))

    return node;
  }

  private initializeGraph() {
    this.graph = ForceGraph()(this.elementRef.nativeElement.querySelector('#graph'))
      .graphData({ nodes: this.nodes, links: this.links })
      .nodeLabel('label')
      .nodeColor((node: GraphNodeObject) => node.color || 'blue')
      .nodeVal((node: GraphNodeObject) => node.size)
      .nodeCanvasObjectMode(() => 'after')
      .nodeCanvasObject((node: GraphNodeObject, ctx) => {
        ctx.font = '8px Sans-Serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'black';

        if (node.group === NodeGroup.ARBITRAGE) {
          const profit = node.data.profit
          if (profit > 0 && node.size > 20) {
            ctx.fillText(`$${profit}`, node.x, node.y);
          }
        } else {
          ctx.fillText(`${node.label}`, node.x, node.y);
        }
      })
      .nodeVisibility((node: GraphNodeObject) => this.checkVisibility(node))
      .linkVisibility((link: LinkObject) => this.checkVisibility(link.source as GraphNodeObject))
      .d3Force('collide', forceCollide().radius((r) => Math.max(r.size / 2 + 5, 25)))
      .d3Force('center', forceCenter().strength(1))
      .d3Force('link', forceLink().strength((link) => 0.1).distance(() => 300))
  }

  private checkVisibility(node: GraphNodeObject) {
    let arbNodeData;
    if (node.group !== NodeGroup.ARBITRAGE) {
      const connections = this.nodesConnectionsMap.get(node.id)
      const nodesIds = [...this.nodesConnectionsMap.keys()];
      const filteredNodesIds = nodesIds.filter(nodeId => [...connections].includes(nodeId))
      arbNodeData = filteredNodesIds.flatMap((nodeId) => this.nodesMap.get(nodeId).data)
    } else {
      arbNodeData = [node.data]
    }

    return this.arbitrageGraphService.filterArbitrageNodeData(arbNodeData)
  }

  private listenToFilterChanges() {
    this.activatedRoute.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.arbitrageGraphService.updateGraphFilters(params);
      this.updateGraph();
    })
  }
}
