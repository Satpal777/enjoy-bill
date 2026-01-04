import { Component, input, Output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  imports: [],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.css',
})
export class EmptyState {
  title = input();
  description = input();
  actionLabel = input();
  variant = input<'default' | 'bordered'>('default');

  action = Output();

  get borderColorClass(): string {
    return this.variant() === 'bordered' ? 'border-slate-800' : 'border-slate-700/50';
  }

  get iconBgClass(): string {
    return 'bg-slate-800/50 text-slate-600';
  }
}


