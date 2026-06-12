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

    const start = (this.currentPage - 1) * this.itemsPerPage;
    return result.slice(start, start + this.itemsPerPage);
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