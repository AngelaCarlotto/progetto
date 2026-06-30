import { Component, OnInit, DoCheck, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-graphs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './graphs.html',
  styleUrl: './graphs.css',
})
export class GraphsComponent implements OnInit, DoCheck {

  private apiUrl = 'http://localhost:3000/api';
  loading = false;
  
  mysqlCount = 0;
  filesCount = 0;
  globalSuccess = 0;
  globalError = 0;
  todaySuccess = 0;
  todayError = 0;

  mysqlHeight = '10px';
  filesHeight = '10px';
  globalSuccessHeight = '10px';
  globalErrorHeight = '10px';
  todaySuccessHeight = '10px';
  todayErrorHeight = '10px';

  svgPoints = '';
  chartPoints: Array<{ x: number; y: number; count: number; label: string }> = [];

  showToast = false;
  testoToast = '';

  mockData = { backupStorage: 68, activeServers: 12, trafficGb: 450 };

  private lastScriptsLength = 0;

  constructor(
    public data: DataService,        
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.syncDataFromServer();
  }

  ngDoCheck() {
    const currentLength = this.data.scripts ? this.data.scripts.length : 0;
    if (currentLength !== this.lastScriptsLength) {
      this.lastScriptsLength = currentLength;
      this.calculateAllStats();
      this.refreshUI();
    }
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

  syncDataFromServer(callback?: () => void) {
    this.http.get<any[]>(`${this.apiUrl}/scripts`).subscribe({
      next: (scripts) => {
        this.data.scripts = Array.isArray(scripts) ? [...scripts].reverse() : [];
        this.lastScriptsLength = this.data.scripts.length;
        
        this.http.get<any[]>(`${this.apiUrl}/logs`).subscribe({
          next: (logs) => {
            this.data.logs = logs;
            this.calculateAllStats();
            
            if (callback) callback();
            this.refreshUI();
          },
          error: (err) => {
            console.error("Errore caricamento LOGS:", err);
            if (callback) callback();
          }
        });
      },
      error: (err) => {
        console.error("Errore caricamento SCRIPTS:", err);
        if (callback) callback();
      }
    });
  }

  ricalcola() {
    this.loading = true;
    this.refreshUI();

    setTimeout(() => {
      this.syncDataFromServer(() => {
        const payloadGraphs = {
          timestamp: new Date().toISOString(),
          components: { mysql: this.mysqlCount, files: this.filesCount },
          globalStats: { success: this.globalSuccess, error: this.globalError },
          todayStats: { success: this.todaySuccess, error: this.todayError },
          historicalPoints: this.chartPoints.map(p => ({ data: p.label, count: p.count }))
        };

        const httpOptions = {
          headers: new HttpHeaders({ 'Content-Type': 'application/json', 'Accept': 'application/json' })
        };

        this.http.post<any>(`${this.apiUrl}/graph/summary`, payloadGraphs, httpOptions).subscribe({
          next: () => {
            this.loading = false;
            console.log("%c Pagina grafici aggiornata con successo! ", "color: #ad2ced");
            this.refreshUI();
          },
          error: () => {
            this.loading = false;
            this.refreshUI();
          }
        });
      });
    }, 600); 
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

  calculateAllStats() {
    this.mysqlCount = 0; 
    this.filesCount = 0;
    this.globalSuccess = 0; 
    this.globalError = 0;
    this.todaySuccess = 0; 
    this.todayError = 0;

    const dLocal = new Date();
    const todayStr = `${dLocal.getFullYear()}-${String(dLocal.getMonth() + 1).padStart(2, '0')}-${String(dLocal.getDate()).padStart(2, '0')}`;

    const currentScripts = this.data.scripts || [];
    const currentLogs = this.data.logs || [];

    currentScripts.forEach((s: any) => {
      const haMysql = s.mysqlComponent === true || String(s.mysqlComponent).toLowerCase() === 'true';
      if (haMysql) this.mysqlCount += 1;

      const haFiles = s.filesComponent === true || String(s.filesComponent).toLowerCase() === 'true';
      if (haFiles) this.filesCount += 1;
    });

    currentLogs.forEach((l: any) => {
      if (this.isScriptLog(l)) {
        const currentLevel = String(l.level || '').toLowerCase().trim();
        const logDateStr = this.normalizeDateToISOString(l.createdAt);
        
        if (currentLevel === 'success') {
          this.globalSuccess++;
        } else if (currentLevel === 'error') {
          this.globalError++;
        }

        if (logDateStr === todayStr) {
          if (currentLevel === 'success') {
            this.todaySuccess++;
          } else if (currentLevel === 'error') {
            this.todayError++;
          }
        }
      }
    });

    const totalScriptsActive = Math.max(currentScripts.length, 1);
    
    this.mysqlHeight = `${Math.min((this.mysqlCount / totalScriptsActive) * 130, 130)}px`;
    this.filesHeight = `${Math.min((this.filesCount / totalScriptsActive) * 130, 130)}px`;

    const maxGlobal = Math.max(this.globalSuccess, this.globalError, 1);
    this.globalSuccessHeight = `${(this.globalSuccess / maxGlobal) * 130}px`;
    this.globalErrorHeight = `${(this.globalError / maxGlobal) * 130}px`;

    const maxToday = Math.max(this.todaySuccess, this.todayError, 1);
    this.todaySuccessHeight = `${(this.todaySuccess / maxToday) * 130}px`;
    this.todayErrorHeight = `${(this.todayError / maxToday) * 130}px`;

    this.generateHistorySvg(currentLogs);
  }
   
  generateHistorySvg(currentLogs: any[]) {
    const points: string[] = [];
    this.chartPoints = [];
    const startX = 40; const endX = 400; const totalHeight = 130; const usableHeight = 110;
    const dayStepX = (endX - startX) / 9; 

    let maxDayLogs = 1;
    const last10DaysDates: string[] = [];

    for (let i = 9; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const anno = d.getFullYear();
      const mese = String(d.getMonth() + 1).padStart(2, '0');
      const giorno = String(d.getDate()).padStart(2, '0');
      const dateStr = `${anno}-${mese}-${giorno}`;
      last10DaysDates.push(dateStr);
      
      const dayLogsCount = currentLogs.filter((l: any) => {
        const currentLevel = String(l.level || '').toLowerCase().trim();
        return this.normalizeDateToISOString(l.createdAt) === dateStr && 
               this.isScriptLog(l) && 
               currentLevel === 'success';
      }).length;
      
      if (dayLogsCount > maxDayLogs) maxDayLogs = dayLogsCount;
    }

    for (let i = 0; i < 10; i++) {
      const dateStr = last10DaysDates[i];
      const x = startX + (i * dayStepX);
      
      const dayLogsCount = currentLogs.filter((l: any) => {
        const currentLevel = String(l.level || '').toLowerCase().trim();
        return this.normalizeDateToISOString(l.createdAt) === dateStr && 
               this.isScriptLog(l) && 
               currentLevel === 'success';
      }).length;
      
      const y = totalHeight - ((dayLogsCount / maxDayLogs) * usableHeight);
      points.push(`${x},${y}`);

      const dLocal = new Date();
      const oggiLocaleStr = `${dLocal.getFullYear()}-${String(dLocal.getMonth() + 1).padStart(2, '0')}-${String(dLocal.getDate()).padStart(2, '0')}`;

      const labelText = dateStr === oggiLocaleStr ? 'Oggi' : new Date(dateStr).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
      this.chartPoints.push({ x, y, count: dayLogsCount, label: labelText });
    }
    this.svgPoints = points.join(' ');
  }

  private refreshUI() {
    this.cdr.detectChanges();
  }
}