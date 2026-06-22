import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data';
import { HttpClient } from '@angular/common/http';

interface MysqlInstance {
  host: string;
  port: string;
  user: string;
  password?: string;
  database: string;
  selectedMysqlFiles: File[];
}

interface FileInstance {
  sourcePath: string;
  selectedFiles: File[];
}

@Component({
  selector: 'app-scripts-composer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './scripts-composer.html',
  styleUrl: './scripts-composer.css'
})
export class ScriptsComposer implements OnInit {

  private apiUrl = 'http://localhost:3000/api';

  constructor(
    public data: DataService, 
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    // MODIFICATO: Ordiniamo i dati storici al contrario appena arrivano da Mockoon
    this.http.get<any[]>(`${this.apiUrl}/scripts`).subscribe(res => {
      this.data.scripts = Array.isArray(res) ? [...res].reverse() : [];
      this.refreshUI();
    });
    this.http.get<any[]>(`${this.apiUrl}/customers`).subscribe(res => {
      this.data.customers = res;
      this.refreshUI();
    });
    this.http.get<any[]>(`${this.apiUrl}/servers`).subscribe(res => {
      this.data.servers = res;
      this.refreshUI();
    });
  }

  searchId = '';
  showCreate = false;
  showEdit = false;

  currentStep = 1;
  activeEditTab = 1;

  isChangingFtpPassword = false;
  activeKebabId: string | null = null;

  scriptForm = {
    id: '',
    path: '',
    schedule: '',
    serverId: '',
    customerId: '',
    mysqlComponent: false,     
    mysqlInstances: [] as MysqlInstance[],
    filesComponent: false,     
    fileInstances: [] as FileInstance[],
    ftpHost: '',
    ftpUser: '',
    ftpPassword: '',
    type: 'FILE'
  };

  selectedScript: any = null;
  private originalScriptBackup: string = '';

  private refreshUI() {
    setTimeout(() => {
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }, 0);
  }

  toggleKebab(scriptId: string, event: MouseEvent) {
    event.stopPropagation(); 
    this.activeKebabId = this.activeKebabId === scriptId ? null : scriptId;
    this.refreshUI();
  }

  closeKebab() {
    this.activeKebabId = null;
    this.refreshUI();
  }

  openCreate() {
    this.closeKebab();
    this.currentStep = 1; 
    this.resetForm();
    this.showCreate = true;
    this.refreshUI();
  }

  nextStep() { 
    if (this.currentStep < 3) this.currentStep++; 
    this.refreshUI();
  }
  
  prevStep() { 
    if (this.currentStep > 1) this.currentStep--; 
    this.refreshUI();
  }

  getFilteredServers(): any[] {
    if (!this.scriptForm.customerId) return [];
    return this.data.servers.filter(s => s.customerId === this.scriptForm.customerId);
  }

  onCustomerChange() { 
    this.scriptForm.serverId = ''; 
    this.refreshUI();
  }

  addMysqlInstance() {
    this.scriptForm.mysqlInstances.push({
      host: '', port: '3306', user: '', password: '', database: '', selectedMysqlFiles: []
    });
    this.refreshUI();
  }

  removeMysqlInstance(index: number) { 
    this.scriptForm.mysqlInstances.splice(index, 1); 
    this.refreshUI();
  }
  
  addFileInstance() { 
    this.scriptForm.fileInstances.push({ sourcePath: 'C:\\', selectedFiles: [] }); 
    this.refreshUI();
  }
  
  removeFileInstance(index: number) { 
    this.scriptForm.fileInstances.splice(index, 1); 
    this.refreshUI();
  }

  toggleComponent(type: 'mysql' | 'files') {
    if (type === 'mysql') {
      this.scriptForm.mysqlInstances = this.scriptForm.mysqlComponent 
        ? [ { host: '', port: '3306', user: '', password: '', database: '', selectedMysqlFiles: [] } ] 
        : [];
    } else if (type === 'files') {
      this.scriptForm.fileInstances = this.scriptForm.filesComponent 
        ? [ { sourcePath: 'C:\\', selectedFiles: [] } ] 
        : [];
    }
    this.refreshUI();
  }

