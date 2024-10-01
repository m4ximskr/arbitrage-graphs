import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {Subscription} from "rxjs";
import {ArbitrageGraphService} from "../../shared/components/arbitrage-graph/arbitrage-graph.service";
import {GraphLinkObject, GraphNodeObject} from "../../shared/components/arbitrage-graph/arbitrage-graph.model";
import { ArbitrageDataService } from '../../shared/data/arbitrage-data.service';

@Component({
  selector: 'app-real-time-arbitrage',
  templateUrl: './real-time-arbitrage.component.html',
  styleUrl: './real-time-arbitrage.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RealTimeArbitrageComponent {
  areEventsFiring = false;

  graphNodes = signal<GraphNodeObject[]>([]);
  graphLinks = signal<GraphLinkObject[]>([]);

  private mockArbitrageDataEventsSubscription: Subscription;

  constructor(
    private arbitrageGraphService: ArbitrageGraphService,
    private arbitrageDataService: ArbitrageDataService,
  ) {
  }

  toggleArbitrageGraph() {
    this.areEventsFiring = !this.areEventsFiring;
    if (this.areEventsFiring) {
      this.mockArbitrageDataEventsSubscription = this.arbitrageDataService.listenForMockArbitrageDataEvents().subscribe(data => {
        const {nodes, links} = this.arbitrageGraphService.handleArbitrageEvent(data, this.graphNodes())
        this.graphNodes.update((value) => [...value, ...nodes])
        this.graphLinks.update((value) => [...value, ...links])

        const arbNode = nodes[0]

        this.arbitrageGraphService.handleNodeFlickering(arbNode.id, 7000)
        
        this.arbitrageGraphService.handleNodeLifetime(() => {
          const [filteredNodes, filteredLinks] = this.arbitrageGraphService.getFilteredNodesAndLinks(arbNode.id, this.graphNodes(), this.graphLinks())
          this.graphNodes.set(filteredNodes);
          this.graphLinks.set(filteredLinks);
        }, 7000)
      })
    } else {
      this.mockArbitrageDataEventsSubscription.unsubscribe();
    }
  }
}
