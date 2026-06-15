import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data';

@Component({
  selector: 'app-customer-server',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-server.html',
  styleUrl: './customer-server.css'
})
export class CustomerServerComponent {

  constructor(public data: DataService) {}

  showCustomerModal = false;
  showServerModal = false;
  showSecretModal = false;

  activeDropdownServerId: string | null = null;

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

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-container')) {
      this.activeDropdownServerId = null;
    }
  }

  toggleDropdown(serverId: string, event: Event) {
    event.stopPropagation(); 
    if (this.activeDropdownServerId === serverId) {
      this.activeDropdownServerId = null;
    } else {
      this.activeDropdownServerId = serverId;
    }
  }

  toggleExpand(customerId: string | number) {
    const index = this.expandedCustomerIds.indexOf(customerId);
    if (index > -1) {
      this.expandedCustomerIds.splice(index, 1);
    } else {
      this.expandedCustomerIds.push(customerId);
    }
  }

  isExpanded(customerId: string | number): boolean {
    return this.expandedCustomerIds.includes(customerId);
  }

  getServersByCustomer(customerId: string | number) {
    return this.data.servers.filter(s => s.customerId == customerId);
  }

  openCustomerModal() {
    this.showCustomerModal = true;
  }

  openServerModal() {
    this.showServerModal = true;
  }

  createCustomer() {
    if (!this.customerForm.name || !this.customerForm.name.trim()) {
      alert('Attenzione: Il nome del cliente non può essere vuoto!');
      return; 
    }

    const oggi = new Date();
    const anno = oggi.getFullYear();
    const mese = String(oggi.getMonth() + 1).padStart(2, '0');
    const giorno = String(oggi.getDate()).padStart(2, '0');

    this.data.customers.push({
      id: 'CLI-' + Math.floor(Math.random() * 9999),
      name: this.customerForm.name.trim(),
      createdAt: `${anno}-${mese}-${giorno}` 
    });

    this.customerForm = { name: '' };
    this.showCustomerModal = false; 
  }
  
  createServer() {
    const serverId = 'SRV-' + Math.floor(Math.random() * 9999);
    const clientId = 'cli_' + Math.random().toString(36).substring(2, 10);
    const clientSecret = 'sec_' + Math.random().toString(36).substring(2, 16);

    this.data.servers.push({
      id: serverId,
      name: this.serverForm.name,
      customerId: this.serverForm.customerId,
      clientId,
      clientSecret
    });

    this.credentials = { clientId, clientSecret };

    if (!this.isExpanded(this.serverForm.customerId)) {
      this.expandedCustomerIds.push(this.serverForm.customerId);
    }

    this.serverForm = { name: '', customerId: null };
    this.showServerModal = false;
    this.showSecretModal = true;
  }

  regenerateCredentials(serverId: string) {
    const server = this.data.servers.find(s => s.id === serverId);
    
    if (!server) {
      alert('Errore: Server non trovato!');
      return;
    }

    const conferma = confirm(`Sei sicuro di voler rigenerare le credenziali per il server "${server.name}"?\nLe vecchie credenziali smetteranno di funzionare immediatamente.`);
    if (!conferma) {
      this.activeDropdownServerId = null;
      return;
    }

    const newClientId = 'cli_' + Math.random().toString(36).substring(2, 10);
    const newClientSecret = 'sec_' + Math.random().toString(36).substring(2, 16);

    server.clientId = newClientId;
    server.clientSecret = newClientSecret;

    this.credentials = { 
      clientId: newClientId, 
      clientSecret: newClientSecret 
    };

    this.activeDropdownServerId = null; // Chiude il menu a tendina
    this.showSecretModal = true; // Mostra la modale con le nuove chiavi
  }

  closeSecretModal() {
    this.showSecretModal = false;
  }

  deleteCustomer(id: string | number) {
    this.data.customers = this.data.customers.filter(c => c.id != id);
    this.data.servers = this.data.servers.filter(s => s.customerId != id);
    this.expandedCustomerIds = this.expandedCustomerIds.filter(expandedId => expandedId != id);
  }

  deleteServer(id: string) {
    this.data.servers = this.data.servers.filter(s => s.id !== id);
    this.activeDropdownServerId = null;
  }
}