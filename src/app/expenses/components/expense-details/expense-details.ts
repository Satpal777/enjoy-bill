import { Component, input, OnInit, output, signal } from '@angular/core';
import { Expenses } from '../../../core/services/supabase/expenses';
import { ExpenseDetail } from '../../../shared/components/models/modet.types';
import { CurrencyPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-expense-details',
  imports: [CurrencyPipe,DatePipe],
  standalone: true,
  templateUrl: './expense-details.html',
  styleUrl: './expense-details.css',
})
export class ExpenseDetails implements OnInit {
  expenseId = input<string | null>();
  close = output();
  save = output();

  expenseData = signal<ExpenseDetail | null>(null);

  constructor(private expensesService: Expenses) { }

  ngOnInit() {
    const expenseId = this.expenseId();
    if (typeof expenseId === 'string') {
      this.getExpenseDetails(expenseId);
    }
  }

  async getExpenseDetails(expenseId:string) {
    const response = await this.expensesService.getExpenseDetails(expenseId);
    this.expenseData.set(response);
    console.log(this.expenseData())
  }
}
