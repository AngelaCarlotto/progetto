import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data'; 

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './logs.html',
  styleUrl: './logs.css'
})
export class Logs {

  constructor(public data: DataService) {}

  search = '';
  itemsPerPage = 10;
  currentPage = 1;
  
  dropdownAperto = false;

  toggleDropdown() {
    this.dropdownAperto = !this.dropdownAperto;
  }

  //per cercare i log filtra in base a id, livello, messaggio, data di creazione e script id
  filteredLogs() {
    let result = this.data.logs || [];

    if (this.search) {
      const searchTerm = this.search.toLowerCase();
      result = result.filter(log =>
        (log.id && String(log.id).toLowerCase().includes(searchTerm)) ||
        (log.level && log.level.toLowerCase().includes(searchTerm)) ||
        (log.message && log.message.toLowerCase().includes(searchTerm)) ||
        (log.createdAt && log.createdAt.toLowerCase().includes(searchTerm)) ||
        (log.scriptId && String(log.scriptId).toLowerCase().includes(searchTerm))
      );
    }

    result = [...result].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    const start = (this.currentPage - 1) * this.itemsPerPage;
    return result.slice(start, start + this.itemsPerPage);
  }


  //elimina i logs se si preme svuota log 
  clearAllLogs() {
    this.dropdownAperto = false; 
    
    if (confirm('Sei sicuro di voler svuotare tutti i log visualizzati?')) {
      this.data.logs = []; 
      this.currentPage = 1; 
    }
  }

  totalPages() {
    const totalItems = this.data.logs ? this.data.logs.length : 0;
    return Math.ceil(totalItems / this.itemsPerPage) || 1;
  }

  nextPage() {
    if (this.currentPage < this.totalPages()) {
      this.currentPage++;
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }
}