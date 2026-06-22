import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data'; 
import { HttpClient } from '@angular/common/http'; // <-- AGGIUNTO

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {

  private apiUrl = 'http://localhost:3000/api'; // <-- AGGIUNTO
  loading = false;

  mysqlPercentage = 50;
  filesPercentage = 50;
  donutGradient = 'conic-gradient(#2563eb 0% 50%, #10b981 50% 100%)';
  hasData = false;

  chartPoints: Array<{ x: number; y: number; count: number; label: string }> = [];
  lineChartPath: string = 'M 40 180 L 480 180'; 

  constructor(public data: DataService, private cdr: ChangeDetectorRef, private http: HttpClient) {} // <-- MODIFICATO

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.http.get<any[]>(`${this.apiUrl}/scripts`).subscribe(scripts => {
      this.data.scripts = scripts;
      this.http.get<any[]>(`${this.apiUrl}/logs`).subscribe(logs => {
        this.data.logs = logs;
        this.calculatePercentagesAndCharts();
      });
    });
  }

  refreshDashboard() {
    this.loading = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.loadDashboardData();
      this.loading = false;
      this.cdr.detectChanges();
    }, 600);
  }

  calculatePercentagesAndCharts() {
    let mysqlSteps = 0; let filesSteps = 0;

    if (this.data.scripts) {
      this.data.scripts.forEach((s: any) => {
        if (s.mysqlComponent) mysqlSteps += (s.selectedMysqlFiles?.length || 0);
        if (s.filesComponent) filesSteps += (s.selectedFiles?.length || 0);
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
      this.donutGradient = 'conic-gradient(#e2e8f0 0% 100%)'; 
    }
    this.generateLineChart();
  }

  generateLineChart() {
    if (!this.data.logs || this.data.logs.length === 0) {
      this.lineChartPath = 'M 40 180 L 480 180'; this.chartPoints = []; return;
    }
    const pointsStrings: string[] = []; this.chartPoints = [];
    const startX = 40; const endX = 480; const widthStep = (endX - startX) / 4;
    const labels = ['-4 gg', '-3 gg', '-2 gg', '-1 gg', 'Oggi'];

    for (let i = 0; i < 5; i++) {
      const d = new Date(); d.setDate(d.getDate() - (4 - i)); 
      const dateStr = d.toISOString().split('T')[0];
      const count = this.data.logs.filter((l: any) => l.createdAt?.substring(0, 10) === dateStr && l.level?.toLowerCase() === 'success').length;
      const x = startX + (i * widthStep); const y = Math.max(20, 180 - (count * 20)); 
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
    return this.data.logs.filter(l => l.createdAt?.substring(0, 10) === todayStr && l.level?.toLowerCase() === 'success').length;
  }
  getErroriRilevati(): number { return this.data.logs ? this.data.logs.filter(l => l.level?.toLowerCase() === 'error').length : 0; }
}