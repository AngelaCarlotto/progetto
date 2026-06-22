import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-graphs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './graphs.html',
  styleUrl: './graphs.css',
})
export class GraphsComponent implements OnInit {

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

  constructor(
    public data: DataService,        
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Scarica i dati freschi da Mockoon all'avvio, ma i grafici si aggiorneranno 
    // anche se i dati cambiano da altre pagine grazie al ciclo di controllo.
    this.syncDataFromServer();
  }

  syncDataFromServer() {
    this.http.get<any[]>(`${this.apiUrl}/scripts`).subscribe(scripts => {
      // Invertiamo l'ordine qui se vogliamo che siano coerenti con la tabella composer
      this.data.scripts = Array.isArray(scripts) ? [...scripts].reverse() : [];
      
      this.http.get<any[]>(`${this.apiUrl}/logs`).subscribe(logs => {
        this.data.logs = logs;
        this.calculateAllStats();
      });
    });
  }

  ricalcola() {
    this.loading = true;
    this.refreshUI();

    setTimeout(() => {
      this.syncDataFromServer();
      this.loading = false;
      this.refreshUI();
    }, 600); 
  } 

  // MODIFICATO: Diventa un getter per l'HTML. Ricalcola le statistiche 
  // in tempo reale ogni volta che Angular avvia il Change Detection!
  get triggerStatsUpdate(): boolean {
    this.calculateAllStats();
    return true;
  }

  calculateAllStats() {
    this.mysqlCount = 0; this.filesCount = 0;
    this.globalSuccess = 0; this.globalError = 0;
    this.todaySuccess = 0; this.todayError = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    // Lettura sicura tramite i tuoi getter del DataService
    const currentScripts = this.data.scripts || [];
    const currentLogs = this.data.logs || [];

    currentScripts.forEach((s: any) => {
      if (s.mysqlComponent) this.mysqlCount += (s.mysqlInstances?.length || 1);
      if (s.filesComponent) this.filesCount += (s.fileInstances?.length || 1);
    });

    currentLogs.forEach((l: any) => {
      const isError = l.level?.toLowerCase() === 'error' || l.level?.toLowerCase() === 'warning';
      const logDateStr = l.createdAt ? l.createdAt.substring(0, 10) : '';
      if (isError) this.globalError++; else this.globalSuccess++;
      if (logDateStr === todayStr) {
        if (isError) this.todayError++; else this.todaySuccess++;
      }
    });

    const maxSteps = Math.max(this.mysqlCount, this.filesCount, 1);
    this.mysqlHeight = `${(this.mysqlCount / maxSteps) * 130}px`;
    this.filesHeight = `${(this.filesCount / maxSteps) * 130}px`;

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
      const dateStr = d.toISOString().split('T')[0];
      last10DaysDates.push(dateStr);
      const dayLogsCount = currentLogs.filter((l: any) => l.createdAt?.substring(0, 10) === dateStr).length;
      if (dayLogsCount > maxDayLogs) maxDayLogs = dayLogsCount;
    }

    for (let i = 0; i < 10; i++) {
      const dateStr = last10DaysDates[i];
      const x = startX + (i * dayStepX);
      const dayLogsCount = currentLogs.filter((l: any) => l.createdAt?.substring(0, 10) === dateStr).length;
      const y = totalHeight - ((dayLogsCount / maxDayLogs) * usableHeight);
      points.push(`${x},${y}`);

      const labelText = i === 9 ? 'Oggi' : new Date(dateStr).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
      this.chartPoints.push({ x, y, count: dayLogsCount, label: labelText });
    }
    this.svgPoints = points.join(' ');
  }

  private refreshUI() {
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }
}