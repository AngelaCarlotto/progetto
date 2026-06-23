import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data'; 
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './logs.html',
  styleUrl: './logs.css'
})
export class Logs implements OnInit {

  private apiUrl = 'http://localhost:3000/api';
  
  search = '';
  itemsPerPage = 10;
  currentPage = 1;
  dropdownAperto = false;
  loading = false;

  // Array locale per gestire i log unici arricchiti con le date formattate
  enrichedLogs: any[] = [];

  constructor(
    public data: DataService, 
    private http: HttpClient,
    private cdr: ChangeDetectorRef 
  ) {}

  ngOnInit() {
    // Carica ed elabora i log già presenti nel DataService (scaricati al login)
    this.prepareLogs();
  }

  // Prepara i log calcolando le date una volta sola per velocizzare il filtro
  prepareLogs() {
    const rawLogs = this.data.logs || [];
    
    this.enrichedLogs = rawLogs.map(log => {
      const dateObj = this.parseDataInvalida(log.createdAt);
      let dataIT = '';
      let dataITAlt = '';
      
      if (dateObj) {
        const giorno = String(dateObj.getDate()).padStart(2, '0');
        const mese = String(dateObj.getMonth() + 1).padStart(2, '0');
        const anno = dateObj.getFullYear();
        dataIT = `${giorno}/${mese}/${anno}`; // Permette di cercare "23/06"
        dataITAlt = `${giorno}-${mese}-${anno}`; // Permette di cercare "23-06"
      }

      return {
        ...log,
        createdAtObj: dateObj,
        stringDataIT: dataIT,
        stringDataITAlt: dataITAlt
      };
    });

    this.refreshUI();
  }

  private parseDataInvalida(dateStr: any): Date | null {
    if (!dateStr || typeof dateStr !== 'string') return null;
    let stringaNormalizzata = dateStr.trim().replace(/\//g, '-');

    if (stringaNormalizzata.includes('T')) {
      const d = new Date(stringaNormalizzata);
      return !isNaN(d.getTime()) ? d : null;
    }

    const dataPulita = stringaNormalizzata.split(' ')[0];
    const parti = dataPulita.split('-');
    
    if (parti.length === 3) {
      if (parti[0].length === 4) {
        return new Date(Number(parti[0]), Number(parti[1]) - 1, Number(parti[2]));
      }
      return new Date(Number(parti[2]), Number(parti[1]) - 1, Number(parti[0]));
    }
    
    const d = new Date(stringaNormalizzata);
    return !isNaN(d.getTime()) ? d : null;
  }

  // Eseguito ad ogni carattere digitato o alla pulizia con la "✕"
  onSearchChange() {
    this.currentPage = 1; // Riporta sempre alla prima pagina
    this.enrichedLogs = [...this.enrichedLogs]; // Forziamo la reattività di Angular
    this.refreshUI();
  }

  toggleDropdown() { 
    this.dropdownAperto = !this.dropdownAperto; 
    this.refreshUI();
  }

  clearAllLogs() {
    this.dropdownAperto = false; 
    if (confirm('Sei sicuro di voler svuotare tutti i log visualizzati?')) {
      this.http.delete(`${this.apiUrl}/logs`).subscribe({
        next: () => {
          this.data.logs = []; 
          this.enrichedLogs = [];
          this.currentPage = 1; 
          this.refreshUI(); 
        },
        error: (err) => console.error("Errore svuotamento log:", err)
      });
    }
  }

  // Restituisce l'array filtrato e paginato da mostrare nella tabella HTML
  filteredLogs() {
    let result = [...this.enrichedLogs];

    if (this.search && this.search.trim()) {
      const searchTerm = this.search.toLowerCase().trim();
      result = result.filter(log => {
        const execId = log.executionId || log.execution_id || '';

        return (
          (log.id && String(log.id).toLowerCase().includes(searchTerm)) ||
          (log.level && log.level.toLowerCase().includes(searchTerm)) ||
          (log.message && log.message.toLowerCase().includes(searchTerm)) ||
          (log.stringDataIT && log.stringDataIT.includes(searchTerm)) || 
          (log.stringDataITAlt && log.stringDataITAlt.includes(searchTerm)) || 
          (log.scriptId && String(log.scriptId).toLowerCase().includes(searchTerm)) ||
          (execId && String(execId).toLowerCase().includes(searchTerm))
        );
      });
    }

    // Ordinamento cronologico decrescente (dal log più recente)
    result.sort((a, b) => {
      if (!a.createdAtObj) return 1;
      if (!b.createdAtObj) return -1;
      return b.createdAtObj.getTime() - a.createdAtObj.getTime();
    });

    // Paginazione locale
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return result.slice(start, start + this.itemsPerPage);
  }

  totalPages(): number {
    const totalItems = this.getFilteredCount();
    return Math.ceil(totalItems / this.itemsPerPage) || 1;
  }

  private getFilteredCount(): number {
    if (!this.search || !this.search.trim()) return this.enrichedLogs.length;
    
    const searchTerm = this.search.toLowerCase().trim();
    return this.enrichedLogs.filter(log => {
      const execId = log.executionId || log.execution_id || '';
      return (
        (log.id && String(log.id).toLowerCase().includes(searchTerm)) ||
        (log.level && log.level.toLowerCase().includes(searchTerm)) ||
        (log.message && log.message.toLowerCase().includes(searchTerm)) ||
        (log.stringDataIT && log.stringDataIT.includes(searchTerm)) || 
        (log.stringDataITAlt && log.stringDataITAlt.includes(searchTerm)) || 
        (log.scriptId && String(log.scriptId).toLowerCase().includes(searchTerm)) ||
        (execId && String(execId).toLowerCase().includes(searchTerm))
      );
    }).length;
  }

  nextPage() {
    if (this.currentPage < this.totalPages()) {
      this.currentPage++;
      this.refreshUI();
    }
  }
  
  previousPage() { 
    if (this.currentPage > 1) {
      this.currentPage--; 
      this.refreshUI();
    }
  }

  private refreshUI() {
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }
}