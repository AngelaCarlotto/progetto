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

  @Output() logged = new EventEmitter<void>();

  username = 'admin';
  password = 'password123';

  login() {
    this.logged.emit();
  }
}