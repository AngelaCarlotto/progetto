import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { LoginComponent } from './pages/login/login';
import { SidebarComponent } from './components/sidebar/sidebar';
import { DashboardComponent } from './pages/dashboard/dashboard';
import {  CustomerServerComponent } from './pages/customer-server/customer-server';
import { GraphsComponent} from './pages/graphs/graphs';
import { Logs } from './pages/logs/logs';
import { ScriptsComposer } from './pages/scripts-composer/scripts-composer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LoginComponent,
    SidebarComponent,
    DashboardComponent,
    CustomerServerComponent,
    GraphsComponent,
    Logs,
    ScriptsComposer
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {

  isLoggedIn = false;
  currentPage = 'dashboard';

  login() {
    this.isLoggedIn = true;
  }

  setPage(page: string) {
    this.currentPage = page;
  }
}