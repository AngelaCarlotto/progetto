import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data'; 

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {

  loading = false;

  // Variabili grafico Donut
  mysqlPercentage = 50;
  filesPercentage = 50;
  donutGradient = 'conic-gradient(#2563eb 0% 50%, #10b981 50% 100%)';
  hasData = false;

  // Variabile dinamica per la linea del grafico storico
  lineChartPath = 'M 0 180 L 500 180'; 

  constructor(
    public data: DataService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.calculatePercentagesAndCharts();
  }

  refreshDashboard() {
    this.loading = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      try {
        this.calculatePercentagesAndCharts();
      } catch (error) {
        console.error("Errore nel ricalcolo dei grafici:", error);
      }

      this.loading = false;
      this.cdr.detectChanges();
    }, 600);
  }

  calculatePercentagesAndCharts() {
    let mysqlSteps = 0;
    let filesSteps = 0;

    if (this.data && this.data.scripts && this.data.scripts.length > 0) {
      this.data.scripts.forEach((s: any) => {
        if (s.mysqlComponent && s.selectedMysqlFiles) {
          mysqlSteps += Array.isArray(s.selectedMysqlFiles) ? s.selectedMysqlFiles.length : 0;
        }
        if (s.filesComponent && s.selectedFiles) {
          filesSteps += Array.isArray(s.selectedFiles) ? s.selectedFiles.length : 0;
        }
      });
    }

    const totalSteps = mysqlSteps + filesSteps;

    if (totalSteps > 0) {
      this.hasData = true;
      this.mysqlPercentage = Math.round((mysqlSteps / totalSteps) * 100);
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
      this.lineChartPath = 'M 0 180 L 500 180';
      return;
    }

    const points: string[] = [];
    const widthStep = 500 / 4; 

    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (4 - i)); 
      const dateStr = d.toISOString().split('T')[0];

      const count = this.data.logs.filter((l: any) => 
        l.createdAt && 
        l.createdAt.substring(0, 10) === dateStr &&
        l.level?.toLowerCase() === 'success'
      ).length;

      const x = i * widthStep;
      const y = Math.max(20, 180 - (count * 25)); 

      points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
    }

    this.lineChartPath = points.join(' ');
  }

  // FUNZIONI DI CONTEGGIO IN TEMPO REALE
  getClientiTotali(): number { 
    return this.data.customers ? this.data.customers.length : 0; 
  }
  
  getScriptAttivi(): number { 
    return this.data.scripts ? this.data.scripts.length : 0; 
  }
  
  getBackupOggi(): number {
    if (!this.data.logs) return 0;
    const todayStr = new Date().toISOString().split('T')[0];
    return this.data.logs.filter(l => 
      l.createdAt && 
      l.createdAt.substring(0, 10) === todayStr &&
      l.level?.toLowerCase() === 'success'
    ).length;
  }
  
  getErroriRilevati(): number {
    if (!this.data.logs) return 0;
    return this.data.logs.filter(l => l.level?.toLowerCase() === 'error').length;
  }
}