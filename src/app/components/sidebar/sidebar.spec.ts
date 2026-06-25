import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SidebarComponent } from './sidebar';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent] // Carica il componente standalone
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // Test 1: Verifica che il componente venga istanziato correttamente
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Test 2: Verifica il corretto funzionamento del toggle per il Dark Mode
  it('should toggle theme mode', () => {
    const initialMode = component.isDarkMode;
    component.toggleTheme();
    expect(component.isDarkMode).toBe(!initialMode);
  });

  // Test 3: Verifica l'emissione dell'evento cambio pagina senza usare spyOn o done
  it('should emit changePage event when setPage is called', () => {
    let haEmesso = false;
    let paginaRicevuta = '';

    // Sovrascriviamo l'emit per intercettare il valore in modo sicuro
    component.changePage.emit = (page: string) => {
      haEmesso = true;
      paginaRicevuta = page;
    };

    // Eseguiamo l'azione del cambio pagina
    component.setPage('customers');

    // Verifichiamo i risultati con i matcher stabili
    expect(haEmesso).toBeTruthy();
    expect(paginaRicevuta).toBe('customers');
  });
});