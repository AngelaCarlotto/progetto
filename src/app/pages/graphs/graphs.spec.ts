import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraphsComponent} from './graphs';

describe('GraphsComponent', () => {
  let component: GraphsComponent;
  let fixture: ComponentFixture<GraphsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraphsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GraphsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
