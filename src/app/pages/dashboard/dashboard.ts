import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data'; 
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {

  private apiUrl = 'http://localhost:3000/api'; 
  loading = false;

  mysqlPercentage = 0;
  filesPercentage = 0;
  donutGradient = 'conic-gradient(#e2e8f0 0% 100%)';
  hasData = false;

  chartPoints: Array<{ x: number; y: number; count: number; label: string }> = [];
  lineChartPath: string = 'M 40 180 L 480 180'; 

  constructor(
    public data: DataService, 
    private cdr: ChangeDetectorRef, 
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  private normalizeDateToISOString(dateStr: any): string {
    if (!dateStr || typeof dateStr !== 'string') return '';
    let normalized = dateStr.trim().replace(/\//g, '-');
    if (normalized.includes('T')) {
      return normalized.split('T')[0];
    }
    const parti = normalized.split(' ')[0].split('-');
    if (parti.length === 3 && parti[0].length !== 4) {
      return `${parti[2]}-${parti[1]}-${parti[0]}`;
    }
    return normalized.substring(0, 10);
  }

  private isScriptLog(log: any): boolean {
    if (!log) return false;
    
    const hasScriptId = log.scriptId && String(log.scriptId).startsWith('SCR-');
    const isBackupMessage = log.message && (
      log.message.toLowerCase().includes('script') || 
      log.message.toLowerCase().includes('backup')
    );

    return !!(hasScriptId || isBackupMessage);
  }

  loadDashboardData(callback?: () => void) {
    if (!callback && this.data.scripts && this.data.scripts.length > 0 && this.data.logs && this.data.logs.length > 0) {
      this.calculatePercentagesAndCharts();
      this.refreshUI();
      return;
    }

    this.http.get<any[]>(`${this.apiUrl}/customers`).subscribe({
      next: (customers) => {
        this.data.customers = customers;

        this.http.get<any[]>(`${this.apiUrl}/scripts`).subscribe({
          next: (scripts) => {
            this.data.scripts = scripts;

            this.http.get<any[]>(`${this.apiUrl}/logs`).subscribe({
              next: (logs) => {
                this.data.logs = Array.isArray(logs) ? [...logs] : [];
                
                this.calculatePercentagesAndCharts();

                if (callback) callback();
                this.refreshUI();
              },
              error: (err) => {
                console.error("Errore caricamento logs:", err);
                if (callback) callback();
              }
            });
          },
          error: (err) => {
            console.error("Errore caricamento scripts:", err);
            if (callback) callback();
          }
        });
      },
      error: (err) => {
        console.error("Errore caricamento customers:", err);
        if (callback) callback();
      }
    });
  }

  refreshDashboard() {
    this.loading = true;
    this.refreshUI();

    setTimeout(() => {
      this.loadDashboardData(() => {
        this.loading = false;
        
        console.log('Dashboard aggiornata con successo da Mockoon!');
        
        this.refreshUI();
      });
    }, 600);
  }

  calculatePercentagesAndCharts() {
    let mysqlScriptsCount = 0; 
    let filesScriptsCount = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    if (this.data.scripts && this.data.scripts.length > 0) {
      this.data.scripts.forEach((s: any) => {
        const scriptDate = this.normalizeDateToISOString(s.createdAt);
        if (scriptDate === todayStr) {
          if (s.mysqlComponent === true || String(s.mysqlComponent) === 'true') mysqlScriptsCount++;
          if (s.filesComponent === true || String(s.filesComponent) === 'true') filesScriptsCount++;
        }
      });
    }

    const totalScriptsToday = mysqlScriptsCount + filesScriptsCount;

    if (totalScriptsToday > 0) {
      this.hasData = true;
      this.mysqlPercentage = Math.round((mysqlScriptsCount / totalScriptsToday) * 100);
      this.filesPercentage = 100 - this.mysqlPercentage;
      this.donutGradient = `conic-gradient(#2563eb 0% ${this.mysqlPercentage}%, #10b981 ${this.mysqlPercentage}% 100%)`;
    } else {
      this.hasData = false;
      this.mysqlPercentage = 0;
      this.filesPercentage = 0;
      this.donutGradient = 'conic-gradient(#e2e8f0 0% 100%)'; 
    }
    this.generateLineChart();
  }

  generateLineChart() {
    if (!this.data.logs || this.data.logs.length === 0) {
      this.lineChartPath = 'M 40 180 L 480 180'; 
      this.chartPoints = []; 
      return;
    }
    
    const pointsStrings: string[] = []; 
    this.chartPoints = [];
    const startX = 40; 
    const endX = 480; 
    const widthStep = (endX - startX) / 4;
    const labels = ['-4 gg', '-3 gg', '-2 gg', '-1 gg', 'Oggi'];

    for (let i = 0; i < 5; i++) {
      const d = new Date(); 
      d.setDate(d.getDate() - (4 - i)); 
      const targetDateStr = d.toISOString().split('T')[0];
      
      const count = this.data.logs.filter((l: any) => {
        const logDateISO = this.normalizeDateToISOString(l.createdAt);
        const currentLevel = String(l.level).toLowerCase();
        return logDateISO === targetDateStr && 
               (currentLevel === 'success' || currentLevel === 'info') && 
               this.isScriptLog(l);
      }).length;

      const x = startX + (i * widthStep); 
      const y = Math.max(20, 180 - (count * 20)); 
      
      pointsStrings.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
      this.chartPoints.push({ x, y, count, label: labels[i] });
    }
    this.lineChartPath = pointsStrings.join(' ');
  }

  getClientiTotali(): number { return this.data.customers ? this.data.customers.length : 0; }
  getScriptAttivi(): number { return this.data.scripts ? this.data.scripts.length : 0; }
  
  getBackupOggi(): number {
    if (!this.data.logs) return 0;
    const todayStr = new Date().toISOString().split('T')[0];
    return this.data.logs.filter(l => {
      const logDateISO = this.normalizeDateToISOString(l.createdAt);
      const currentLevel = String(l.level).toLowerCase();
      return logDateISO === todayStr && 
             (currentLevel === 'success' || currentLevel === 'info') && 
             this.isScriptLog(l);
    }).length;
  }
  
  getErroriRilevati(): number { 
    if (!this.data.logs) return 0;
    return this.data.logs.filter(l => {
      const currentLevel = String(l.level).toLowerCase();
      return currentLevel === 'error' && this.isScriptLog(l);
    }).length; 
  }

  private refreshUI() {
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }
}