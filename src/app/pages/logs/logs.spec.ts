import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Logs } from './logs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data';

describe('Logs Component', () => {
  let component: Logs;
  let fixture: ComponentFixture<Logs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        Logs,
        FormsModule,
        HttpClientTestingModule 
      ],
      providers: [DataService]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(Logs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default pagination values', () => {
    expect(component.currentPage).toBe(1);
    expect(component.itemsPerPage).toBe(10);
    expect(component.search).toBe('');
    expect(component.loading).toBeFalsy();
    expect(component.dropdownAperto).toBeFalsy();
  });

  it('should change page using nextPage and previousPage counters', () => {
    component.enrichedLogs = new Array(25); 
    
    expect(component.currentPage).toBe(1);
    component.nextPage();
    expect(component.currentPage).toBe(2);
    component.previousPage();
    expect(component.currentPage).toBe(1);
  });
});