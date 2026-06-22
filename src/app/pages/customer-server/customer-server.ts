import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; // <-- Ritorniamo a ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data';
import { HttpClient } from '@angular/common/http';

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
    private cdr: ChangeDetectorRef // <-- Iniettato correttamente
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
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

  get filteredCustomers() {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return this.data.customers;

    return this.data.customers.filter(c => {
      const matchCustomer = c.name.toLowerCase().includes(query);
      const matchServer = this.getServersByCustomer(c.id).some(s => 
        s.name.toLowerCase().includes(query)
      );
      return matchCustomer || matchServer;
    });
  }

  // Funzione helper centralizzata per forzare il refresh immediato dello schermo
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
    }
    this.refreshUI();
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

  // 1. Crea un nuovo cliente (POST)
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
      
      // MODIFICATO: Mette il nuovo cliente in prima posizione
      this.data.customers = [newCustomer, ...this.data.customers];
      
      this.showCustomerModal = false;
      this.logAction('SUCCESS', `Creato nuovo cliente: ${newCustomer.name} (${newCustomer.id})`);
      this.refreshUI();
    });
  }

  // 2. Elimina un cliente (DELETE)
  deleteCustomer(id: string) {
    if (confirm('Sei sicuro di voler eliminare questo cliente? I relativi server rimarranno orfani.')) {
      this.http.delete(`${this.apiUrl}/customers/${id}`).subscribe(() => {
        this.data.customers = this.data.customers.filter(c => c.id !== id);
        this.closeAllDropdowns();
        this.logAction('WARNING', `Eliminato cliente con ID: ${id}`);
        this.refreshUI();
      });
    }
  }

  // 3. Crea un nuovo server (POST)
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
      
      // MODIFICATO: Mette il nuovo server in prima posizione
      this.data.servers = [newServer, ...this.data.servers];
      
      this.showServerModal = false;
      this.showSecretModal = true; 
      this.logAction('SUCCESS', `Creato server "${newServer.name}" associato al cliente ${newServer.customerId}`);
      this.refreshUI();
    });
  }

  // 4. Elimina un singolo server (DELETE)
  deleteServer(id: string) {
    if (confirm('Sei sicuro di voler rimuovere questo server?')) {
      this.http.delete(`${this.apiUrl}/servers/${id}`).subscribe(() => {
        this.data.servers = this.data.servers.filter(s => s.id !== id);
        this.closeAllDropdowns();
        this.logAction('WARNING', `Rimosso server con ID: ${id}`);
        this.refreshUI();
      });
    }
  }

  // 5. Rigenera le credenziali di un server esistente (POST)
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
          this.logAction('INFO', `Rigenerate credenziali API del server ${serverId}`);
          this.refreshUI();
        },
        error: () => {
          this.credentials = {
            clientId: 'id_regen_' + Math.random().toString(36).substring(2, 12),
            clientSecret: 'secret_regen_' + Math.random().toString(36).substring(2, 15)
          };
          this.closeAllDropdowns();
          this.showSecretModal = true;
          this.logAction('INFO', `Rigenerate credenziali API del server ${serverId}`);
          this.refreshUI();
        }
      });
    }
  }

  private logAction(level: 'SUCCESS' | 'INFO' | 'WARNING' | 'ERROR', message: string) {
    const logItem = {
      id: 'LOG-' + Math.floor(Math.random() * 99999),
      level: level.toLowerCase(), 
      message: message,
      createdAt: new Date().toLocaleDateString('it-IT').replace(/\//g, '-'), 
      scriptId: 'SCR-13432' 
    };

    this.http.post(`${this.apiUrl}/logs`, logItem).subscribe(() => {
      if (!Array.isArray(this.data.logs)) {
        this.data.logs = [];
      }
      
      // MODIFICATO: Spinge il log più recente in cima a tutti
      this.data.logs = [logItem, ...this.data.logs];
      
      this.refreshUI();
    });
  }
}