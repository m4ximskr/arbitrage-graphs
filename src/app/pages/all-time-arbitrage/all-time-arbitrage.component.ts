import { Component, signal} from '@angular/core';
import {FormControl} from "@angular/forms";
import { lastValueFrom, throttleTime} from "rxjs";
import {GraphLinkObject, GraphNodeObject} from "../../shared/components/arbitrage-graph/arbitrage-graph.model";
import {ArbitrageGraphService} from "../../shared/components/arbitrage-graph/arbitrage-graph.service";
import {ArbitrageDataService} from "../../shared/data/arbitrage-data.service";

@Component({
  selector: 'app-all-time-arbitrage',
  templateUrl: './all-time-arbitrage.component.html',
  styleUrl: './all-time-arbitrage.component.scss'
})
export class AllTimeArbitrageComponent {

  graphNodes = signal<GraphNodeObject[]>([]);
  graphLinks = signal<GraphLinkObject[]>([]);

  maxTime = 24 * 3600;
  startTimestamp = Math.floor(Date.now() / 1000) - this.maxTime;

  timelineFormControl = new FormControl();

  constructor(
    private arbitrageGraphService: ArbitrageGraphService,
    private arbitrageDataService: ArbitrageDataService,
  ) {
    this.timelineFormControl.valueChanges.pipe(throttleTime(100)).subscribe(async (currentTimestamp) => {
      const arbitrageEvents = await lastValueFrom(this.arbitrageDataService.getMockHistoricalArbitrageDataEvents());

      const filteredArbitrageEvents = arbitrageEvents.filter(arbitrageEvent => {
        const arbitrageEventEnd = arbitrageEvent.createdAt + arbitrageEvent.lifetime;
        return currentTimestamp >= arbitrageEvent.createdAt && currentTimestamp <= arbitrageEventEnd
      })

      const arbIdsToDelete = [...this.arbitrageGraphService.arbNodesSet].filter(arbNodeId => !filteredArbitrageEvents.some(arbEvent => `arb-${arbEvent.createdAt}` === arbNodeId))

      let filteredNodes = this.graphNodes();
      let filteredLinks = this.graphLinks();

      arbIdsToDelete.forEach(arbId => {
        [filteredNodes, filteredLinks] = this.arbitrageGraphService.getFilteredNodesAndLinks(arbId, filteredNodes, filteredLinks)
      })

      let updatedNodes = filteredNodes;
      let updatedLinks = filteredLinks;

      const arbitrageEventsToHandle = filteredArbitrageEvents.filter(arbEvent => !filteredNodes.some(node => node.id === `arb-${arbEvent.createdAt}`))

      if (arbitrageEventsToHandle.length > 0) {
        const preparedArbitrageEvents = arbitrageEventsToHandle.reduce(
          ({nodes, links}, arbitrageEvent) => {
            const { nodes: newNodes, links: newLinks } = this.arbitrageGraphService.handleArbitrageEvent(arbitrageEvent, nodes);

            return {
              nodes: [
                ...nodes,
                ...newNodes,
              ],
              links: [
                ...links,
                ...newLinks,
              ]
            };
          },
          {
            nodes: filteredNodes,
            links: filteredLinks,
          }
        );

        updatedNodes = preparedArbitrageEvents.nodes
        updatedLinks = preparedArbitrageEvents.links
      }

      this.graphNodes.set(updatedNodes)
      this.graphLinks.set(updatedLinks)
    })
  }
}
