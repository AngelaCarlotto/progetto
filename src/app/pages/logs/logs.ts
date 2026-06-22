import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data'; 
import { HttpClient } from '@angular/common/http'; // <-- AGGIUNTO

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './logs.html',
  styleUrl: './logs.css'
})
export class Logs implements OnInit {

  private apiUrl = 'http://localhost:3000/api'; // <-- AGGIUNTO

  constructor(public data: DataService, private http: HttpClient) {} // <-- MODIFICATO

  ngOnInit() {
    this.http.get<any[]>(`${this.apiUrl}/logs`).subscribe(res => this.data.logs = res);
  }

  search = '';
  itemsPerPage = 10;
  currentPage = 1;
  dropdownAperto = false;

  toggleDropdown() { this.dropdownAperto = !this.dropdownAperto; }

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
      if (dataString.includes('T') || dataString.includes('-')) return new Date(dataString).getTime() || 0;
      const parti = dataString.split('/');
      if (parti.length === 3) {
        const dataFormattata = `${parti[2]}-${parti[1]}-${parti[0]}`;
        return new Date(dataFormattata).getTime() || 0;
      }
      return 0;
    };

    result = [...result].sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt));
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return result.slice(start, start + this.itemsPerPage);
  }
  
  clearAllLogs() {
    this.dropdownAperto = false; 
    if (confirm('Sei sicuro di voler svuotare tutti i log visualizzati?')) {
      // Chiamata DELETE per pulire i log su Mockoon
      this.http.delete(`${this.apiUrl}/logs`).subscribe(() => {
        this.data.logs = []; 
        this.currentPage = 1; 
      });
    }
  }

  totalPages() {
    const totalItems = this.data.logs ? this.data.logs.length : 0;
    return Math.ceil(totalItems / this.itemsPerPage) || 1;
  }

  nextPage() { if (this.currentPage < this.totalPages()) this.currentPage++; }
  previousPage() { if (this.currentPage > 1) this.currentPage--; }
}