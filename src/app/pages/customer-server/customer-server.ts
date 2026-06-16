import { Component } from '@angular/core';
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
  activeDropdownCustomerId: string | null = null;

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

  closeAllDropdowns() {
    this.activeDropdownServerId = null;
    this.activeDropdownCustomerId = null;
  }

  toggleCustomerDropdown(customerId: string, event: Event) {
    event.stopPropagation(); 
    this.activeDropdownServerId = null; 
    
    if (this.activeDropdownCustomerId === customerId) {
      this.activeDropdownCustomerId = null;
    } else {
      this.activeDropdownCustomerId = customerId;
    }
  }

  toggleDropdown(serverId: string, event: Event) {
    event.stopPropagation(); 
    this.activeDropdownCustomerId = null; 
    
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
    this.closeAllDropdowns();
    this.showCustomerModal = true;
  }

  openServerModal() {
    this.closeAllDropdowns();
    this.showServerModal = true;
  }

  createCustomer() {
    if (!this.customerForm.name || !this.customerForm.name.trim()) {
      alert('Attenzione: Il nome del cliente non può essere vuoto!');
      return; 
    }

    this.data.customers.push({
      id: 'CLI-' + Math.floor(Math.random() * 9999),
      name: this.customerForm.name.trim(),
      createdAt: new Date().toISOString()  
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
      this.closeAllDropdowns();
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

    this.closeAllDropdowns();
    this.showSecretModal = true; 
  }

  closeSecretModal() {
    this.showSecretModal = false;
  }

  deleteCustomer(id: string | number) {
    const conferma = confirm("Sei sicuro di voler eliminare questo cliente?\nL'operazione eliminerà anche tutti i server ad esso associati in modo irreversibile.");
    if (!conferma) {
      this.closeAllDropdowns();
      return;
    }

    this.data.customers = this.data.customers.filter(c => c.id != id);
    this.data.servers = this.data.servers.filter(s => s.customerId != id);
    this.expandedCustomerIds = this.expandedCustomerIds.filter(expandedId => expandedId != id);
    this.closeAllDropdowns();
  }

  deleteServer(id: string) {
    this.data.servers = this.data.servers.filter(s => s.id !== id);
    this.closeAllDropdowns();
  }
}