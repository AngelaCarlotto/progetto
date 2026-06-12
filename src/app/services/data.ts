import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  // Iniezione del token per capire su quale piattaforma siamo (Server o Browser)
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  public scripts: any[] = [];
  public logs: any[] = [];
  public customers: any[] = [];
  public servers: any[] = [];

  constructor() {
    if (this.isBrowser) {
      this.scripts = JSON.parse(localStorage.getItem('backup_scripts') || '[]');
      this.logs = JSON.parse(localStorage.getItem('backup_logs') || '[]');
      this.customers = JSON.parse(localStorage.getItem('backup_customers') || '[]');
      this.servers = JSON.parse(localStorage.getItem('backup_servers') || '[]');
    }
  }

  saveToStorage() {
    if (this.isBrowser) {
      localStorage.setItem('backup_scripts', JSON.stringify(this.scripts));
      localStorage.setItem('backup_logs', JSON.stringify(this.logs));
      localStorage.setItem('backup_customers', JSON.stringify(this.customers));
      localStorage.setItem('backup_servers', JSON.stringify(this.servers));
    }
  }
}