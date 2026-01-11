import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InviteHandler } from './invite-handler';

describe('InviteHandler', () => {
  let component: InviteHandler;
  let fixture: ComponentFixture<InviteHandler>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InviteHandler]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InviteHandler);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
