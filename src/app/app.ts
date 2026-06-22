import { Component, afterNextRender, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoginComponent } from './pages/login/login';
import { SidebarComponent } from './components/sidebar/sidebar';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { CustomerServerComponent } from './pages/customer-server/customer-server';
import { GraphsComponent} from './pages/graphs/graphs';
import { Logs } from './pages/logs/logs';
import { ScriptsComposer } from './pages/scripts-composer/scripts-composer';

// IMPORTIAMO I SERVIZI E FORKJOIN
import { DataService } from './services/data';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LoginComponent,
    SidebarComponent,
    DashboardComponent,
    CustomerServerComponent,
    GraphsComponent,
    Logs,
    ScriptsComposer
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {

  isLoggedIn = false;
  currentPage = 'dashboard';
  loggedUser = ''; 
  private apiUrl = 'http://localhost:3000/api';

  // Iniettiamo anche ChangeDetectorRef (chiamato cdr) nel costruttore
  constructor(
    private data: DataService, 
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {
    // Rileva se il sistema del pc ha il tema scuro o chiaro e lo imposta automaticamente
    afterNextRender(() => {
      const sistemaInDark = window.matchMedia('(prefers-color-scheme: dark)');
      
      const applicaTemaAutomatico = (event: MediaQueryList | MediaQueryListEvent) => {
        if (event.matches) {
          document.body.classList.add('dark-theme');
        } else {
          document.body.classList.remove('dark-theme');
        }
      };

      applicaTemaAutomatico(sistemaInDark);
      sistemaInDark.addEventListener('change', applicaTemaAutomatico);
    });
  }

  // GESTISCE IL LOGIN CON SVEGLIA IMMEDIATA DELLA GRAFICA (Risolve il bug del doppio click)
  login(username: string) {
    this.loggedUser = username;

    // Attendiamo che Mockoon risponda a tutte le chiamate prima di cambiare pagina
    forkJoin({
      customers: this.http.get<any[]>(`${this.apiUrl}/customers`),
      servers: this.http.get<any[]>(`${this.apiUrl}/servers`),
      logs: this.http.get<any[]>(`${this.apiUrl}/logs`)
    }).subscribe({
      next: (risultati) => {
        // Salviamo i dati nel servizio controllando che siano array validi
        this.data.customers = Array.isArray(risultati.customers) ? risultati.customers : [];
        this.data.servers = Array.isArray(risultati.servers) ? risultati.servers : [];
        this.data.logs = Array.isArray(risultati.logs) ? risultati.logs : [];

        // Attiviamo la sessione e impostiamo la pagina desiderata
        this.isLoggedIn = true;
        this.currentPage = 'dashboard';

        // SVEGLIA ANGULAR: Costringiamo l'interfaccia ad aggiornarsi immediatamente al primo click!
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Errore nel caricamento dati da Mockoon al login:", err);
        alert("Impossibile connettersi al server Mockoon. Verifica che sia acceso!");
      }
    });
  }

  // Gestisce il cambio di pagina manuale 
  setPage(page: string) {
    if (page === 'login') {
      this.isLoggedIn = false;
      this.loggedUser = ''; 
      // Svuotiamo i dati al logout per motivi di sicurezza e pulizia dello stato
      this.data.customers = [];
      this.data.servers = [];
      this.data.logs = [];
    }
    this.currentPage = page;
    
    // Un piccolo refresh anche per il cambio pagina manuale non fa mai male
    this.cdr.detectChanges();
  }
}