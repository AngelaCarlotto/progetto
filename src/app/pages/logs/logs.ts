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

  //mostra o nasconde il menu a tendina 
  toggleDropdown() {
    this.dropdownAperto = !this.dropdownAperto;
  }

  // per cercare i log filtra in base a id, livello, messaggio, data di creazione e script id
  filteredLogs() {
    let result = this.data.logs || [];

    if (this.search) {
      const searchTerm = this.search.toLowerCase();
      
      result = result.filter(log => {
        let dataItaliana = '';
        if (log.createdAt) {
          const d = new Date(log.createdAt);

          if (!isNaN(d.getTime())) {
            const giorno = String(d.getDate()).padStart(2, '0');
            const mese = String(d.getMonth() + 1).padStart(2, '0');
            const anno = d.getFullYear();
            dataItaliana = `${giorno}/${mese}/${anno}`; 
          }
        }

        return (
          (log.id && String(log.id).toLowerCase().includes(searchTerm)) ||
          (log.level && log.level.toLowerCase().includes(searchTerm)) ||
          (log.message && log.message.toLowerCase().includes(searchTerm)) ||
          (dataItaliana && dataItaliana.includes(searchTerm)) || 
          (log.scriptId && String(log.scriptId).toLowerCase().includes(searchTerm))
        );
      });
    }

    const getTimestamp = (dataString: string | undefined): number => {
      if (!dataString) return 0;
      if (dataString.includes('T') || dataString.includes('-')) {
        return new Date(dataString).getTime() || 0;
      }
      const parti = dataString.split('/');
      if (parti.length === 3) {
        const dataFormattata = `${parti[2]}-${parti[1]}-${parti[0]}`;
        return new Date(dataFormattata).getTime() || 0;
      }
      return 0;
    };

    result = [...result].sort((a, b) => {
      const dateA = getTimestamp(a.createdAt);
      const dateB = getTimestamp(b.createdAt);
      return dateB - dateA;
    });

    const start = (this.currentPage - 1) * this.itemsPerPage;
    return result.slice(start, start + this.itemsPerPage);
  }
  

  // elimina i logs se si preme svuota log 
  clearAllLogs() {
    this.dropdownAperto = false; 
    
    if (confirm('Sei sicuro di voler svuotare tutti i log visualizzati?')) {
      this.data.logs = []; 
      this.currentPage = 1; 
    }
  }

  //calcola il numero della pagine che sono necessarie 
  totalPages() {
    const totalItems = this.data.logs ? this.data.logs.length : 0;
    return Math.ceil(totalItems / this.itemsPerPage) || 1;
  }

  //avanza alla pagina successiva
  nextPage() {
    if (this.currentPage < this.totalPages()) {
      this.currentPage++;
    }
  }

  //ritorna alla pagina precedente 
  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }
}