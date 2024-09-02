import { TestBed } from '@angular/core/testing';

import { ArbitrageGraphService } from './arbitrage-graph.service';

describe('ArbitrageGraphService', () => {
  let service: ArbitrageGraphService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ArbitrageGraphService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
