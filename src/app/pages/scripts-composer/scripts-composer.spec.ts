import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScriptsComposer } from './scripts-composer';

describe('ScriptsComposer', () => {
  let component: ScriptsComposer;
  let fixture: ComponentFixture<ScriptsComposer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScriptsComposer],
    }).compileComponents();

    fixture = TestBed.createComponent(ScriptsComposer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
