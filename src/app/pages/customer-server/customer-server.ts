import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data/data';
import { HttpClient } from '@angular/common/http';
import { Subject, Subscription, forkJoin, of } from 'rxjs';
import { debounceTime, switchMap, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-customer-server',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-server.html',
  styleUrl: './customer-server.css'
})
export class CustomerServerComponent implements OnInit, OnDestroy {

  private apiUrl = 'http://localhost:3000/api'; 

  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;

  constructor(
    public data: DataService, 
    private http: HttpClient,
    private cdr: ChangeDetectorRef 
  ) {}

  ngOnInit() {
    this.loadData();

    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(1500),
      switchMap(query => {
        if (!query) {
          return of(null);
        }

        const queryLower = query.toLowerCase();

        const clientiTrovati = (this.data.customers || []).filter((c: any) => 
          c.name && c.name.toLowerCase().includes(queryLower)
        ).length;

        const serverTrovati = (this.data.servers || []).filter((s: any) => 
          s.name && s.name.toLowerCase().includes(queryLower)
        ).length;

        if (clientiTrovati > 0) {
          console.log(
            `%c [SEARCH] Cercato: "${query}" | Risultati -> Clienti trovati: ${clientiTrovati}`, 
            "color: #0ea5e9; "
          );
        }

        if (serverTrovati > 0) {
          console.log(
            `%c [SEARCH] Cercato: "${query}" | Risultati -> Server trovati: ${serverTrovati}`, 
            "color: #0ea5e9; "
          );
        }

        if (clientiTrovati === 0 && serverTrovati === 0) {
          console.log(
            `%c [SEARCH] Cercato: "${query}" | Nessun risultato trovato nel client`, 
            "color: #0ea5e9; "
          );
        }

        const chiamate: any = {};

        if (clientiTrovati > 0) {
          chiamate.customers = this.http.post(`${this.apiUrl}/customers`, {
            tipo_ricerca: "Anagrafica_Clienti",
            keyword: query,
            esito: "Record trovati",
            stats: { clienti: clientiTrovati }
          }).pipe(catchError(() => of(null)));
        }

        if (serverTrovati > 0) {
          chiamate.servers = this.http.post(`${this.apiUrl}/servers`, {
            tipo_ricerca: "Anagrafica_Server",
            keyword: query,
            esito: "Record trovati",
            stats: { server: serverTrovati }
          }).pipe(catchError(() => of(null)));
        }

        if (clientiTrovati === 0 && serverTrovati === 0) {
          chiamate.customers = this.http.post(`${this.apiUrl}/customers`, {
            tipo_ricerca: "Anagrafica_Clienti",
            keyword: query,
            esito: "Nessun match",
            stats: { clienti: 0 }
          }).pipe(catchError(() => of(null)));

          chiamate.servers = this.http.post(`${this.apiUrl}/servers`, {
            tipo_ricerca: "Anagrafica_Server",
            keyword: query,
            esito: "Nessun match",
            stats: { server: 0 }
          }).pipe(catchError(() => of(null)));
        }

        return forkJoin(chiamate);
      })
    ).subscribe();
  }

  // Termina la sottoscrizione attiva al flusso di ricerca quando il componente viene rimosso dalla memoria.
  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  // Richiede via API i dati di clienti, server e log qualora l'istanza condivisa locale risulti vuota.
  loadData() {
    if (this.data.customers && this.data.customers.length > 0) {
      this.refreshUI();
      return;
    }

    this.http.get<any[]>(`${this.apiUrl}/customers`).subscribe(res => {
      this.data.customers = res;
      this.refreshUI();
    });
    this.http.get<any[]>(`${this.apiUrl}/servers`).subscribe(res => {
      this.data.servers = res;
      this.refreshUI();
    });
    this.http.get<any[]>(`${this.apiUrl}/logs`).subscribe(res => {
      this.data.logs = res;
      this.refreshUI();
    });
  }

  showCustomerModal = false;
  showServerModal = false;
  showSecretModal = false;

  activeDropdownServerId: string | null = null;
  activeDropdownCustomerId: string | null = null;

  isSearchOpen = false;
  searchQuery = '';

  customerForm = { name: '' };
  serverForm = {
    name: '',
    customerId: null as any
  };

  credentials = {
    clientId: '',
    clientSecret: ''
  };

  expandedCustomerIds: (string | number)[] = [];

  // Filtra i clienti (e relativi server) in base alla stringa cercata e li ordina cronologicamente dal più recente.
  get filteredCustomers() {
    const getTimestamp = (dateStr: any): number => {
      if (!dateStr) return 0;
      if (dateStr instanceof Date) return dateStr.getTime();
      
      let normalized = String(dateStr).trim().replace(/\//g, '-');
      let d = new Date(normalized);
      if (!isNaN(d.getTime())) return d.getTime();
      
      const dataPulita = normalized.split(' ')[0];
      const parti = dataPulita.split('-');
      if (parti.length === 3) {
        if (parti[0].length === 4) {
          return new Date(Number(parti[0]), Number(parti[1]) - 1, Number(parti[2])).getTime();
        } else {
          return new Date(Number(parti[2]), Number(parti[1]) - 1, Number(parti[0])).getTime();
        }
      }
      return 0;
    };

    let result = Array.isArray(this.data.customers) ? [...this.data.customers] : [];

    const query = this.searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(c => {
        const matchCustomer = c.name && c.name.toLowerCase().includes(query);
        const matchServer = this.getServersByCustomer(c.id).some(s => 
          s.name && s.name.toLowerCase().includes(query)
        );
        return matchCustomer || matchServer;
      });
    }

    return result.sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt));
  }

  // Forza l'aggiornamento grafico e la rilevazione dei cambiamenti all'interno del ciclo di rendering di Angular.
  private refreshUI() {
    setTimeout(() => {
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }, 0);
  }

  // Apre o chiude l'input di ricerca a schermo, azzerando i filtri applicati in caso di chiusura.
  toggleSearch(event: Event): void {
    event.stopPropagation();
    this.isSearchOpen = !this.isSearchOpen;
    if (this.isSearchOpen) {
      setTimeout(() => {
        const input = document.querySelector('.search-input') as HTMLInputElement;
        if (input) input.focus();
      }, 100);
    } else {
      this.searchQuery = ''; 
      this.searchSubject.next(''); 
    }
    this.refreshUI();
  }

  // Spinge la stringa digitata dall'utente all'interno dell'oggetto Subject per avviare il debounce di ricerca.
  onSearchChange(): void {
    this.searchSubject.next(this.searchQuery.trim());
    this.refreshUI();
  }

  // Chiude istantaneamente tutti i menu a tendina.
  closeAllDropdowns() {
    this.activeDropdownServerId = null;
    this.activeDropdownCustomerId = null;
    if (!this.searchQuery.trim()) {
      this.isSearchOpen = false;
    }
    this.refreshUI();
  }

  // Commuta lo stato di apertura del menu contestuale relativo alle opzioni di un singolo cliente.
  toggleCustomerDropdown(customerId: string, event: Event) {
    event.stopPropagation(); 
    this.activeDropdownServerId = null; 
    this.activeDropdownCustomerId = this.activeDropdownCustomerId === customerId ? null : customerId;
    this.refreshUI();
  }

  // Commuta lo stato di apertura del menu contestuale relativo alle opzioni di un singolo server.
  toggleDropdown(serverId: string, event: Event) {
    event.stopPropagation(); 
    this.activeDropdownCustomerId = null; 
    this.activeDropdownServerId = this.activeDropdownServerId === serverId ? null : serverId;
    this.refreshUI();
  }

  // Aggiunge o rimuove l'ID di un cliente dall'elenco delle righe espanse per mostrare o nascondere i server figli.
  toggleExpand(customerId: string | number) {
    const index = this.expandedCustomerIds.indexOf(customerId);
    if (index > -1) {
      this.expandedCustomerIds.splice(index, 1);
    } else {
      this.expandedCustomerIds.push(customerId);
    }
    this.refreshUI();
  }

  // Determina se la sezione contenente i server di un cliente specifico è attualmente visibile.
  isExpanded(customerId: string | number): boolean {
    return this.expandedCustomerIds.includes(customerId);
  }

  // Restituisce l'insieme dei server associati in maniera esclusiva all'identificativo del cliente passato.
  getServersByCustomer(customerId: string | number) {
    if (!this.data.servers) return [];
    return this.data.servers.filter(s => s.customerId == customerId);
  }

  // Resetta i dati del modulo e mostra la finestra modale per inserire un nuovo cliente.
  openCustomerModal() {
    this.closeAllDropdowns();
    this.customerForm.name = '';
    this.showCustomerModal = true;
    this.refreshUI();
  }

  // Resetta i dati del modulo e mostra la finestra modale per la configurazione e aggiunta di un server.
  openServerModal() {
    this.closeAllDropdowns();
    this.serverForm = { name: '', customerId: null };
    this.showServerModal = true;
    this.refreshUI();
  }

  // Chiude la finestra popup di notifica e azzera le credenziali di sicurezza precedentemente stampate.
  closeSecretModal() {
    this.showSecretModal = false;
    this.credentials = { clientId: '', clientSecret: '' };
    this.refreshUI();
  }

  // Invia il nuovo cliente tramite richiesta POST a Mockoon e aggiorna la tabella.
  createCustomer() {
    if (!this.customerForm.name.trim()) return;

    const newCustomer = {
      id: 'CLI-' + Math.floor(1000 + Math.random() * 9000),
      name: this.customerForm.name,
      createdAt: new Date().toISOString()
    };

    this.http.post(`${this.apiUrl}/customers`, newCustomer).subscribe({
      next: () => {
        if (!Array.isArray(this.data.customers)) this.data.customers = [];
        this.data.customers = [newCustomer, ...this.data.customers];
        
        console.log(
          `%c [CREATE] Customer "${newCustomer.name}" creato con successo!`, 
          "color: #10b981;"
        );

        this.showCustomerModal = false;
        this.refreshUI();
      },
      error: () => {
        if (!Array.isArray(this.data.customers)) this.data.customers = [];
        this.data.customers = [newCustomer, ...this.data.customers];
        
        console.log(
          `%c [CREATE] Customer "${newCustomer.name}" creato con successo (Fallback locale)!`, 
          "color: #f59e0b; font-weight: bold;"
        );

        this.showCustomerModal = false;
        this.refreshUI();
      }
    });
  }

  // Elimina un cliente da Mockoon tramite richiesta DELETE e aggiorna la tabella.
  deleteCustomer(id: string) {
    const customerName = this.data.customers?.find((c: any) => c.id === id)?.name || id;

    this.http.delete<any>(`${this.apiUrl}/customers/${id}`).subscribe({
      next: () => {
        this.data.customers = this.data.customers.filter((c: any) => c.id !== id);
        
        console.log(
          `%c [DELETE] Customer "${customerName}" eliminato con successo!`, 
          "color: #ef4444;"
        );

        this.refreshUI();
      },
      error: () => {
        this.data.customers = this.data.customers.filter((c: any) => c.id !== id);
        
        console.log(
          `%c [DELETE] Customer "${customerName}" eliminato con successo (Fallback locale)!`, 
          "color: #f59e0b;"
        );

        this.refreshUI();
      }
    });
  }

  // Creazione di un nuovo server, genera in locale le credenziali client id e client secret e le fa vedere tramite popup
  createServer() {
    if (!this.serverForm.name.trim() || !this.serverForm.customerId) return;

    const serverId = 'SRV-' + Math.floor(1000 + Math.random() * 9000);
    
    this.credentials = {
      clientId: Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10),
      clientSecret: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    };

    const newServer = {
      id: serverId,
      name: this.serverForm.name,
      customerId: this.serverForm.customerId
    };

    this.http.post(`${this.apiUrl}/servers`, newServer).subscribe({
      next: () => {
        if (!Array.isArray(this.data.servers)) this.data.servers = [];
        this.data.servers = [newServer, ...this.data.servers];
        
        console.log(
          `%c [CREATE] Server "${newServer.name}" creato con successo!`, 
          "color: #10b981;"
        );

        this.showServerModal = false;
        this.showSecretModal = true; 
        this.refreshUI();
      },
      error: () => {
        if (!Array.isArray(this.data.servers)) this.data.servers = [];
        this.data.servers = [newServer, ...this.data.servers];

        console.log(
          `%c [CREATE] Server "${newServer.name}" creato con successo (Fallback locale)!`, 
          "color: #f59e0b;"
        );

        this.showServerModal = false;
        this.showSecretModal = true; 
        this.refreshUI();
      }
    });
  }

  // Rimuove il server, inviando una richiesta DELETE HTTP a Mockoon.
  deleteServer(id: string) {
    const serverName = this.data.servers?.find((s: any) => s.id === id)?.name || id;

    this.http.delete<any>(`${this.apiUrl}/servers/${id}`).subscribe({
      next: () => {
        this.data.servers = this.data.servers.filter((s: any) => s.id !== id);
        
        console.log(
          `%c [DELETE] Server "${serverName}" eliminato con successo!`, 
          "color: #ef4444;"
        );

        this.refreshUI();
      },
      error: () => {
        this.data.servers = this.data.servers.filter((s: any) => s.id !== id);
        
        console.log(
          `%c [DELETE] Server "${serverName}" eliminato con successo (Fallback locale)!`, 
          "color: #f59e0b;"
        );

        this.refreshUI();
      }
    });
  }

  // Richiede o rigenera in modo sicuro le coppie Client ID e Client Secret di un server, visualizzando le nuove credenziali.
  regenerateCredentials(serverId: string) {
    if (confirm('Rigenerando le chiavi, le vecchie applicazioni collegate smetteranno di funzionare. Continuare?')) {
      this.http.post<any>(`${this.apiUrl}/servers/${serverId}/credentials`, {}).subscribe({
        next: (mockCredentials) => {
          this.credentials = {
            clientId: mockCredentials?.clientId || 'id_regen_' + Math.random().toString(36).substring(2, 12),
            clientSecret: mockCredentials?.clientSecret || 'secret_regen_' + Math.random().toString(36).substring(2, 15)
          };

          console.log(
            "%c[SECURITY] Nuove credenziali API generate con successo!",
             "color: #e988f4"
          );

          this.closeAllDropdowns();
          this.showSecretModal = true; 
          this.refreshUI();
        },
        error: () => {
          this.credentials = {
            clientId: 'id_regen_' + Math.random().toString(36).substring(2, 12),
            clientSecret: 'secret_regen_' + Math.random().toString(36).substring(2, 15)
          };

           console.log(
            "%c[SECURITY] Nuove credenziali API generate con successo! (Fallback locale)!",
            "color: #f59e0b"
          );

          this.closeAllDropdowns();
          this.showSecretModal = true;
          this.refreshUI();
        }
      });
    }
  }
}