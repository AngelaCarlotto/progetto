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

  // login
  onFormSubmit() {
    this.errorMessage = '';

    if (this.username === 'admin' && this.password === '123') {
      this.logged.emit(this.username);
    } else {
      this.errorMessage = 'Credenziali non valide. Accesso negato.';
    }
  }

  //simula l'accesso con github
  loginConGitHub() {
    this.errorMessage = '';
    
    alert("Simulazione: Accesso tramite GitHub eseguito con successo!");
    
    this.logged.emit('admin_github');
  }
}