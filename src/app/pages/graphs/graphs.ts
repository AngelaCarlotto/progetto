import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-graphs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './graphs.html',
  styleUrl: './graphs.css',
})
export class GraphsComponent implements OnInit {

  loading = false;
  
  // Contatori per i grafici a barre
  mysqlCount = 0;
  filesCount = 0;

  globalSuccess = 0;
  globalError = 0;

  todaySuccess = 0;
  todayError = 0;

  // Altezze CSS per le barre (Max 130px)
  mysqlHeight = '10px';
  filesHeight = '10px';
  globalSuccessHeight = '10px';
  globalErrorHeight = '10px';
  todaySuccessHeight = '10px';
  todayErrorHeight = '10px';

  // Variabili per il grafico storico lineare cartesiano
  svgPoints = '';
  chartPoints: Array<{ x: number; y: number; count: number; label: string }> = [];

  showToast = false;
  testoToast = '';

  mockData = {
    backupStorage: 68,
    activeServers: 12,
    trafficGb: 450
  };

  private lastScriptsLength = 0;
  private lastLogsLength = 0;

  constructor(
    public data: DataService,        
    private cdr: ChangeDetectorRef,
    private zone: NgZone 
  ) {}

  ngOnInit() {
    this.calculateAllStats();
    this.lastScriptsLength = this.data.scripts?.length || 0;
    this.lastLogsLength = this.data.logs?.length || 0;
  }

  ricalcola() {
    this.loading = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      try {
        this.calculateAllStats();
      } catch (error) {
        console.error("Errore nel ricalcolo dei grafici:", error);
      }

      this.loading = false;
      this.cdr.detectChanges();
    }, 600); 
  } 

  calculateAllStats() {
    // Reset contatori e array ad ogni ricalcolo
    this.mysqlCount = 0;
    this.filesCount = 0;
    this.globalSuccess = 0;
    this.globalError = 0;
    this.todaySuccess = 0;
    this.todayError = 0;
    this.chartPoints = []; 

    const todayStr = new Date().toISOString().split('T')[0];

    // Conteggio componenti degli script
    if (this.data.scripts && this.data.scripts.length > 0) {
      this.data.scripts.forEach((s: any) => {
        if (s.mysqlComponent || s.hasMysql) {
          if (s.selectedMysqlFiles && Array.isArray(s.selectedMysqlFiles)) {
            this.mysqlCount += s.selectedMysqlFiles.length;
          } else {
            this.mysqlCount += 1;
          }
        }
        if (s.filesComponent || s.hasFiles) {
          if (s.selectedFiles && Array.isArray(s.selectedFiles)) {
            this.filesCount += s.selectedFiles.length;
          } else {
            this.filesCount += 1;
          }
        }
      });
    }

    // Conteggio logs globali e del giorno corrente
    if (this.data.logs && this.data.logs.length > 0) {
      this.data.logs.forEach((l: any) => {
        const isError = l.level?.toLowerCase() === 'error' || l.message?.toLowerCase().includes('error');
        const logDateStr = l.createdAt ? l.createdAt.substring(0, 10) : '';

        if (isError) {
          this.globalError++;
        } else {
          this.globalSuccess++;
        }

        if (logDateStr === todayStr) {
          if (isError) {
            this.todayError++;
          } else {
            this.todaySuccess++;
          }
        }
      });
    }

    // Calcolo altezze delle barre basate sui massimi proporzionali
    const maxSteps = Math.max(this.mysqlCount, this.filesCount, 1);
    this.mysqlHeight = this.mysqlCount > 0 ? `${(this.mysqlCount / maxSteps) * 130}px` : '10px';
    this.filesHeight = this.filesCount > 0 ? `${(this.filesCount / maxSteps) * 130}px` : '10px';

    const maxGlobal = Math.max(this.globalSuccess, this.globalError, 1);
    this.globalSuccessHeight = this.globalSuccess > 0 ? `${(this.globalSuccess / maxGlobal) * 130}px` : '10px';
    this.globalErrorHeight = this.globalError > 0 ? `${(this.globalError / maxGlobal) * 130}px` : '10px';

    const maxToday = Math.max(this.todaySuccess, this.todayError, 1);
    this.todaySuccessHeight = this.todaySuccess > 0 ? `${(this.todaySuccess / maxToday) * 130}px` : '10px';
    this.todayErrorHeight = this.todayError > 0 ? `${(this.todayError / maxToday) * 130}px` : '10px';

    // Generazione geometrica del piano cartesiano storico
    this.generateHistorySvg();
  }
   
  generateHistorySvg() {
    const points: string[] = [];
    this.chartPoints = [];
    
    // Assi SVG impostati: X va da 40 a 400. Altezza base asse X a Y=130.
    const startX = 40;
    const endX = 400;
    const totalHeight = 130; 
    const topMargin = 20;    
    const usableHeight = totalHeight - topMargin; 
    
    const dayStepX = (endX - startX) / 9; 

    let maxDayLogs = 1;
    const last10DaysDates: string[] = [];

    // Recupero date e scansione del picco massimo log per ridimensionamento dinamico Y
    for (let i = 9; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      last10DaysDates.push(dateStr);

      const dayLogsCount = this.data.logs ? this.data.logs.filter((l: any) => l.createdAt && l.createdAt.substring(0, 10) === dateStr).length : 0;
      if (dayLogsCount > maxDayLogs) maxDayLogs = dayLogsCount;
    }

    // Costruzione delle coordinate cartesiane finali
    for (let i = 0; i < 10; i++) {
      const dateStr = last10DaysDates[i];
      const x = startX + (i * dayStepX);
      
      const dayLogsCount = this.data.logs ? this.data.logs.filter((l: any) => l.createdAt && l.createdAt.substring(0, 10) === dateStr).length : 0;
      const y = totalHeight - ((dayLogsCount / maxDayLogs) * usableHeight);
      points.push(`${x},${y}`);

      let labelText = '';
      if (i === 9) {
        labelText = 'Oggi';
      } else {
        const d = new Date(dateStr);
        labelText = d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }).replace('.', '');
      }

      this.chartPoints.push({
        x,
        y,
        count: dayLogsCount,
        label: labelText
      });
    }

    this.svgPoints = points.join(' ');
  }
}