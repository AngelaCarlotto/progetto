import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data'; 
import { HttpClient, HttpHeaders } from '@angular/common/http'; 
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, switchMap, catchError, timeout } from 'rxjs/operators';
import { AuthService } from '../../services/auth/auth'; 

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './logs.html',
  styleUrl: './logs.css'
})
export class Logs implements OnInit, OnDestroy {

  private apiUrl = 'http://localhost:3000/api';
  
  search = '';
  itemsPerPage = 10;
  currentPage = 1;
  dropdownAperto = false;
  loading = false;

  enrichedLogs: any[] = [];
  
  totalSuccessCount = 0;
  totalErrorCount = 0;

  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;

  constructor(
    public data: DataService, 
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private authService: AuthService 
  ) {}

  ngOnInit() {
    this.loadInitialLogs();

    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(1500), 
      switchMap(query => {
        const cleanedQuery = query ? query.trim() : '';
        if (!cleanedQuery) {
          return of(null);
        }

        const currentFiltered = this.getFilteredLogsList(cleanedQuery);
        
        const successMatch = currentFiltered.filter(log => String(log.level).toLowerCase() === 'success').length;
        const errorMatch = currentFiltered.filter(log => String(log.level).toLowerCase() === 'error').length;

        const bodyPayload = {
          keyword: cleanedQuery,
          esito_ricerca: currentFiltered.length > 0 ? 'Dato trovato' : 'Nessun risultato',
          totale_corrispondenze: currentFiltered.length,
          totale_success: successMatch,
          totale_error: errorMatch
        };

        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

        return this.http.post<any>(`${this.apiUrl}/logs/search`, bodyPayload, { headers }).pipe(
          catchError((err) => {
            console.warn("[SEARCH] Errore o Fallback locale sui parametri di ricerca:", err);
            return of(null);
          })
        );
      })
    ).subscribe(() => {
      const queryLower = this.search ? this.search.trim().toLowerCase() : '';
      
      if (queryLower) {
        const totaleMatchReali = this.getFilteredLogsList(queryLower).length;
        if (totaleMatchReali > 0) {
          console.log(`%c[SEARCH] Risultati trovati per: "${this.search}" (${totaleMatchReali} match)`, "color: #0ea5e9; ");
        } else {
          console.log(`%c[SEARCH] Nessun risultato trovato per: "${this.search}"`, "color: #ef4444; ");
        }
      }

      this.updateGraphCounters();
      this.loading = false;
      this.refreshUI();
    });
  }

  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  loadInitialLogs() {
    this.loading = true;
    this.refreshUI();

    this.http.get<any[]>(`${this.apiUrl}/logs`).pipe(
      timeout(3000),
      catchError(err => {
        console.error("[HTTP ERROR] Errore inizializzazione log:", err);
        this.loading = false;
        this.refreshUI();
        return of([]);
      })
    )
    .subscribe((res) => {
      const rawLogs = Array.isArray(res) ? res : [];
      
      this.enrichedLogs = rawLogs.map(log => {
        const rawDate = log.createdAt || log.created_at || log.CreatedAt;
        const dateObj = rawDate ? new Date(rawDate) : null;
        
        let dataFormattataTabella = '';
        if (dateObj && !isNaN(dateObj.getTime())) {
          const giorno = String(dateObj.getDate()).padStart(2, '0');
          const mese = String(dateObj.getMonth() + 1).padStart(2, '0');
          const anno = dateObj.getFullYear();
          const ore = String(dateObj.getHours()).padStart(2, '0');
          const minuti = String(dateObj.getMinutes()).padStart(2, '0');
          const secondi = String(dateObj.getSeconds()).padStart(2, '0');
          
          dataFormattataTabella = `${giorno}/${mese}/${anno} - ${ore}:${minuti}:${secondi}`;
        }

        const execId = log.executionId || log.execution_id || log.ExecutionId || null;

        return {
          ...log,
          displayExecutionId: execId ? execId : 'N/A',
          createdAtObj: dateObj,
          formattedDateStr: dataFormattataTabella ? dataFormattataTabella.toLowerCase() : ''
        };
      });

      this.enrichedLogs.sort((a, b) => {
        if (!a.createdAtObj) return 1;
        if (!b.createdAtObj) return -1;
        return b.createdAtObj.getTime() - a.createdAtObj.getTime();
      });

      this.updateGraphCounters();
      this.loading = false;
      this.refreshUI();
    });
  }

  private updateGraphCounters() {
    const logsSorgente = this.getFilteredLogsList(this.search);

    this.totalSuccessCount = logsSorgente.filter(log => String(log.level).toLowerCase() === 'success').length;
    this.totalErrorCount = logsSorgente.filter(log => String(log.level).toLowerCase() === 'error').length;
  }
  
  private getFilteredLogsList(queryValue: string): any[] {
    const query = queryValue ? queryValue.trim().toLowerCase() : '';
    if (!query) {
      return [...this.enrichedLogs];
    }

    return this.enrichedLogs.filter(log => {
      return String(log.id || '').toLowerCase().includes(query) ||
             String(log.level || '').toLowerCase().includes(query) ||
             String(log.message || '').toLowerCase().includes(query) ||
             String(log.scriptId || '').toLowerCase().includes(query) ||
             String(log.displayExecutionId || '').toLowerCase().includes(query) ||
             (log.formattedDateStr ? log.formattedDateStr.includes(query) : false);
    });
  }

  filteredLogs() {
    const logsFiltrati = this.getFilteredLogsList(this.search);
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return logsFiltrati.slice(start, start + this.itemsPerPage);
  }

  totalPages(): number {
    const totaleFiltrati = this.getFilteredLogsList(this.search).length;
    return Math.ceil(totaleFiltrati / this.itemsPerPage) || 1;
  }

  onSearchChange() {
    this.currentPage = 1;
    this.searchSubject.next(this.search);
    this.updateGraphCounters();
    this.refreshUI();
  }

  toggleDropdown() { 
    this.dropdownAperto = !this.dropdownAperto; 
    this.refreshUI();
  }

  clearAllLogs() {
    this.dropdownAperto = false; 

    const ruoloAttuale = this.authService.getUserRole();
    console.log("%c[DEBUG LOGS] Tentativo di svuotamento. Ruolo rilevato:", "color: #3b82f6;", ruoloAttuale);

    if (ruoloAttuale !== 'admin') {
      alert('Operazione negata! Solo gli utenti con ruolo "admin" possono svuotare i log.');
      return; 
    }

    if (confirm('Sei sicuro di voler svuotare tutti i log?')) {
      this.loading = true;
      this.refreshUI();
      
      this.http.delete<any>(`${this.apiUrl}/logs`).subscribe({
        next: (risposta) => {
          const rispostaFinale = (risposta && Object.keys(risposta).length > 0) 
            ? risposta 
            : { success: true, message: "Tutti i log sono stati svuotati" };
          
          console.log("%c[MOCKOON RESPONSE] Ricevuto dal server:", "color: #f59e0b; ", rispostaFinale);
          
          this.enrichedLogs = [];
          this.currentPage = 1; 
          this.updateGraphCounters();
          this.loading = false;
          this.refreshUI(); 
        },
        error: (err) => { 
          console.error("[DELETE ERROR] Errore durante lo svuotamento:", err);
          this.loading = false; 
          this.refreshUI(); 
        }
      });
    }
  }

  nextPage() { 
    if (this.currentPage < this.totalPages()) { 
      this.currentPage++; 
      this.refreshUI(); 
    } 
  }

  previousPage() { 
    if (this.currentPage > 1) { 
      this.currentPage--; 
      this.refreshUI(); 
    } 
  }

  refreshUI() {
    this.cdr.detectChanges(); 
  }
}