import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent {

  @Input() currentPage = '';
  @Input() username = ''; 
  @Output() changePage = new EventEmitter<string>();

  setPage(page: string) {
    this.changePage.emit(page);
  }

  logout() {
    console.log("Eseguo il logout...");
    this.changePage.emit('login');
  }
}