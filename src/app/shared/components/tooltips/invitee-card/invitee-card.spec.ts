import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InviteeCard } from './invitee-card';

describe('InviteeCard', () => {
  let component: InviteeCard;
  let fixture: ComponentFixture<InviteeCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InviteeCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InviteeCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
