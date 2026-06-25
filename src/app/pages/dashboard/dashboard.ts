import { Component, OnInit, DoCheck, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data'; 
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit, DoCheck {

  private apiUrl = 'http://localhost:3000/api'; 
  loading = false;
  showToast = false;       
  testoToast = '';

  totalCustomers = 0;
  activeScripts = 0;
  todayBackup = 0;
  globalErrorRate = '0%';

  mysqlPercentage = 0;
  filesPercentage = 0;
  donutGradient = 'conic-gradient(#e2e8f0 0% 100%)';
  hasData = false;

  chartPoints: Array<{ x: number; y: number; count: number; label: string }> = [];
  lineChartPath: string = 'M 40 180 L 480 180'; 

  private lastScriptsLength = 0;
  private isManualRefresh = false;

  constructor(
    public data: DataService, 
    private cdr: ChangeDetectorRef, 
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.syncFreshData();
  }

  ngDoCheck() {
    const currentLength = this.data.scripts ? this.data.scripts.length : 0;
    if (currentLength !== this.lastScriptsLength) {
      this.lastScriptsLength = currentLength;
      this.loadDashboardData();
    }
  }

  syncFreshData(callback?: () => void) {
    this.http.get<any[]>(`${this.apiUrl}/scripts`).subscribe({
      next: (scripts) => {
        this.data.scripts = Array.isArray(scripts) ? [...scripts].reverse() : [];
        this.lastScriptsLength = this.data.scripts.length;
        
        this.http.get<any[]>(`${this.apiUrl}/customers`).subscribe({
          next: (cust) => {
            this.data.customers = cust;
            
            this.http.get<any[]>(`${this.apiUrl}/logs`).subscribe({
              next: (logs) => {
                this.data.logs = logs;
                this.loadDashboardData();
                if (callback) callback();
              },
              error: () => { if (callback) callback(); }
            });
          },
          error: () => { if (callback) callback(); }
        });
      },
      error: () => { if (callback) callback(); }
    });
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
    const hasScriptId = log.scriptId && String(log.scriptId).trim() !== '';
    const isBackupMessage = log.message && (
      log.message.toLowerCase().includes('script') || 
      log.message.toLowerCase().includes('backup') ||
      log.message.toLowerCase().includes('creato') ||
      log.message.toLowerCase().includes('eliminato')
    );
    return !!(hasScriptId || isBackupMessage);
  }

  loadDashboardData() {
    this.generateLineChart(); 
    
    const historicalPointsPayload = this.chartPoints.map(pt => ({
      data: pt.label,   
      count: pt.count   
    }));

    const totalCustomersReal = this.data.customers ? this.data.customers.length : 0;
    const activeScriptsReal = this.data.scripts ? this.data.scripts.length : 0;
    
    const dLocal = new Date();
    const todayStr = `${dLocal.getFullYear()}-${String(dLocal.getMonth() + 1).padStart(2, '0')}-${String(dLocal.getDate()).padStart(2, '0')}`;
    
    const currentLogs = this.data.logs || [];
    const todayBackupReal = currentLogs.filter(l => {
      const logDateISO = this.normalizeDateToISOString(l.createdAt);
      const currentLevel = String(l.level).toLowerCase();
      return logDateISO === todayStr && 
             this.isScriptLog(l) &&
             (currentLevel === 'success' || currentLevel === 'info');
    }).length;

    const totalErrors = currentLogs.filter(l => String(l.level).toLowerCase() === 'error' && this.isScriptLog(l)).length;
    const totalLogs = currentLogs.filter(l => this.isScriptLog(l)).length;
    const errorRateReal = totalLogs > 0 ? ((totalErrors / totalLogs) * 100).toFixed(1) + '%' : '0%';

    let mysqlCount = 0;
    let filesCount = 0;
    
    if (this.data.scripts) {
      this.data.scripts.forEach((s: any) => {
        const haMysql = s.mysqlComponent === true || String(s.mysqlComponent).toLowerCase() === 'true';
        if (haMysql) {
          mysqlCount += (s.mysqlInstances && s.mysqlInstances.length > 0 ? s.mysqlInstances.length : 1);
        }

        const haFiles = s.filesComponent === true || String(s.filesComponent).toLowerCase() === 'true';
        if (haFiles) {
          filesCount += (s.fileInstances && s.fileInstances.length > 0 ? s.fileInstances.length : 1);
        }
      });
    }

    const payloadDashboard = {
      totalCustomers: totalCustomersReal,
      activeScripts: activeScriptsReal,
      todaybackup: todayBackupReal,
      mysql: mysqlCount,
      files: filesCount,
      totali: mysqlCount + filesCount,
      globalErrorRate: errorRateReal,
      historicalPoints: historicalPointsPayload 
    };

    const httpOptions = {
      headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' })
    };

    this.http.post<any>(`${this.apiUrl}/dashboard/summary`, payloadDashboard, httpOptions).subscribe({
      next: () => {
        this.totalCustomers = payloadDashboard.totalCustomers;
        this.activeScripts = payloadDashboard.activeScripts;
        this.todayBackup = payloadDashboard.todaybackup;
        this.globalErrorRate = payloadDashboard.globalErrorRate;

        this.mysqlPercentage = payloadDashboard.totali > 0 ? Math.round((payloadDashboard.mysql / payloadDashboard.totali) * 100) : 0;
        this.filesPercentage = payloadDashboard.totali > 0 ? 100 - this.mysqlPercentage : 0;
        
        if (payloadDashboard.totali > 0) {
          this.hasData = true;
          this.donutGradient = `conic-gradient(#2563eb 0% ${this.mysqlPercentage}%, #10b981 ${this.mysqlPercentage}% 100%)`;
        } else {
          this.hasData = false;
          this.donutGradient = 'conic-gradient(#e2e8f0 0% 100%)';
        }
        
        this.refreshUI();

        if (this.isManualRefresh) {
          console.log(
            "%c Dashboard aggiornata con successo!", "color: #ad2ced"
          );
          this.isManualRefresh = false;
        }
      },
      error: () => {
        this.totalCustomers = payloadDashboard.totalCustomers;
        this.activeScripts = payloadDashboard.activeScripts;
        this.todayBackup = payloadDashboard.todaybackup;
        this.globalErrorRate = payloadDashboard.globalErrorRate;
        this.isManualRefresh = false;
        this.refreshUI();
      }
    });
  }

  refreshDashboard() {
    this.loading = true;
    this.isManualRefresh = true;
    this.refreshUI();

    setTimeout(() => {
      this.syncFreshData(() => {
        this.loading = false;
        this.testoToast = 'Dashboard aggiornata con successo!';
        this.showToast = true;
        this.refreshUI();

        setTimeout(() => {
          this.showToast = false;
          this.refreshUI();
        }, 3000);
      });
    }, 600);
  }

  generateLineChart() {
    this.chartPoints = [];
    const pointsStrings: string[] = []; 
    const startX = 40; 
    const endX = 480; 
    const widthStep = (endX - startX) / 4;

    const targetDates: string[] = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const anno = d.getFullYear();
      const mese = String(d.getMonth() + 1).padStart(2, '0');
      const giorno = String(d.getDate()).padStart(2, '0');
      targetDates.push(`${anno}-${mese}-${giorno}`);
    }

    const currentLogs = this.data.logs || [];
    targetDates.forEach((targetDateStr, i) => {
      const count = currentLogs.filter((l: any) => {
        const logDateISO = this.normalizeDateToISOString(l.createdAt);
        const currentLevel = String(l.level).toLowerCase();
        
        return logDateISO === targetDateStr && 
               this.isScriptLog(l) &&
               (currentLevel === 'success' || currentLevel === 'info');
      }).length;

      const x = startX + (i * widthStep); 
      const y = Math.max(20, 180 - (count * 15)); 
      
      pointsStrings.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);

      const dLocal = new Date();
      const oggiLocaleStr = `${dLocal.getFullYear()}-${String(dLocal.getMonth() + 1).padStart(2, '0')}-${String(dLocal.getDate()).padStart(2, '0')}`;
      
      let labelText = '';
      if (targetDateStr === oggiLocaleStr) {
        labelText = 'Oggi';
      } else {
        const d = new Date(targetDateStr);
        labelText = isNaN(d.getTime()) ? targetDateStr : d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
      }
      
      this.chartPoints.push({ x, y, count, label: labelText });
    });

    this.lineChartPath = pointsStrings.join(' ');
  }
    
  private refreshUI() {
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }
}