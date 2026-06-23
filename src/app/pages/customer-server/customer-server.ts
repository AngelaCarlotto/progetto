import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data';
import { HttpClient, HttpParams } from '@angular/common/http'; // Aggiunto HttpParams

@Component({
  selector: 'app-customer-server',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-server.html',
  styleUrl: './customer-server.css'
})
export class CustomerServerComponent implements OnInit {

  private apiUrl = 'http://localhost:3000/api';

  constructor(
    public data: DataService, 
    private http: HttpClient,
    private cdr: ChangeDetectorRef 
  ) {}

  ngOnInit() {
    this.loadData();
  }

  // MODIFICATO: Evita di sovrascrivere la memoria locale se ci sono già dati aggiornati in Angular
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

  // Il getter filteredCustomers rimane attivo per ordinare e filtrare in locale in totale sicurezza
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

  private refreshUI() {
    setTimeout(() => {
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }, 0);
  }

  // MODIFICATO: Pulisce ed esegue il reset della ricerca quando si chiude la barra
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
      this.resetSearch(); 
    }
    this.refreshUI();
  }

  onSearchChange(): void {
  const testoCercato = this.searchQuery.trim();

  if (!testoCercato) {
    this.resetSearch();
    return;
  }

  const params = new HttpParams().set('search', testoCercato);

  // 1. Chiamata di tracciamento per i Clienti (Mockoon cercherà tra i clienti)
  this.http.get<any[]>(`${this.apiUrl}/customers`, { params }).subscribe({
    next: () => this.refreshUI(),
    error: (err) => console.error(err)
  });

  // 2. NUOVA: Chiamata di tracciamento per i Server! 
  // Quando cerchi "Production-Web", questa chiamata andrà nel secchiello dei server su Mockoon
  // e nei Logs vedrai i dati reali del server invece dell'array vuoto!
  this.http.get<any[]>(`${this.apiUrl}/servers`, { params }).subscribe({
    next: () => this.refreshUI(),
    error: (err) => console.error(err)
  });
}
private resetSearch(): void {
  // Quando si resetta, ricarichiamo tutto pulito
  this.http.get<any[]>(`${this.apiUrl}/customers`).subscribe(allData => {
    this.data.customers = allData;
    this.refreshUI();
  });
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

    this.http.post(`${this.apiUrl}/customers`, newCustomer).subscribe(() => {
      if (!Array.isArray(this.data.customers)) {
        this.data.customers = [];
      }
      this.data.customers = [newCustomer, ...this.data.customers];
      this.showCustomerModal = false;
      this.refreshUI();
    });
  }

  deleteCustomer(id: string) {
    if (confirm('Sei sicuro di voler eliminare questo cliente? I relativi server rimarranno orfani.')) {
      this.http.delete(`${this.apiUrl}/customers/${id}`).subscribe(() => {
        this.data.customers = this.data.customers.filter(c => c.id !== id);
        this.closeAllDropdowns();
        this.refreshUI();
      });
    }
  }

  createServer() {
    if (!this.serverForm.name.trim() || !this.serverForm.customerId) return;

    const serverId = 'SRV-' + Math.floor(1000 + Math.random() * 9000);
    
    this.credentials = {
      clientId: 'id_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10),
      clientSecret: 'secret_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    };

    const newServer = {
      id: serverId,
      name: this.serverForm.name,
      customerId: this.serverForm.customerId
    };

    this.http.post(`${this.apiUrl}/servers`, newServer).subscribe(() => {
      if (!Array.isArray(this.data.servers)) {
        this.data.servers = [];
      }
      this.data.servers = [newServer, ...this.data.servers];
      this.showServerModal = false;
      this.showSecretModal = true; 
      this.refreshUI();
    });
  }

  deleteServer(id: string) {
    if (confirm('Sei sicuro di voler rimuovere questo server?')) {
      this.http.delete(`${this.apiUrl}/servers/${id}`).subscribe(() => {
        this.data.servers = this.data.servers.filter(s => s.id !== id);
        this.closeAllDropdowns();
        this.refreshUI();
      });
    }
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