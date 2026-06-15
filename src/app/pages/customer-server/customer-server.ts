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
    // 1. CONTROLLO DI SICUREZZA
    if (!this.customerForm.name || !this.customerForm.name.trim()) {
      alert('Attenzione: Il nome del cliente non può essere vuoto!');
      return; 
    }

    // 2. CALCOLO DELLA DATA 
    const oggi = new Date();
    const anno = oggi.getFullYear();
    const mese = String(oggi.getMonth() + 1).padStart(2, '0');
    const giorno = String(oggi.getDate()).padStart(2, '0');

    // 3. AGGIUNTA DEL CLIENTE
    this.data.customers.push({
      id: 'CLI-' + Math.floor(Math.random() * 9999),
      name: this.customerForm.name.trim(),
      createdAt: `${anno}-${mese}-${giorno}` 
    });

    // 4. RESET E CHIUSURA MODALE
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
  }
}