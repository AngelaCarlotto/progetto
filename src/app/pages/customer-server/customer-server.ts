import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data/data';
import { HttpClient } from '@angular/common/http';
import { Subject, Subscription, of } from 'rxjs';
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
      debounceTime(400),
      switchMap(query => {
        if (!query.trim()) {
          this.loadData(false); 
          return of(null);
        }

        return this.http.get<{ customers: any[]; servers: any[] }>(
          `${this.apiUrl}/customer-server/search`,
          { params: { q: query } }
        ).pipe(
          catchError(err => {
            console.error("Errore di rete con Mockoon:", err);
            return of(null);
          })
        );
      })
    ).subscribe(res => {
      if (res) {
        const trovatiCustomers = (res.customers || []).filter((c: any) => c && c.id);
        const trovatiServers = (res.servers || []).filter((s: any) => s && s.id);

        this.data.customers = trovatiCustomers;
        this.data.servers = trovatiServers;
      }
      this.refreshUI();
    });
  }

  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  // Carica i dati gestendo la persistenza sia via Server Mockoon che via LocalStorage locale
  loadData(force = false) {
    // 1. Recupera prima di tutto i dati salvati in sessione locale (se esistono)
    const salvatiLocaliCustomers = localStorage.getItem('mock_customers');
    const salvatiLocaliServers = localStorage.getItem('mock_servers');

    if (salvatiLocaliCustomers) {
      this.data.customers = JSON.parse(salvatiLocaliCustomers);
    }
    if (salvatiLocaliServers) {
      this.data.servers = JSON.parse(salvatiLocaliServers);
    }

    // Se abbiamo già dati e non stiamo forzando la mano, ci fermiamo qui senza fare chiamate distruttive
    if (!force && this.data.customers && this.data.customers.length > 0) {
      this.refreshUI();
      return;
    }

    // Chiamata HTTP Customers
    this.http.get<any[]>(`${this.apiUrl}/customers`).subscribe(res => {
      const serverCustomers = Array.isArray(res) ? res : [];
      
      // Unisce i record di Mockoon con quelli memorizzati nel browser dell'utente
      const locali = (this.data.customers || []).filter((c: any) => !serverCustomers.some((r: any) => r.id === c.id));
      this.data.customers = [...locali, ...serverCustomers];
      
      // Aggiorna la memoria del browser
      localStorage.setItem('mock_customers', JSON.stringify(this.data.customers));
      this.refreshUI();
    });

    // Chiamata HTTP Servers
    this.http.get<any[]>(`${this.apiUrl}/servers`).subscribe(res => {
      const serverList = Array.isArray(res) ? res : [];
      
      const localiServer = (this.data.servers || []).filter((s: any) => !serverList.some((r: any) => r.id === s.id));
      this.data.servers = [...localiServer, ...serverList];
      
      localStorage.setItem('mock_servers', JSON.stringify(this.data.servers));
      this.refreshUI();
    });

    this.http.get<any[]>(`${this.apiUrl}/logs`).subscribe(res => {
      this.data.logs = Array.isArray(res) ? res : [];
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
    return result.sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt));
  }

  private refreshUI() {
    setTimeout(() => {
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }, 0);
  }

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

  onSearchChange(): void {
    this.searchSubject.next(this.searchQuery.trim());
  }

  closeAllDropdowns() {
    this.activeDropdownServerId = null;
    this.activeDropdownCustomerId = null;
    if (!this.searchQuery.trim()) {
      this.isSearchOpen = false;
    }
    this.refreshUI();
  }

  toggleCustomerDropdown(customerId: string, event: Event) {
    event.stopPropagation(); 
    this.activeDropdownServerId = null; 
    this.activeDropdownCustomerId = this.activeDropdownCustomerId === customerId ? null : customerId;
    this.refreshUI();
  }

  toggleDropdown(serverId: string, event: Event) {
    event.stopPropagation(); 
    this.activeDropdownCustomerId = null; 
    this.activeDropdownServerId = this.activeDropdownServerId === serverId ? null : serverId;
    this.refreshUI();
  }

  toggleExpand(customerId: string | number) {
    const index = this.expandedCustomerIds.indexOf(customerId);
    if (index > -1) {
      this.expandedCustomerIds.splice(index, 1);
    } else {
      this.expandedCustomerIds.push(customerId);
    }
    this.refreshUI();
  }

  isExpanded(customerId: string | number): boolean {
    return this.expandedCustomerIds.includes(customerId);
  }

  getServersByCustomer(customerId: string | number) {
    if (!this.data.servers) return [];
    return this.data.servers.filter(s => s.customerId == customerId);
  }

  openCustomerModal() {
    this.closeAllDropdowns();
    this.customerForm.name = '';
    this.showCustomerModal = true;
    this.refreshUI();
  }

  openServerModal() {
    this.closeAllDropdowns();
    this.serverForm = { name: '', customerId: null };
    this.showServerModal = true;
    this.refreshUI();
  }

  closeSecretModal() {
    this.showSecretModal = false;
    this.credentials = { clientId: '', clientSecret: '' };
    this.refreshUI();
  }

  createCustomer() {
    if (!this.customerForm.name.trim()) return;

    const newCustomer = {
      id: 'CLI-' + Math.floor(1000 + Math.random() * 9000),
      name: this.customerForm.name,
      createdAt: new Date().toISOString()
    };

    console.log(`%c Creazione customer: ${newCustomer.name} (id: ${newCustomer.id})`, "color: #10b981; ");

    this.http.post(`${this.apiUrl}/customers`, newCustomer).subscribe({
      next: () => {
        this.salvaCustomerInMemoria(newCustomer);
      },
      error: () => {
        // Se Mockoon risponde 404/Errore, salviamo comunque in locale via LocalStorage
        this.salvaCustomerInMemoria(newCustomer);
      }
    });
  }

  private salvaCustomerInMemoria(newCustomer: any) {
    if (!Array.isArray(this.data.customers)) this.data.customers = [];
    this.data.customers = [newCustomer, ...this.data.customers];
    localStorage.setItem('mock_customers', JSON.stringify(this.data.customers));
    this.showCustomerModal = false;
    this.refreshUI();
  }

  deleteCustomer(id: string) {
    this.http.delete<any>(`${this.apiUrl}/customers/${id}`).subscribe({
      next: () => {
        this.rimuoviCustomerInMemoria(id);
      },
      error: () => {
        this.rimuoviCustomerInMemoria(id);
      }
    });
  }

  private rimuoviCustomerInMemoria(id: string) {
    this.data.customers = (this.data.customers || []).filter((c: any) => c.id !== id);
    localStorage.setItem('mock_customers', JSON.stringify(this.data.customers));
    console.log(`%c Customer eliminato: ${id}`, "color: #ef4444;"); 
    this.refreshUI();
  }

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
      customerId: this.serverForm.customerId,
      createdAt: new Date().toISOString()
    };

    console.log(`%c Creazione server: ${newServer.name} (id: ${newServer.id}) per customerId: ${newServer.customerId}`, "color: #10b981; ");

    this.http.post(`${this.apiUrl}/servers`, newServer).subscribe({
      next: () => {
        this.salvaServerInMemoria(newServer);
      },
      error: () => {
        this.salvaServerInMemoria(newServer);
      }
    });
  }

  private salvaServerInMemoria(newServer: any) {
    if (!Array.isArray(this.data.servers)) this.data.servers = [];
    this.data.servers = [newServer, ...this.data.servers];
    localStorage.setItem('mock_servers', JSON.stringify(this.data.servers));
    this.showServerModal = false;
    this.showSecretModal = true; 
    this.refreshUI();
  }

  deleteServer(id: string) {
    this.http.delete<any>(`${this.apiUrl}/servers/${id}`).subscribe({
      next: () => {
        this.rimuoviServerInMemoria(id);
      },
      error: () => {
        this.rimuoviServerInMemoria(id);
      }
    });
  }

  private rimuoviServerInMemoria(id: string) {
    this.data.servers = (this.data.servers || []).filter((s: any) => s.id !== id);
    localStorage.setItem('mock_servers', JSON.stringify(this.data.servers));
    console.log(`%c Server eliminato: ${id}`, "color: #ef4444; ");
    this.refreshUI();
  }

  regenerateCredentials(serverId: string) {
    if (confirm('Rigenerando le chiavi, le vecchie applicazioni collegate smetteranno di funzionare. Continuare?')) {
      this.http.post<any>(`${this.apiUrl}/servers/${serverId}/credentials`, {}).subscribe({
        next: (mockCredentials) => {
          this.credentials = {
            clientId: mockCredentials?.clientId || 'id_regen_' + Math.random().toString(36).substring(2, 12),
            clientSecret: mockCredentials?.clientSecret || 'secret_regen_' + Math.random().toString(36).substring(2, 15)
          };
          this.closeAllDropdowns();
          this.showSecretModal = true; 
          this.refreshUI();
        },
        error: () => {
          this.credentials = {
            clientId: 'id_regen_' + Math.random().toString(36).substring(2, 12),
            clientSecret: 'secret_regen_' + Math.random().toString(36).substring(2, 15)
          };
          this.closeAllDropdowns();
          this.showSecretModal = true;
          this.refreshUI();
        }
      });
    }
  }
}