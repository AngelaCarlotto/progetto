import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
export class DashboardComponent implements OnInit {

  private apiUrl = 'http://localhost:3000/api'; 
  loading = false;

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

  constructor(
    public data: DataService, 
    private cdr: ChangeDetectorRef, 
    private http: HttpClient
  ) {}

  // Avvia il caricamento e l'elaborazione dei dati della dashboard.
  ngOnInit() {
    this.loadDashboardData();
  }

  // Converte e normalizza i vari formati di data stringa nel formato standard ISO (YYYY-MM-DD).
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

  // Verifica se un log appartiene a uno script controllando l'ID o il testo del messaggio.
  private isScriptLog(log: any): boolean {
    if (!log) return false;
    const hasScriptId = log.scriptId && String(log.scriptId).startsWith('SCR-');
    const isBackupMessage = log.message && (
      log.message.toLowerCase().includes('script') || 
      log.message.toLowerCase().includes('backup')
    );
    return !!(hasScriptId || isBackupMessage);
  }

  // Calcola le statistiche locali, invia il report al server Mockoon e aggiorna i grafici e i contatori.
  loadDashboardData(callback?: () => void) {
    if (this.data.customers && this.data.customers.length > 0 && 
        this.data.scripts && this.data.scripts.length > 0 && 
        this.data.logs && this.data.logs.length > 0) {
      
      this.generateLineChart(); 
      
      const historicalPointsPayload = this.chartPoints.map(pt => ({
        data: pt.label,   
        count: pt.count   
      }));

      const totalCustomersReal = this.data.customers.length;
      const activeScriptsReal = this.data.scripts.length;
      
      const todayStr = new Date().toISOString().split('T')[0];
      const todayBackupReal = this.data.logs.filter(l => {
        const logDateISO = this.normalizeDateToISOString(l.createdAt);
        return logDateISO === todayStr && 
               (String(l.level).toLowerCase() === 'success' || String(l.level).toLowerCase() === 'info') && 
               this.isScriptLog(l);
      }).length;

      const totalErrors = this.data.logs.filter(l => String(l.level).toLowerCase() === 'error' && this.isScriptLog(l)).length;
      const totalLogs = this.data.logs.length;
      const errorRateReal = totalLogs > 0 ? ((totalErrors / totalLogs) * 100).toFixed(1) + '%' : '0%';

      let mysqlCount = 0;
      let filesCount = 0;
      this.data.scripts.forEach((s: any) => {
        if (s.mysqlComponent === true || String(s.mysqlComponent) === 'true') {
          mysqlCount += (s.mysqlInstances?.length || 1);
        }
        if (s.filesComponent === true || String(s.filesComponent) === 'true') {
          filesCount += (s.fileInstances?.length || 1);
        }
      });

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

      console.log("Stiamo inviando la POST a Mockoon con la Request completa:", payloadDashboard);

      const httpOptions = {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        })
      };

      this.http.post<any>(`${this.apiUrl}/dashboard/summary`, payloadDashboard, httpOptions).subscribe({
        next: (responseFromMockoon) => {
          console.log("Mockoon ha ricevuto la richiesta con successo (200 OK).");

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

          if (callback) callback();
          this.refreshUI();
        },
        error: (err) => {
          console.error("Errore comunicazione con Mockoon, mantengo dati locali:", err);
          
          this.totalCustomers = payloadDashboard.totalCustomers;
          this.activeScripts = payloadDashboard.activeScripts;
          this.todayBackup = payloadDashboard.todaybackup;
          this.globalErrorRate = payloadDashboard.globalErrorRate;

          if (callback) callback();
          this.refreshUI();
        }
      });

    } else {
      console.warn("Dati non ancora pronti nel DataService. Nuovo tentativo tra 500ms...");
      setTimeout(() => {
        this.loadDashboardData(callback);
      }, 500);
    }
  }

  // Attiva lo stato di caricamento visivo e rinfresca i dati complessivi della dashboard.
  refreshDashboard() {
    this.loading = true;
    this.refreshUI();

    setTimeout(() => {
      this.loadDashboardData(() => {
        this.loading = false;
        console.log('Dashboard aggiornata ed interfaccia sincronizzata con successo!');
        this.refreshUI();
      });
    }, 600);
  }

  // Calcola le coordinate cartesiane (X, Y) basate sui log degli ultimi 5 giorni per disegnare il grafico lineare SVG.
  generateLineChart() {
    if (!this.data.logs || this.data.logs.length === 0) {
      this.lineChartPath = 'M 40 180 L 480 180'; 
      this.chartPoints = []; 
      return;
    }
    
    this.chartPoints = [];
    const pointsStrings: string[] = []; 
    const startX = 40; 
    const endX = 480; 
    const widthStep = (endX - startX) / 4;

    const logDates = this.data.logs
      .map(l => this.normalizeDateToISOString(l.createdAt))
      .filter((date, index, self) => date !== '' && self.indexOf(date) === index)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    let targetDates = logDates.slice(-5);

    if (targetDates.length < 5) {
      targetDates = [];
      for (let i = 4; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        targetDates.push(d.toISOString().split('T')[0]);
      }
    }

    targetDates.forEach((targetDateStr, i) => {
      const count = this.data.logs.filter((l: any) => {
        const logDateISO = this.normalizeDateToISOString(l.createdAt);
        const currentLevel = String(l.level).toLowerCase();
        return logDateISO === targetDateStr && 
               (currentLevel === 'success' || currentLevel === 'info') && 
               this.isScriptLog(l);
      }).length;

      const x = startX + (i * widthStep); 
      
      const y = Math.max(20, 180 - (count * 15)); 
      
      pointsStrings.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);

      const todayStr = new Date().toISOString().split('T')[0];
      let labelText = '';
      if (targetDateStr === todayStr) {
        labelText = 'Oggi';
      } else {
        const d = new Date(targetDateStr);
        labelText = isNaN(d.getTime()) ? targetDateStr : d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
      }
      
      this.chartPoints.push({ x, y, count, label: labelText });
    });

    this.lineChartPath = pointsStrings.join(' ');
  }

  // Notifica ad Angular di controllare i cambiamenti per aggiornare l'interfaccia grafica.
  private refreshUI() {
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }
}