import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {

  @Output() logged = new EventEmitter<string>();

  username = '';
  password = '';
  errorMessage = '';

  // Controlla le credenziali di login e nega o valida l'accesso
  onFormSubmit() {
    this.errorMessage = '';

    if (this.username === 'admin' && this.password === '123') {
      this.logged.emit(this.username);
    } else {
      this.errorMessage = 'Credenziali non valide. Accesso negato.';
    }
  }

  // NUOVA FUNZIONE: Simula l'accesso immediato tramite GitHub
  loginConGitHub() {
    this.errorMessage = '';
    
    // Mostriamo un piccolo avviso (opzionale, puoi anche toglierlo se vuoi farlo istantaneo)
    alert("Simulazione: Accesso tramite GitHub eseguito con successo!");
    
    // Lanciamo l'evento di login simulando che l'utente si chiami 'admin_github'
    this.logged.emit('admin_github');
  }
}