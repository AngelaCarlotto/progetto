import { Component, afterNextRender } from '@angular/core'; // Usiamo afterNextRender
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { LoginComponent } from './pages/login/login';
import { SidebarComponent } from './components/sidebar/sidebar';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { CustomerServerComponent } from './pages/customer-server/customer-server';
import { GraphsComponent} from './pages/graphs/graphs';
import { Logs } from './pages/logs/logs';
import { ScriptsComposer } from './pages/scripts-composer/scripts-composer';

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

  constructor() {
    // afterNextRender viene eseguito SOLO ed esclusivamente nel browser del tuo Mac.
    // Il server Node.js salterà completamente questo blocco, azzerando l'errore su "window"
    afterNextRender(() => {
      const sistemaInDark = window.matchMedia('(prefers-color-scheme: dark)');
      
      const applicaTemaAutomatico = (event: MediaQueryList | MediaQueryListEvent) => {
        if (event.matches) {
          document.body.classList.add('dark-theme');
        } else {
          document.body.classList.remove('dark-theme');
        }
      };

      // Controllo iniziale al caricamento della pagina
      applicaTemaAutomatico(sistemaInDark);
      
      // Rimani in ascolto dei cambi di impostazione su macOS
      sistemaInDark.addEventListener('change', applicaTemaAutomatico);
    });
  }

  login(username: string) {
    this.loggedUser = username;
    this.isLoggedIn = true;
    this.currentPage = 'dashboard'; 
  }

  setPage(page: string) {
    if (page === 'login') {
      this.isLoggedIn = false;
      this.loggedUser = ''; 
    }
    this.currentPage = page;
  }
}