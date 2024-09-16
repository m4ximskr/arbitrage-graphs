import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ArbitrageGraphComponent } from './arbitrage-graph/arbitrage-graph.component';
import { MatFormFieldModule} from "@angular/material/form-field";
import { MatChipsModule} from "@angular/material/chips";
import {MatIconModule} from "@angular/material/icon";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import { ChipFilterComponent } from './filters/chip-filter/chip-filter.component';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import { RangeFilterComponent } from './filters/range-filter/range-filter.component';
import {MatInputModule} from "@angular/material/input";
import {MatButtonModule} from "@angular/material/button";
import {MatExpansionModule} from "@angular/material/expansion";
import {provideHttpClient} from "@angular/common/http";

@NgModule({
  declarations: [
    AppComponent,
    ArbitrageGraphComponent,
    ChipFilterComponent,
    RangeFilterComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatFormFieldModule, MatChipsModule, MatIconModule, ReactiveFormsModule,
    MatInputModule, FormsModule,
    MatButtonModule,
    MatExpansionModule,
  ],
  providers: [
    provideHttpClient()
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
