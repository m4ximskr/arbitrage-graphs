import {Injectable} from "@angular/core";
import {HttpClient} from "@angular/common/http";
import {interval, map, Observable, switchMap, take} from "rxjs";
import {ArbitrageData, ArbitrageLocationType} from "../arbitrage-graph/arbitrage-graph.model";

@Injectable({
  providedIn: 'root',
})
export class ArbitrageDataService {

  private jsonUrl = 'dex-cex-data.json';
  constructor(private http: HttpClient) {}

  listenForMockArbitrageDataEvents(intervalTime = 1000): Observable<ArbitrageData> {
    return this.http.get<ArbitrageData[]>(this.jsonUrl).pipe(
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
            }
          } as ArbitrageData
        })
      ))
    );
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
}