  onMysqlFilesSelected(event: any, index: number) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const filesArray = Array.from(input.files);
      this.scriptForm.mysqlInstances[index].selectedMysqlFiles = [
        ...this.scriptForm.mysqlInstances[index].selectedMysqlFiles, 
        ...filesArray
      ];
      setTimeout(() => {
        input.value = '';
        this.refreshUI();
      }, 100);
    }
  }

  removeMysqlFile(instanceIndex: number, fileIndex: number) {
    this.scriptForm.mysqlInstances[instanceIndex].selectedMysqlFiles.splice(fileIndex, 1);
    this.refreshUI();
  }

  onFilesSelected(event: any, index: number) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const filesArray = Array.from(input.files);
      this.scriptForm.fileInstances[index].selectedFiles = [
        ...this.scriptForm.fileInstances[index].selectedFiles, 
        ...filesArray
      ];
      setTimeout(() => {
        input.value = '';
        this.refreshUI();
      }, 100);
    }
  }

  removeFile(instanceIndex: number, fileIndex: number) {
    this.scriptForm.fileInstances[instanceIndex].selectedFiles.splice(fileIndex, 1);
    this.refreshUI();
  }

  isStep1Valid(): boolean { return !!(this.scriptForm.path && this.scriptForm.schedule && this.scriptForm.customerId && this.scriptForm.serverId); }

  isStep2Valid(): boolean {
    if (!this.scriptForm.mysqlComponent && !this.scriptForm.filesComponent) return false;
    if (this.scriptForm.mysqlComponent) {
      if (this.scriptForm.mysqlInstances.length === 0) return false;
      for (let instance of this.scriptForm.mysqlInstances) {
        if (!instance.host || !instance.port || !instance.user || !instance.database || instance.selectedMysqlFiles.length === 0) return false;
      }
    }
    if (this.scriptForm.filesComponent) {
      if (this.scriptForm.fileInstances.length === 0) return false;
      for (let instance of this.scriptForm.fileInstances) {
        if (!instance.sourcePath || instance.selectedFiles.length === 0) return false;
      }
    }
    return true;
  }

  isStep3Valid(): boolean { return !!(this.scriptForm.ftpHost && this.scriptForm.ftpUser && this.scriptForm.ftpPassword); }
  isTab1Valid(): boolean { return this.isStep1Valid(); }
  isTab2Valid(): boolean { return this.isStep2Valid(); }
  isTab3Valid(): boolean {
    return this.isChangingFtpPassword 
      ? !!(this.scriptForm.ftpHost && this.scriptForm.ftpUser && this.scriptForm.ftpPassword)
      : !!(this.scriptForm.ftpHost && this.scriptForm.ftpUser);
  }

  isFormValid(): boolean { return this.isTab1Valid() && this.isTab2Valid() && this.isTab3Valid(); }

  hasChanges(): boolean {
    if (!this.showEdit) return false;
    const currentFtpPassword = this.isChangingFtpPassword ? this.scriptForm.ftpPassword : this.selectedScript.ftpPassword;
    const currentCompareState = {
      id: this.scriptForm.id,
      path: this.scriptForm.path,
      schedule: this.scriptForm.schedule,
      serverId: this.scriptForm.serverId,
      customerId: this.scriptForm.customerId,
      type: this.scriptForm.type,
      mysqlComponent: this.scriptForm.mysqlComponent,
      mysqlInstances: this.scriptForm.mysqlInstances,
      filesComponent: this.scriptForm.filesComponent,
      fileInstances: this.scriptForm.fileInstances,
      ftpHost: this.scriptForm.ftpHost,
      ftpUser: this.scriptForm.ftpUser,
      ftpPassword: currentFtpPassword
    };
    return this.originalScriptBackup !== JSON.stringify(currentCompareState);
  }

  // 1. CREAZIONE SCRIPT: Inserimento forzato IN CIMA
  createScript() {
    const id = 'SCR-' + Math.floor(Math.random() * 99999);
    const newScript = {
      id,
      path: this.scriptForm.path,
      schedule: this.scriptForm.schedule,
      serverId: this.scriptForm.serverId,
      customerId: this.scriptForm.customerId,
      type: this.scriptForm.type,
      mysqlComponent: this.scriptForm.mysqlComponent,
      mysqlInstances: this.scriptForm.mysqlInstances,
      filesComponent: this.scriptForm.filesComponent,
      fileInstances: this.scriptForm.fileInstances,
      ftpHost: this.scriptForm.ftpHost,
      ftpUser: this.scriptForm.ftpUser,
      ftpPassword: this.scriptForm.ftpPassword
    };

    this.http.post(`${this.apiUrl}/scripts`, newScript).subscribe(() => {
      // CORRETTO: Mettiamo lo script in cima esplicitamente all'array del servizio
      this.data.scripts = [newScript, ...this.data.scripts];
      
      const newLog = {
        id: 'LOG-' + Math.floor(Math.random() * 99999),
        level: 'SUCCESS',
        message: 'Script configurato con sorgenti multiple creato con successo',
        scriptId: id,
        executionId: 'EXE-' + Math.floor(Math.random() * 99999),
        createdAt: new Date().toISOString()
      };

      this.http.post(`${this.apiUrl}/logs`, newLog).subscribe(() => {
        this.data.logs = [newLog, ...this.data.logs];
        this.refreshUI();
      });

      this.refreshUI();
    });

    this.showCreate = false;
    this.resetForm();
  }

  openEdit(script: any) {
    this.closeKebab();
    this.selectedScript = script;
    this.activeEditTab = 1; 
    this.isChangingFtpPassword = false; 
    
    this.scriptForm = { 
      ...script, 
      mysqlComponent: !!script.mysqlComponent,
      mysqlInstances: script.mysqlInstances ? JSON.parse(JSON.stringify(script.mysqlInstances)) : [],
      filesComponent: !!script.filesComponent,
      fileInstances: script.fileInstances ? JSON.parse(JSON.stringify(script.fileInstances)) : [],
      ftpPassword: script.ftpPassword ?? '' 
    };

    this.originalScriptBackup = JSON.stringify({
      id: this.scriptForm.id,
      path: this.scriptForm.path,
      schedule: this.scriptForm.schedule,
      serverId: this.scriptForm.serverId,
      customerId: this.scriptForm.customerId,
      type: this.scriptForm.type,
      mysqlComponent: this.scriptForm.mysqlComponent,
      mysqlInstances: this.scriptForm.mysqlInstances,
      filesComponent: this.scriptForm.filesComponent,
      fileInstances: this.scriptForm.fileInstances,
      ftpHost: this.scriptForm.ftpHost,
      ftpUser: this.scriptForm.ftpUser,
      ftpPassword: this.scriptForm.ftpPassword
    });

    this.showEdit = true;
    this.refreshUI();
  }

  saveEdit() {
    if (!this.hasChanges()) {
      this.showEdit = false;
      return;
    }

    const index = this.data.scripts.findIndex(s => s.id === this.selectedScript.id);
    if (index !== -1) {
      const originalScript = this.data.scripts[index];
      const currentFtpPassword = this.isChangingFtpPassword ? this.scriptForm.ftpPassword : originalScript.ftpPassword;

      const updatedScript = { 
        ...originalScript,
        path: this.scriptForm.path,
        schedule: this.scriptForm.schedule,
        serverId: this.scriptForm.serverId,
        customerId: this.scriptForm.customerId,
        mysqlComponent: this.scriptForm.mysqlComponent,
        mysqlInstances: this.scriptForm.mysqlInstances,
        filesComponent: this.scriptForm.filesComponent,
        fileInstances: this.scriptForm.fileInstances,
        ftpHost: this.scriptForm.ftpHost,
        ftpUser: this.scriptForm.ftpUser,
        ftpPassword: currentFtpPassword
      };

      const changedFields: string[] = [];
      if (originalScript.path !== updatedScript.path) changedFields.push('path');
      if (originalScript.schedule !== updatedScript.schedule) changedFields.push('schedule');
      if (originalScript.customerId !== updatedScript.customerId) changedFields.push('customer');
      if (originalScript.serverId !== updatedScript.serverId) changedFields.push('server');
      if (originalScript.ftpHost !== updatedScript.ftpHost) changedFields.push('ftpHost');
      if (originalScript.ftpUser !== updatedScript.ftpUser) changedFields.push('ftpUser');
      if (originalScript.ftpPassword !== updatedScript.ftpPassword) changedFields.push('ftpPassword');
      
      if (originalScript.mysqlComponent !== updatedScript.mysqlComponent || JSON.stringify(originalScript.mysqlInstances) !== JSON.stringify(updatedScript.mysqlInstances)) {
        changedFields.push('database mysql');
      }
      if (originalScript.filesComponent !== updatedScript.filesComponent || JSON.stringify(originalScript.fileInstances) !== JSON.stringify(updatedScript.fileInstances)) {
        changedFields.push('files fisici');
      }

      this.http.put(`${this.apiUrl}/scripts/${updatedScript.id}`, updatedScript).subscribe(() => {
        const updatedScriptsArray = [...this.data.scripts];
        updatedScriptsArray[index] = updatedScript;
        this.data.scripts = updatedScriptsArray;

        const fieldsList = changedFields.join(', ');
        const newLog = {
          id: 'LOG-' + Math.floor(Math.random() * 99999),
          scriptId: this.scriptForm.id,
          level: 'INFO',
          message: `Script modificato. Campi aggiornati: [${fieldsList}].`,
          createdAt: new Date().toISOString(), 
          executionId: 'N/A'
        };

        this.http.post(`${this.apiUrl}/logs`, newLog).subscribe(() => {
          this.data.logs = [newLog, ...this.data.logs];
          this.refreshUI();
        });

        this.refreshUI();
      });
    }
    this.showEdit = false;
  }

  deleteScript(id: string) {
    this.closeKebab();
    if (confirm('Sei sicuro di voler eliminare questo script?')) {
      const scriptDaEliminare = this.data.scripts.find((s: any) => s.id === id);
      
      this.http.delete(`${this.apiUrl}/scripts/${id}`).subscribe(() => {
        this.data.scripts = this.data.scripts.filter((s: any) => s.id !== id);
        
        const deleteLog = {
          id: 'LOG-' + Math.floor(100000 + Math.random() * 900000), 
          scriptId: id,
          customerId: scriptDaEliminare?.customerId || '',
          serverId: scriptDaEliminare?.serverId || '',
          level: 'WARNING',
          createdAt: new Date().toISOString(), 
          message: `Lo script con ID ${id} è stato rimosso.`,
          executionId: 'N/A'
        };

        this.http.post(`${this.apiUrl}/logs`, deleteLog).subscribe(() => {
          this.data.logs = [deleteLog, ...this.data.logs];
          this.refreshUI();
        });

        this.refreshUI();
      });
    }
  }

  // 4. GETTER DI FILTRO: Mantiene i dati così come sono memorizzati, applicando solo la barra di ricerca
  get filteredScripts(): any[] {
    if (!this.data.scripts) return [];
    if (!this.searchId.trim()) return this.data.scripts;
    
    const query = this.searchId.trim().toLowerCase();
    return this.data.scripts.filter(s => s.id.toLowerCase().includes(query));
  }

  getCustomerName(id: any) { return this.data.customers.find(c => c.id == id)?.name ?? 'Unknown'; }
  getServerName(id: any) { return this.data.servers.find(s => s.id == id)?.name ?? 'Unknown'; }

  resetForm() {
    this.scriptForm = {
      id: '', path: '', schedule: '', serverId: '', customerId: '', mysqlComponent: false,
      mysqlInstances: [], filesComponent: false, fileInstances: [], ftpHost: '', ftpUser: '', ftpPassword: '', type: 'FILE'
    };
    this.isChangingFtpPassword = false;
    this.originalScriptBackup = '';
  }
}