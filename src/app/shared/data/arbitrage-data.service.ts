import {Injectable} from "@angular/core";
import {HttpClient} from "@angular/common/http";
import {interval, map, Observable, of, switchMap, take, tap} from "rxjs";
import {ArbitrageData, ArbitrageLocationType} from "../components/arbitrage-graph/arbitrage-graph.model";

@Injectable({
  providedIn: 'root',
})
export class ArbitrageDataService {

  private jsonUrl = 'dex-cex-data.json';

  private historicalArbitrageEvents: ArbitrageData[];
  constructor(private http: HttpClient) {}

  listenForMockArbitrageDataEvents(intervalTime = 1000): Observable<ArbitrageData> {
    return this.getArbitrageEvents().pipe(
      map(data => this.shuffleArray([...data])),
      switchMap((shuffledData: ArbitrageData[]) => interval(intervalTime).pipe(
        take(shuffledData.length),
        map(index => {
          const data = shuffledData[index]

          return {
            ...data,
            from: {
              ...data.from,
              type: this.parseArbitrageLocationType(data.from.type)
            },
            to: {
              ...data.to,
              type: this.parseArbitrageLocationType(data.to.type)
            },
            createdAt: Date.now(),
          } as ArbitrageData
        })
      ))
    );
  }

  getMockHistoricalArbitrageDataEvents(): Observable<ArbitrageData[]> {
    if (!this.historicalArbitrageEvents) {
      return this.getArbitrageEvents().pipe(
        map(events => {
          return events.map(event => ({
            ...event,
            from: {
              ...event.from,
              type: this.parseArbitrageLocationType(event.from.type)
            },
            to: {
              ...event.to,
              type: this.parseArbitrageLocationType(event.to.type)
            },
            createdAt: this.getRandomTimestampWithin24Hours(),
            lifetime: this.getRandomLifetime()
          }))
        }),
        tap(events => this.historicalArbitrageEvents = events)
      )
    } else {
      return of(this.historicalArbitrageEvents)
    }
  }

  private getArbitrageEvents() {
    return this.http.get<ArbitrageData[]>(this.jsonUrl)
  }

  private shuffleArray(array: any[]): any[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  private parseArbitrageLocationType(input: string): ArbitrageLocationType {
    const parts = input.split('.');
    const value = parts[1] as keyof typeof ArbitrageLocationType;
    return ArbitrageLocationType[value];
  }

  private getRandomTimestampWithin24Hours(): number {
    const now = Date.now();
    const last24Hours = now - (24 * 60 * 60 * 1000);
    return Math.floor((last24Hours + Math.random() * (now - last24Hours)) / 1000);
  }

  private getRandomLifetime(): number {
    const minLifetime = 300; // 5 min
    const maxLifetime = 6000; // 10 min
    return Math.floor(minLifetime + Math.random() * (maxLifetime - minLifetime));
  }
}
