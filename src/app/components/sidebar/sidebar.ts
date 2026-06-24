import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent implements OnInit {

  @Input() currentPage = '';
  @Input() username = ''; 
  @Output() changePage = new EventEmitter<string>();

  isDarkMode: boolean = false;

  // Controlla e applica l'eventuale tema scuro precedentemente salvato nel browser.
  ngOnInit() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      this.isDarkMode = true;
      document.body.classList.add('dark-theme');
    }
  }
 
  // Inverte lo stato del tema (chiaro/scuro), aggiorna le classi CSS della pagina e salva la preferenza in locale.
  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  }

  // Invia un evento per richiedere il cambio della pagina corrente visualizzata.
  setPage(page: string) {
    this.changePage.emit(page);
  }

  // Stampa un log di controllo e reindirizza l'utente alla pagina di login tramite evento.
  logout() {
    console.log("Eseguo il logout...");
    this.changePage.emit('login');
  }
}