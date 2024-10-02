import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewChild,
} from '@angular/core';

import ForceGraph, {ForceGraphInstance} from 'force-graph';
import {forceCollide, forceLink, forceX, forceY} from 'd3-force';
import {ActivatedRoute} from "@angular/router";
import {
  ArbitrageData,
  ArbitrageLocationType,
  ArbitrageNodeData,
  GraphLinkObject,
  GraphNodeObject,
  NodeGroup,
  NodePositionsByGroup, ParentData,
} from "./arbitrage-graph.model";
import {ArbitrageGraphService} from "./arbitrage-graph.service";
import {generateRandomArbitrage} from "../data/mock-arbitrage-data";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";
import {ArbitrageDataService} from "../data/arbitrage-data.service";
import {Subscription} from "rxjs";

@Component({
  selector: 'app-arbitrage-graph',
  templateUrl: './arbitrage-graph.component.html',
  styleUrl: './arbitrage-graph.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArbitrageGraphComponent implements AfterViewInit {
  @ViewChild('graph', {static: true}) graphRef;
  areEventsFiring = false;

  private graph: ForceGraphInstance;
  private nodes: GraphNodeObject[] = []
  private links: GraphLinkObject[] = []

  private nodesMap = new Map<(string | number), GraphNodeObject>()
  private nodesConnectionsMap = new Map<(string | number), Set<(string | number)>>()
  private linksMap = new Map<(string | number), GraphLinkObject[]>()

  private highlightNodeIds = new Set<string | number>();
  private highlightLinkIds = new Set<string | number>();

  private randomDataSimulationInterval;
  private mockArbitrageDataEventsSubscription: Subscription;

  private nodePositionsByGroup: NodePositionsByGroup;

  private NODE_R = 4;

  private nodeLifeTime = 20000;
  private flickerInterval = 1000;
  private nodesFlickerStartTimes = new Map<string | number, number>();

  private symbolNodes = new Set<string | number>()

  private preparedCanvasWidth: number;
  private preparedCanvasHeight: number;

  constructor(
    private activatedRoute: ActivatedRoute,
    private arbitrageGraphService: ArbitrageGraphService,
    private destroyRef: DestroyRef,
    private arbitrageDataService: ArbitrageDataService,
) {}

  ngAfterViewInit() {
    this.prepareNodePositionsMap();
    this.initializeGraph();
    this.listenToFilterChanges();

  }

  toggleArbitrageGraph() {
    this.areEventsFiring = !this.areEventsFiring;
    if (this.areEventsFiring) {
      // this.startRandomDataSimulation();
      this.listenForMockArbitrageDataEvents();
    } else {
      // clearInterval(this.randomDataSimulationInterval)
      this.mockArbitrageDataEventsSubscription.unsubscribe();
    }
  }

  private listenForMockArbitrageDataEvents() {
    this.mockArbitrageDataEventsSubscription = this.arbitrageDataService.listenForMockArbitrageDataEvents().subscribe(data => {
      this.handleNewArbitrage(data);
    })
  }

  private startRandomDataSimulation() {
    this.randomDataSimulationInterval = setInterval(() => {
      const data = generateRandomArbitrage();
      this.handleNewArbitrage(data);
    }, 1000);
  }

  private handleNewArbitrage(data: ArbitrageData) {

    const { direction, amountIn, profit, from, to, symbol } = data;

    let maxAbsProfit = Math.abs(profit);

    this.nodes.forEach(node => {
      if (node.group === NodeGroup.ARBITRAGE) {
        const nodeProfit = Math.abs((node.data as ArbitrageNodeData).profit);
        maxAbsProfit = Math.max(maxAbsProfit, nodeProfit);
      }
    });

    const minNodeSize = 5;
    const maxNodeSize = 25;

    this.nodes.forEach(node => {
      if (node.group === NodeGroup.ARBITRAGE) {
        const nodeSize = (Math.abs((node.data as ArbitrageData).profit) / maxAbsProfit) * maxNodeSize;
        node.size = Math.max(nodeSize, minNodeSize);
      }
    });

    let arbNodeSize = (Math.abs(profit) / maxAbsProfit) * maxNodeSize;
    arbNodeSize = Math.max(arbNodeSize, minNodeSize);

    const currentTimestamp = Date.now()

    const arbNode: GraphNodeObject<ArbitrageData> = {
      id: `arb-${currentTimestamp}`,
      label: `
        $${profit}<br>
        from: ${from.name} ${from.type}<br>
        to: ${to.name} ${to.type}<br>
        amount: ${amountIn} ${symbol} <br><br>
        ${direction}
      `,
      group: NodeGroup.ARBITRAGE,
      color: profit > 0 ? 'green' : 'red',
      size: arbNodeSize,
      data,
      createdAt: currentTimestamp,
    };


    this.nodes.push(arbNode);
    this.nodesMap.set(arbNode.id, arbNode)

    const fromNodeGroup = from.type === ArbitrageLocationType.EXCHANGE ? NodeGroup.EXCHANGE : NodeGroup.CHAIN
    const toNodeGroup = to.type === ArbitrageLocationType.EXCHANGE ? NodeGroup.EXCHANGE : NodeGroup.CHAIN

    const fromNode = this.getParentNodeOrCreate(from.name, fromNodeGroup, arbNode.id);
    const toNode = this.getParentNodeOrCreate(to.name, toNodeGroup, arbNode.id);
    const symbolNode = this.getParentNodeOrCreate(symbol, NodeGroup.SYMBOL, arbNode.id);

    this.symbolNodes.add(symbolNode.id);

    const arbNodeConnections = this.nodesConnectionsMap.get(arbNode.id) || new Set([]);
    this.nodesConnectionsMap.set(arbNode.id, new Set([...arbNodeConnections, fromNode.id, toNode.id, symbolNode.id]))

    const links = this.createLinks(arbNode, fromNode, toNode, symbolNode)

    this.linksMap.set(arbNode.id,links)

    this.updateGraph();

    this.handleNodeFlickering(arbNode)
    this.handleNodeLifetime(arbNode)
  }

  private handleNodeFlickering(arbNode: GraphNodeObject) {
    setTimeout(() => {
      this.nodesFlickerStartTimes.set(arbNode.id, Date.now());
    }, this.nodeLifeTime - this.flickerInterval * 3)
  }

  private handleNodeLifetime(arbNode: GraphNodeObject) {
    setTimeout(() => {
      this.nodes = this.nodes.reduce((filteredNodes, node) => {
        if (node.group === NodeGroup.ARBITRAGE) {
          if (node.id !== arbNode.id) {
            filteredNodes.push(node);
          } else {
            this.nodesMap.delete(node.id)
            this.nodesConnectionsMap.delete(node.id)
          }
        } else {
          const connections = [...this.nodesConnectionsMap.get(node.id)]
          const filteredConnections = connections.filter(arbNodeId => arbNodeId !== arbNode.id)

          if (filteredConnections.length > 0) {
            filteredNodes.push(node)

            this.nodesConnectionsMap.set(node.id, new Set(filteredConnections))
            const nodeWithFilteredArbs: GraphNodeObject<ParentData> = {
              ... this.nodesMap.get(node.id),
              data: {
                arbIds: new Set(filteredConnections)
              }
            }
            this.nodesMap.set(node.id, nodeWithFilteredArbs)
          }

          if (filteredConnections.length === 0) {
            this.nodesMap.delete(node.id)
            this.nodesConnectionsMap.delete(node.id)

            if (node.group === NodeGroup.SYMBOL) {
              this.symbolNodes.delete(node.id)
            }
          }

          this.nodesConnectionsMap.set(node.id, new Set(filteredConnections))
        }
        return filteredNodes;
      }, []);
      this.links = this.links.filter(link => link.source.group === NodeGroup.ARBITRAGE ? link.source.id !== arbNode.id : link.target.id !== arbNode.id);

      this.updateGraph();
      this.nodesFlickerStartTimes.delete(arbNode.id)
    }, this.nodeLifeTime);
  }

  private updateGraph() {
    this.graph.graphData({ nodes: this.nodes, links: this.links });
  }

  private getParentNodeOrCreate(label: string, group: NodeGroup, arbId: string | number): GraphNodeObject {
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

    let node = this.nodes.find(n => n.id === id);

    if (!node) {
      node = {
        id,
        label,
        group,
        color,
        size: 50,
      };
      this.nodes.push(node);
    }

    node.data = {
      arbIds: new Set([...node.data?.arbIds || [], arbId])
    }

    this.nodesMap.set(node.id, node)

    const nodeConnections = this.nodesConnectionsMap.get(node.id) || new Set([]);
    this.nodesConnectionsMap.set(node.id, new Set([...nodeConnections, arbId]))

    return node;
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

    const linkFrom: GraphLinkObject = { id: `link-0${Date.now()}`, source: fromNode, target: arbNode, color: linksColor}
    const linkTo: GraphLinkObject = { id: `link-1${Date.now()}`, source: arbNode, target: toNode, color: linksColor}
    const linkSymbol: GraphLinkObject = { id: `link-2${Date.now()}`, source: arbNode, target: symbolNode, color: 'lightgrey'}

    this.links.push(linkFrom);
    this.links.push(linkTo);
    this.links.push(linkSymbol);

    return [linkFrom, linkTo, linkSymbol]
  }

  private prepareNodePositionsMap() {
    setTimeout(() => {
      const canvas = this.graphRef.nativeElement.querySelector('canvas');

      const {width, height} = canvas

      this.preparedCanvasWidth = width / window.devicePixelRatio
      this.preparedCanvasHeight = height / window.devicePixelRatio

      this.nodePositionsByGroup = {
        [NodeGroup.EXCHANGE]: {x: -(this.preparedCanvasWidth / 2 - 100), y: -(this.preparedCanvasHeight / 2 - 100)},  // Top-left
        [NodeGroup.CHAIN]: {x: this.preparedCanvasWidth / 2 - 100, y: -(this.preparedCanvasHeight / 2 - 100)},   // Top-right
        [NodeGroup.SYMBOL]: {x: 0, y: this.preparedCanvasHeight / 2 - 50},    // Bottom
        [NodeGroup.ARBITRAGE]: {x: 0, y: -100}    // Center
      };
    }, 0)
  }

  private initializeGraph() {
    this.graph = ForceGraph()(this.graphRef.nativeElement)

    this.graph
      .graphData({ nodes: this.nodes, links: this.links })
      .nodeLabel('label')
      .nodeColor((node: GraphNodeObject) => node.color || 'blue')
      .nodeRelSize(this.NODE_R)
      .nodeVal((node: GraphNodeObject) => node.size)
      .nodeCanvasObjectMode(() => 'after')
      .nodeCanvasObject((node: GraphNodeObject, ctx: CanvasRenderingContext2D) => this.createNodeCanvasObject(node, ctx))
      .linkCanvasObjectMode(() => 'replace')
      .linkCanvasObject((link: GraphLinkObject, ctx: CanvasRenderingContext2D) => this.createLinkCanvasObject(link, ctx))
      .nodeVisibility((node: GraphNodeObject) => this.checkVisibility(node))
      .linkVisibility((link: GraphLinkObject) => this.checkVisibility(link.source.group === NodeGroup.ARBITRAGE ? link.source : link.target))
      .d3Force('collide', forceCollide()
        .radius((node: GraphNodeObject) => Math.sqrt(node.size) * this.NODE_R + (node.group === NodeGroup.ARBITRAGE ? 30 : 10))
        .strength(1)
        .iterations(100)
      )
      .d3Force('link', forceLink().strength(0).distance(1000))
      .linkWidth((link: GraphLinkObject) => this.highlightLinkIds.has(link.id) ? 5 : 1)
      .linkDirectionalArrowLength((link: GraphLinkObject) => link.target.group !== NodeGroup.SYMBOL ? 15 : 0)
      .linkDirectionalArrowRelPos(1)
      .linkDirectionalParticles(5)
      .linkDirectionalParticleWidth((link: GraphLinkObject) => link.target.group !== NodeGroup.SYMBOL && this.highlightLinkIds.has(link.id) ? 10 : 0)
      .onNodeHover((node: GraphNodeObject) => this.handleNodeHover(node))
      .d3Force('x', forceX(node => {
        /**
         * Spreading SYMBOL nodes by x-axis
         */
          if (node.group === NodeGroup.SYMBOL) {
            if (this.symbolNodes.size === 1) {
              return 0;
            }
            const index = [...this.symbolNodes].indexOf(node.id)
            const margin = this.preparedCanvasWidth / 10;
            const availableWidth = this.preparedCanvasWidth - margin * 2;
            const spreadRange = Math.min(availableWidth, this.symbolNodes.size * 70);
            return ((index / (this.symbolNodes.size - 1)) * 2 - 1) * (spreadRange / 2);
          } else {
            return this.nodePositionsByGroup[node.group].x;
          }
        })
        .strength(0.1)
      )
      .d3Force('y', forceY(node => this.nodePositionsByGroup[node.group].y).strength(0.1))
      .d3Force('center', null)
      .zoom(0.9)
      .autoPauseRedraw(false)
      .cooldownTicks(100).onEngineStop(() => {
        this.nodes.forEach(node => {
          if (node.group === NodeGroup.ARBITRAGE) {
            node.fx = node.x;
            node.fy = node.y;
          }
        });
    })
  }

  private createNodeCanvasObject(node: GraphNodeObject, ctx: CanvasRenderingContext2D) {
    const radius = Math.sqrt(node.size) * this.NODE_R;

    const currentTimestamp = Date.now();
    const flickerStartTime = this.nodesFlickerStartTimes.get(node.id);

    /**
     * Adding flickering effect for arb nodes that will expire soon
     */
    if (flickerStartTime) {
      const elapsedTime =  currentTimestamp - flickerStartTime;
      const phase = (elapsedTime % this.flickerInterval) / this.flickerInterval;
      const opacity = 0.8 * (0.5 + 0.5 * Math.sin(2 * Math.PI * phase));

      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
      ctx.fill();
    }

    ctx.font = '8px Sans-Serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'black';

    /**
     * Adding appropriate label text for each node
     */
    if (node.group === NodeGroup.ARBITRAGE) {
      const profit = node.data.profit;
      if (profit > 0) {
        ctx.fillText(`$${profit}`, node.x, node.y);
      }
    } else {
      ctx.fillText(`${node.label}`, node.x, node.y);
    }

    if (this.highlightNodeIds.has(node.id)) {
      /**
       * Adding stroke effect for nodes that are highlighted
       */

      const lineWidth = 5
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + lineWidth / 2, 0, 2 * Math.PI, false);
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = 'black'
      ctx.stroke();

      if (node.group === NodeGroup.ARBITRAGE) {
        /**
         * Adding elapsed seconds counter for arb node that is highlighted
         */

        const elapsedTime = currentTimestamp - node.createdAt;
        const elapsedSeconds = Math.floor(elapsedTime / 1000);
        const seconds = elapsedSeconds % 60;

        ctx.font = 'bold 20px Sans-Serif';
        ctx.fillText(`${seconds}s`, node.x, node.y - radius - 20);
      }
    } else if (this.highlightNodeIds.size > 0) {

      /**
       * Adding overlay effect for nodes that are node highlighted
       */
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
      ctx.fill();
    }
  }

  private createLinkCanvasObject(link: GraphLinkObject, ctx: CanvasRenderingContext2D) {
    if (this.highlightLinkIds.has(link.id)) {
      ctx.lineWidth = 5;
      ctx.globalAlpha = 1;
    } else if (this.highlightLinkIds.size > 0) {
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4;
    } else {
      ctx.lineWidth = 1;
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = link.color;
    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.stroke();
  }

  private handleNodeHover(node: GraphNodeObject) {
    this.highlightNodeIds.clear();
    this.highlightLinkIds.clear();

    if (node?.group === NodeGroup.ARBITRAGE) {
      const nodeIds = [...this.nodesConnectionsMap.get(node.id), node.id]
      nodeIds.forEach(nodeId => this.highlightNodeIds.add(nodeId))
      const links = this.linksMap.get(node.id)
      links.forEach(link => this.highlightLinkIds.add(link.id));
    }
  }

  private checkVisibility(node: GraphNodeObject): boolean {
    let connectedArbNodes: GraphNodeObject[];
    let connectedParentNodes: GraphNodeObject[];

    if (node.group !== NodeGroup.ARBITRAGE) {
      const connectedArbIds = this.nodesConnectionsMap.get(node.id)
      connectedArbNodes = [...connectedArbIds].map(connectedArbId => this.nodesMap.get(connectedArbId))

      const connectedParentNodeIds = new Set([...connectedArbIds].flatMap(connectedArbId => [...this.nodesConnectionsMap.get(connectedArbId)]))
      connectedParentNodes = [...connectedParentNodeIds].map(connectedParentNodeId => this.nodesMap.get(connectedParentNodeId))
    } else {
      connectedArbNodes = [node]
      const connectedParentNodeIds = this.nodesConnectionsMap.get(node.id)
      connectedParentNodes = [...connectedParentNodeIds].map(connectedParentNodeId => this.nodesMap.get(connectedParentNodeId))
    }
    return this.arbitrageGraphService.filterArbitrageNodeData(connectedArbNodes, connectedParentNodes, node)
  }

  private listenToFilterChanges() {
    this.activatedRoute.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.arbitrageGraphService.updateGraphFilters(params);
      this.updateGraph();
    })
  }
}
