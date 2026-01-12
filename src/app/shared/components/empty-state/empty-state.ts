import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  imports: [],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyState {
  title = input();
  description = input();
  actionLabel = input();
  variant = input<'default' | 'bordered'>('default');

  action = output();

  borderColorClass = computed(() =>
    this.variant() === 'bordered' ? 'border-slate-800' : 'border-slate-700/50'
  );

  iconBgClass = computed(() => 'bg-slate-800/50 text-slate-600');
}


