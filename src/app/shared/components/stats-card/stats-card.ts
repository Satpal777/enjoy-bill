import { Component, Input, input } from '@angular/core';

@Component({
  selector: 'app-stats-card',
  imports: [],
  templateUrl: './stats-card.html',
  styleUrl: './stats-card.css',
})
export class StatsCard {
  label = input();
  value = input();
  variant = input<'default' | 'success' | 'danger'>('default');

  get valueColorClass(): string {
    const colors = {
      default: 'text-white',
      success: 'text-emerald-400',
      danger: 'text-rose-400'
    };
    return colors[this.variant()];
  }

  get iconBgClass(): string {
    const colors = {
      default: 'bg-teal-500/10 text-teal-400',
      success: 'bg-emerald-500/10 text-emerald-400',
      danger: 'bg-rose-500/10 text-rose-400'
    };
    return colors[this.variant()];
  }
}
