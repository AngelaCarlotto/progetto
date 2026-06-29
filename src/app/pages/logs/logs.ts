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

        const queryLower = cleanedQuery.toLowerCase();
        
        const conteggio = this.enrichedLogs.filter(log => {
          return String(log.id || '').toLowerCase().includes(queryLower) ||
                 String(log.level || '').toLowerCase().includes(queryLower) ||
                 String(log.message || '').toLowerCase().includes(queryLower) ||
                 String(log.scriptId || '').toLowerCase().includes(queryLower) ||
                 String(log.formattedDateStr || '').includes(queryLower);
        }).length;

        const bodyPayload = {
          keyword: cleanedQuery,
          esito_ricerca: conteggio > 0 ? 'Dato trovato' : 'Nessun risultato',
          totale_corrispondenze: conteggio
        };

        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

        return this.http.post<any>(`${this.apiUrl}/logs/search`, bodyPayload, { headers }).pipe(
          catchError((err) => {
            console.warn("[SEARCH] Errore o Fallback locale sui parametri di ricerca:", err);
            return of(null);
          })
        );
      })
    ).subscribe((risposta) => {
      if (risposta) {
        console.log(`%c[SEARCH] Risultati trovati per: "${risposta.keyword_ricevuta || this.search}"`, "color: #10b981; ");
      }
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
    ).subscribe((res) => {
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

        return {
          ...log,
          createdAtObj: dateObj,
          formattedDateStr: dataFormattataTabella ? dataFormattataTabella.toLowerCase() : ''
        };
      });

      this.enrichedLogs.sort((a, b) => {
        if (!a.createdAtObj) return 1;
        if (!b.createdAtObj) return -1;
        return b.createdAtObj.getTime() - a.createdAtObj.getTime();
      });

      this.loading = false;
      this.refreshUI();
    });
  }

  filteredLogs() {
    const query = this.search ? this.search.trim().toLowerCase() : '';
    let logsFiltrati = [...this.enrichedLogs];

    if (query) {
      logsFiltrati = logsFiltrati.filter(log => {
        return String(log.id || '').toLowerCase().includes(query) ||
               String(log.level || '').toLowerCase().includes(query) ||
               String(log.message || '').toLowerCase().includes(query) ||
               String(log.scriptId || '').toLowerCase().includes(query) ||
               (log.formattedDateStr ? log.formattedDateStr.includes(query) : false);
      });
    }

    const start = (this.currentPage - 1) * this.itemsPerPage;
    return logsFiltrati.slice(start, start + this.itemsPerPage);
  }

  totalPages(): number {
    const query = this.search ? this.search.trim().toLowerCase() : '';
    if (!query) return Math.ceil(this.enrichedLogs.length / this.itemsPerPage) || 1;

    const totaleFiltrati = this.enrichedLogs.filter(log => {
      return String(log.id || '').toLowerCase().includes(query) ||
             String(log.level || '').toLowerCase().includes(query) ||
             String(log.message || '').toLowerCase().includes(query) ||
             String(log.scriptId || '').toLowerCase().includes(query) ||
             (log.formattedDateStr ? log.formattedDateStr.includes(query) : false);
    }).length;

    return Math.ceil(totaleFiltrati / this.itemsPerPage) || 1;
  }

  onSearchChange() {
    this.currentPage = 1;
    this.searchSubject.next(this.search.trim());
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
      
      this.http.delete<any>(`${this.apiUrl}/logs`).subscribe({
        next: (risposta) => {
          
          const rispostaFinale = (risposta && Object.keys(risposta).length > 0) 
            ? risposta 
            : { success: true, message: "Tutti i log sono stati svuotati" };
          
          console.log("%c[MOCKOON RESPONSE] Ricevuto dal server:", "color: #f59e0b; font-weight: bold;", rispostaFinale);
          
          this.enrichedLogs = [];
          this.currentPage = 1; 
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

  nextPage() { if (this.currentPage < this.totalPages()) { this.currentPage++; this.refreshUI(); } }

  previousPage() { if (this.currentPage > 1) { this.currentPage--; this.refreshUI(); } }

  refreshUI() {
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }
}