import { Component, input } from '@angular/core';
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
}

@Component({
  selector: 'app-expense-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './expense-card.html',
  styleUrl: './expense-card.css',
})
export class ExpenseCard {
  expense = input.required<ExpenseCardData>();
}
