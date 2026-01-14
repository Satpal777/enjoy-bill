import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ExpenseCardData {
  id: string;
  title: string;
  amount: number;
  currency: string;
  date: Date;
  paidBy: string;
  isLent: boolean;
  myShare: number;
  isSettlement: boolean;
}

@Component({
  selector: 'app-expense-card',
  imports: [CommonModule],
  templateUrl: './expense-card.html',
  styleUrl: './expense-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpenseCard {
  expense = input.required<ExpenseCardData>();
  edit = output<string>();
  delete = output<string>();

  onEdit(evt: Event) {
    evt.stopPropagation();
    this.edit.emit(this.expense().id);
  }

  onDelete(evt: Event) {
    evt.stopPropagation()
    this.delete.emit(this.expense().id);
  }
}
