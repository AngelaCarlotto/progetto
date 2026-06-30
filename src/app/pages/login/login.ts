import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http'; 
import { AuthService } from '../../services/auth/auth'; 

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {

  @Output() logged = new EventEmitter<string>();
  private apiUrl = 'http://localhost:3000/api'; 

  username = '';
  password = '';
  errorMessage = '';

  constructor(
    private http: HttpClient,
    private authService: AuthService 
  ) {} 

  //autenticazione standard
  onFormSubmit() {
    this.errorMessage = '';

    if (!this.username.trim() || !this.password.trim()) {
      this.errorMessage = 'Inserisci sia l\'username che la password per accedere.';
      return;
    }

    const loginBody = { username: this.username, password: this.password };

    this.http.post<any>(`${this.apiUrl}/auth/login`, loginBody).subscribe({
      next: (response) => {
        if (response && response.success) {
          console.log(`[LOGIN] Credenziali corrette per: ${this.username}`);

          const tokenDaSalvare = response.token ? response.token : this.username;
          localStorage.setItem('token_autenticazione', tokenDaSalvare);

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

  //autenticazione con github
  loginConGitHub() {
    this.errorMessage = '';
    alert("Simulazione: Accesso tramite GitHub eseguito con successo");
    
    console.log("Login effettuato con GitHub!");
    localStorage.setItem('token_autenticazione', 'admin');
    
    this.logged.emit('admin_github');
  }
}