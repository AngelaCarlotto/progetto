import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ScriptsComposer } from './scripts-composer';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data/data';

describe('ScriptsComposer Component', () => {
  let component: ScriptsComposer;
  let fixture: ComponentFixture<ScriptsComposer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ScriptsComposer,
        FormsModule,
        HttpClientTestingModule 
      ],
      providers: [DataService]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ScriptsComposer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default states and step counters', () => {
    expect(component.currentStep).toBe(1);
    expect(component.activeEditTab).toBe(1);
    expect(component.showCreate).toBeFalsy();
    expect(component.showEdit).toBeFalsy();
    expect(component.isChangingFtpPassword).toBeFalsy();
  });

  it('should format search text when numerical characters are provided', () => {
    component.searchId = '4506';
    component.onSearchChange();
    expect(component.searchId).toBe('SCR-4506');
  });

  it('should advance and regress wizard page steps properly within boundaries', () => {
    expect(component.currentStep).toBe(1);
    component.nextStep();
    expect(component.currentStep).toBe(2);
    component.prevStep();
    expect(component.currentStep).toBe(1);
  });
});