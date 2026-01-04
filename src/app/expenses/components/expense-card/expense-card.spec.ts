import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpenseCard } from './expense-card';

describe('ExpenseCard', () => {
  let component: ExpenseCard;
  let fixture: ComponentFixture<ExpenseCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpenseCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
