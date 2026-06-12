import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomerServerComponent } from './customer-server';

describe('CustomerServerComponent', () => {
  let component: CustomerServerComponent;
  let fixture: ComponentFixture<CustomerServerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerServerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomerServerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
