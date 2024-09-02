import {Component, DestroyRef, OnInit} from '@angular/core';
import {FormBuilder, FormControl, FormGroup} from "@angular/forms";
import {ActivatedRoute, Router} from "@angular/router";
import {ChipFilterValue} from "./filters/chip-filter/chip-filter.component";
import {RangeFilterValue} from "./filters/range-filter/range-filter.component";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

interface FiltersForm {
  cexes: FormControl<ChipFilterValue[]>;
  chains: FormControl<ChipFilterValue[]>;
  symbols: FormControl<ChipFilterValue[]>;
  profit: FormControl<RangeFilterValue>;
  amount: FormControl<RangeFilterValue>;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  filtersForm: FormGroup<FiltersForm>;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private destroyRef: DestroyRef,
  ) {
    this.filtersForm = this.fb.group({
      cexes: [],
      chains: [],
      symbols: [],
      profit: [],
      amount: [],
    })
  }

  ngOnInit() {
    this.listenForFiltersFormChanges();
    this.listenForQueryParamsChanges();
  }

  clearFilters(event) {
    event.stopPropagation();
    this.router.navigate([], {
      queryParams: {},
    });
  }

  private listenForFiltersFormChanges() {
    this.filtersForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => {
      const cexes = value.cexes?.map(({name}): string => name)
      const chains = value.chains?.map(({name}): string => name)
      const symbols = value.symbols?.map(({name}): string => name)

      const profitFrom = value.profit?.from?.length > 0 ? value.profit.from : null;
      const profitTo = value.profit?.to?.length > 0 ? value.profit.to : null;

      const amountFrom = value.amount?.from?.length > 0 ? value.amount.from : null;
      const amountTo = value.amount?.to?.length > 0 ? value.amount.to : null;

      this.router.navigate([], {
        queryParams: {
          cexes,
          chains,
          symbols,
          profit_from: profitFrom,
          profit_to: profitTo,
          amount_from: amountFrom,
          amount_to: amountTo,
        },
        queryParamsHandling: 'merge',
      });
    })
  }

  private listenForQueryParamsChanges() {
    const prepareArrayValues = (items) => {
      return items ? Array.isArray(items) ? items : [items] : []
    }

    this.activatedRoute.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.filtersForm.patchValue({
        cexes: prepareArrayValues(params['cexes']).map(cex => ({name: cex})),
        chains: prepareArrayValues(params['chains']).map(cex => ({name: cex})),
        symbols: prepareArrayValues(params['symbols']).map(cex => ({name: cex})),
        profit: {
          from: params['profit_from'],
          to: params['profit_to'],
        },
        amount: {
          from: params['amount_from'],
          to: params['amount_to'],
        }
      }, {emitEvent: false})
    })
  }
}
