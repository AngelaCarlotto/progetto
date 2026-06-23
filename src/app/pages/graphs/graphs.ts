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
    // MODIFICATO: Scarica da Mockoon solo se la memoria locale è vuota, 
    // preservando inserimenti ed eliminazioni fatti in locale
    if (this.data.scripts && this.data.scripts.length > 0 && this.data.logs && this.data.logs.length > 0) {
      this.calculateAllStats();
      this.refreshUI();
    } else {
      this.syncDataFromServer();
    }
  }

  syncDataFromServer(callback?: () => void) {
  this.http.get<any[]>(`${this.apiUrl}/scripts`).subscribe({
    next: (scripts) => {
      // Sovrascriviamo l'array locale solo ORA che i dati sono arrivati
      this.data.scripts = Array.isArray(scripts) ? [...scripts].reverse() : [];
      
      this.http.get<any[]>(`${this.apiUrl}/logs`).subscribe({
        next: (logs) => {
          this.data.logs = logs;
          this.calculateAllStats();
          
          // Se c'è una funzione di callback (es. spegnere il loading), eseguila ora
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

  // NON svuotiamo più i dati qui! Lasciamo i vecchi visibili finché non arrivano i nuovi.
  // Passiamo una callback a syncDataFromServer per spegnere il loading solo alla fine.
  setTimeout(() => {
    this.syncDataFromServer(() => {
      this.loading = false;
      // Mostriamo un piccolo toast o log per conferma
      console.log('Grafici aggiornati con successo da Mockoon!');
    });
  }, 600); // Manteniamo l'effetto flessibile del caricamento per l'utente
}

  get triggerStatsUpdate(): boolean {
    this.calculateAllStats();
    return true;
  }

  // Funzione helper interna per capire se il log appartiene a uno script (allineata alla Dashboard)
  private isScriptLog(log: any): boolean {
    if (!log) return false;
    const hasScriptId = log.scriptId && String(log.scriptId).startsWith('SCR-');
    const isBackupMessage = log.message && (
      log.message.toLowerCase().includes('script') || 
      log.message.toLowerCase().includes('backup')
    );
    return !!(hasScriptId || isBackupMessage);
  }

  calculateAllStats() {
    this.mysqlCount = 0; this.filesCount = 0;
    this.globalSuccess = 0; this.globalError = 0;
    this.todaySuccess = 0; this.todayError = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    const currentScripts = this.data.scripts || [];
    const currentLogs = this.data.logs || [];

    currentScripts.forEach((s: any) => {
      if (s.mysqlComponent) this.mysqlCount += (s.mysqlInstances?.length || 1);
      if (s.filesComponent) this.filesCount += (s.fileInstances?.length || 1);
    });

    currentLogs.forEach((l: any) => {
      // MODIFICATO: Rimosso il 'warning' dagli errori. Ora conta solo 'error'
      const isError = l.level?.toLowerCase() === 'error';
      const logDateStr = l.createdAt ? l.createdAt.substring(0, 10) : '';
      
      // Filtro di sicurezza per considerare solo i log relativi agli script
      if (this.isScriptLog(l)) {
        if (isError) this.globalError++; else this.globalSuccess++;
        if (logDateStr === todayStr) {
          if (isError) this.todayError++; else this.todaySuccess++;
        }
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
      
      // MODIFICATO: Anche lo storico dei punti conta solo i log validi degli script
      const dayLogsCount = currentLogs.filter((l: any) => 
        l.createdAt?.substring(0, 10) === dateStr && this.isScriptLog(l)
      ).length;
      
      if (dayLogsCount > maxDayLogs) maxDayLogs = dayLogsCount;
    }

    for (let i = 0; i < 10; i++) {
      const dateStr = last10DaysDates[i];
      const x = startX + (i * dayStepX);
      
      const dayLogsCount = currentLogs.filter((l: any) => 
        l.createdAt?.substring(0, 10) === dateStr && this.isScriptLog(l)
      ).length;
      
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