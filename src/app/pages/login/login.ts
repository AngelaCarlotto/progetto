import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http'; // <-- AGGIUNTO

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {

  @Output() logged = new EventEmitter<string>();
  private apiUrl = 'http://localhost:3000/api'; // <-- AGGIUNTO

  username = '';
  password = '';
  errorMessage = '';

  constructor(private http: HttpClient) {} // <-- AGGIUNTO

  onFormSubmit() {
    this.errorMessage = '';
    const loginBody = { username: this.username, password: this.password };

    // Effettua la POST reale verso Mockoon
    this.http.post<any>(`${this.apiUrl}/auth/login`, loginBody).subscribe({
      next: (response) => {
        if (response && response.success) {
          this.logged.emit(this.username);
        } else {
          this.errorMessage = 'Credenziali non valide. Accesso negato.';
        }
      },
      error: () => {
        this.errorMessage = 'Errore di connessione con il server di autenticazione.';
      }
    });
  }

  loginConGitHub() {
    this.errorMessage = '';
    alert("Simulazione: Accesso tramite GitHub eseguito con successo!");
    this.logged.emit('admin_github');
  }
}