import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CustomerServerComponent } from './customer-server';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DataService } from '../../services/data';

describe('CustomerServerComponent', () => {
  let component: CustomerServerComponent;
  let fixture: ComponentFixture<CustomerServerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CustomerServerComponent,
        HttpClientTestingModule 
      ],
      providers: [DataService] 
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CustomerServerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});