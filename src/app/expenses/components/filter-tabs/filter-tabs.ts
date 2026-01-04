import { Component, input, output } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-filter-tabs',
  standalone: true,
  imports: [NgClass],
  templateUrl: './filter-tabs.html',
  styleUrl: './filter-tabs.css',
})
export class FilterTabs {
  filters = input<{ value: string, label: string }[]>([]);
  activeFilter = input('');

  filterChange = output<string>();

  onFilterChange(filter: string) {
    this.filterChange.emit(filter);
  }
}
