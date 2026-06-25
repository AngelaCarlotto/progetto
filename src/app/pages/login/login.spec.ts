import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        LoginComponent,
        FormsModule,
        HttpClientTestingModule 
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty fields and no errors', () => {
    expect(component.username).toBe('');
    expect(component.password).toBe('');
    expect(component.errorMessage).toBeFalsy();
  });

  it('should emit logged event when loginConGitHub is called', () => {
    const originaleAlert = window.alert;
    window.alert = () => {}; 

    let haEmesso = false;
    let utenteRicevuto = '';

    component.logged.emit = (username: string) => {
      haEmesso = true;
      utenteRicevuto = username;
    };
    
    component.loginConGitHub();
    
    window.alert = originaleAlert;

    expect(haEmesso).toBeTruthy(); 
    expect(utenteRicevuto).toBe('admin_github');
  });
});