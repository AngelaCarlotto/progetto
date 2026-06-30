import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GraphsComponent } from './graphs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DataService } from '../../services/data/data';

describe('GraphsComponent', () => {
  let component: GraphsComponent;
  let fixture: ComponentFixture<GraphsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        GraphsComponent,
        HttpClientTestingModule 
      ],
      providers: [DataService]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GraphsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with blank state and zero statistics', () => {
    expect(component.loading).toBeFalsy();
    expect(component.showToast).toBeFalsy();
    expect(component.mysqlCount).toBe(0);
    expect(component.filesCount).toBe(0);
    expect(component.globalSuccess).toBe(0);
    expect(component.globalError).toBe(0);
  });
});