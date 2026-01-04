import { Component, input, output, computed } from '@angular/core';

@Component({
  selector: 'app-modal',
  imports: [],
  templateUrl: './modal.html',
  styleUrl: './modal.css',
})
export class Modal {
  isOpen = input(false);
  title = input('');
  size = input<'sm' | 'md' | 'lg'>('md');
  iconColor = input<'teal' | 'purple' | 'blue'>('teal');
  showSecondaryBlur = input(true);
  loading = input(false);

  close = output<void>();

  modalSizeClass = computed(() => {
    const sizes = {
      sm: 'w-full max-w-md',
      md: 'w-full max-w-lg',
      lg: 'w-full max-w-2xl'
    };
    return sizes[this.size()];
  });

  iconBgClass = computed(() => {
    const colors = {
      teal: 'bg-gradient-to-br from-teal-500 to-cyan-600 shadow-teal-900/30',
      purple: 'bg-gradient-to-br from-purple-500 to-pink-600 shadow-purple-900/30',
      blue: 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-900/30'
    };
    return colors[this.iconColor()];
  });

  iconColorClass = computed(() => {
    const colors = {
      teal: 'bg-teal-500/10',
      purple: 'bg-purple-500/10',
      blue: 'bg-blue-500/10'
    };
    return colors[this.iconColor()];
  });

  onClose() {
    this.close.emit();
  }
}
