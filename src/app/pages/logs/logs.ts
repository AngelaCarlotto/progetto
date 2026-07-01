import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data/data'; 
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

  /*Configura il sistema di ricerca con debounce e avvia il caricamento iniziale.*/
  ngOnInit() {
    this.loadInitialLogs();

    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(1500), 
      switchMap(query => {
        const cleanedQuery = query ? query.trim() : '';
        if (!cleanedQuery) {
          return of(null);
        }

        const dateAwareQuery = this.normalizeDateQuery(cleanedQuery);

        const safeQuery = this.escapeRegex(dateAwareQuery);

        return this.http.get<{ logs: any[] }>(
          `${this.apiUrl}/logs/search`,
          { params: { keyword: safeQuery } }
        ).pipe(
          catchError((err) => {
            console.warn("[SEARCH] Errore o fallback locale sui parametri di ricerca:", err);
            return of(null);
          })
        );
      })
    ).subscribe(res => {
      if (res && res.logs) {
        res.logs.forEach((log: any, i: number) => {
          const dataLeggibile = log.createdAt ? new Date(log.createdAt).toLocaleString('it-IT') : 'N/A';
          console.log(
            `%c Log trovato ${i + 1}: [${log.level}] ${log.message} — ${dataLeggibile} (id: ${log.id})`,
            "color: #0ea5e9; "
          );
        });
        if (res.logs.length === 0) {
          console.log("%c Nessun risultato trovato.", "color: #ef4444; ");
        }
      }

      this.updateGraphCounters();
      this.loading = false;
      this.refreshUI();
    });
  }

  private normalizeDateQuery(query: string): string {
    const fullDateMatch = query.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (fullDateMatch) {
      const [, day, month, year] = fullDateMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    const partialDateMatch = query.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (partialDateMatch) {
      const [, day, month] = partialDateMatch;
      return `-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return query;
  }


  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  }

  /*Cancella la sottoscrizione per evitare consumi di memoria superflui.*/
  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  /*Recupera l'elenco iniziale di tutti i log disponibili sul server.*/
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

  /*Ricalcola il conteggio totale dei successi e degli errori basandosi solo sui log attualmente filtrati.*/
  private updateGraphCounters() {
    const logsSorgente = this.getFilteredLogsList(this.search);

    this.totalSuccessCount = logsSorgente.filter(log => String(log.level).toLowerCase() === 'success').length;
    this.totalErrorCount = logsSorgente.filter(log => String(log.level).toLowerCase() === 'error').length;
  }
  
  /*filtra l'intero array di log in base a una stringa di ricerca. Cerca la corrispondenza.*/
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

  /*Calcola il numero totale di pagine necessarie per la paginazione, basandosi sui log filtrati.*/
  totalPages(): number {
    const totaleFiltrati = this.getFilteredLogsList(this.search).length;
    return Math.ceil(totaleFiltrati / this.itemsPerPage) || 1; 
  }

  /*
   * Eseguita ogni volta che l'utente modifica l'input della barra di ricerca.
   * Resetta la paginazione alla prima pagina ed emette il valore nello stream RxJS.
   */
  onSearchChange() {
    this.currentPage = 1;
    this.searchSubject.next(this.search); 
    this.updateGraphCounters();          
    this.refreshUI();
  }

  /*Inverte lo stato di apertura/chiusura (true/false) del menu dropdown delle opzioni nella UI.*/
  toggleDropdown() { 
    this.dropdownAperto = !this.dropdownAperto; 
    this.refreshUI();
  }

  /*Svuota interamente il database dei log sul server. Include controlli di sicurezza basati sul ruolo utente.*/
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

  /*Avanza alla pagina successiva della tabella dei log (se disponibile).*/
  nextPage() { 
    if (this.currentPage < this.totalPages()) { 
      this.currentPage++; 
      this.refreshUI(); 
    } 
  }

  /*Ritorna alla pagina precedente della tabella dei log (fino alla pagina 1).*/
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