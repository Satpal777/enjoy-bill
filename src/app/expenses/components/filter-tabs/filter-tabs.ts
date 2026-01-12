import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-filter-tabs',
  imports: [],
  templateUrl: './filter-tabs.html',
  styleUrl: './filter-tabs.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterTabs {
  filters = input<{ value: string, label: string }[]>([]);
  activeFilter = input('');

  filterChange = output<string>();

  onFilterChange(filter: string) {
    this.filterChange.emit(filter);
  }
}
