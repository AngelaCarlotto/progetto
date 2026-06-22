import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs'; // <-- AGGIUNTO PER LA REATTIVITÀ

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  // 1. Creiamo i flussi reattivi privati (BehaviorSubject)
  private _scripts$ = new BehaviorSubject<any[]>([]);
  private _logs$ = new BehaviorSubject<any[]>([]);
  private _customers$ = new BehaviorSubject<any[]>([]);
  private _servers$ = new BehaviorSubject<any[]>([]);

  // 2. Creiamo i Getter e Setter "intelligenti".
  // Quando il componente scrive o legge "this.data.customers", Angular attiva la reattività all'istante!
  get scripts(): any[] { return this._scripts$.value; }
  set scripts(val: any[]) { 
    this._scripts$.next(Array.isArray(val) ? val : []); 
    this.saveToStorage(); // Salva in automatico nel localStorage a ogni modifica!
  }

  get logs(): any[] { return this._logs$.value; }
  set logs(val: any[]) { 
    this._logs$.next(Array.isArray(val) ? val : []); 
    this.saveToStorage(); 
  }

  get customers(): any[] { return this._customers$.value; }
  set customers(val: any[]) { 
    this._customers$.next(Array.isArray(val) ? val : []); 
    this.saveToStorage(); 
  }

  get servers(): any[] { return this._servers$.value; }
  set servers(val: any[]) { 
    this._servers$.next(Array.isArray(val) ? val : []); 
    this.saveToStorage(); 
  }

  constructor() {
    if (this.isBrowser) {
      // Carichiamo i dati dal localStorage e li spingiamo dentro i BehaviorSubject tramite i setter
      this.scripts = JSON.parse(localStorage.getItem('backup_scripts') || '[]');
      this.logs = JSON.parse(localStorage.getItem('backup_logs') || '[]');
      this.customers = JSON.parse(localStorage.getItem('backup_customers') || '[]');
      this.servers = JSON.parse(localStorage.getItem('backup_servers') || '[]');
    }
  }

  saveToStorage() {
    if (this.isBrowser) {
      // Usiamo il valore corrente dei flussi per aggiornare il localStorage
      localStorage.setItem('backup_scripts', JSON.stringify(this._scripts$.value));
      localStorage.setItem('backup_logs', JSON.stringify(this._logs$.value));
      localStorage.setItem('backup_customers', JSON.stringify(this._customers$.value));
      localStorage.setItem('backup_servers', JSON.stringify(this._servers$.value));
    }
  }
}