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

  constructor(
    private data: DataService, 
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {
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

  login(username: string) {
    this.loggedUser = username;

    // MODIFICATO: Aggiunto anche il caricamento preventivo degli scripts
    forkJoin({
      customers: this.http.get<any[]>(`${this.apiUrl}/customers`),
      servers: this.http.get<any[]>(`${this.apiUrl}/servers`),
      scripts: this.http.get<any[]>(`${this.apiUrl}/scripts`),
      logs: this.http.get<any[]>(`${this.apiUrl}/logs`)
    }).subscribe({
      next: (risultati) => {
        this.data.customers = Array.isArray(risultati.customers) ? risultati.customers : [];
        this.data.servers = Array.isArray(risultati.servers) ? risultati.servers : [];
        this.data.scripts = Array.isArray(risultati.scripts) ? risultati.scripts : [];
        this.data.logs = Array.isArray(risultati.logs) ? risultati.logs : [];

        this.isLoggedIn = true;
        this.currentPage = 'dashboard';
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Errore nel caricamento dati da Mockoon al login:", err);
        alert("Impossibile connettersi al server Mockoon. Verifica che sia acceso sulla porta 3000!");
      }
    });
  }

  setPage(page: string) {
    if (page === 'login') {
      this.isLoggedIn = false;
      this.loggedUser = ''; 
      this.data.customers = [];
      this.data.servers = [];
      this.data.scripts = [];
      this.data.logs = [];
    }
    this.currentPage = page;
    this.cdr.detectChanges();
  }
}