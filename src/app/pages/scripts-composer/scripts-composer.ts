import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data';

@Component({
  selector: 'app-scripts-composer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './scripts-composer.html',
  styleUrl: './scripts-composer.css'
})

export class ScriptsComposer {

  constructor(public data: DataService) {}

  searchId = '';
  showCreate = false;
  showEdit = false;
  editPassword: string = '';

  currentStep = 1;
  activeEditTab = 1;

  scriptForm = {
    id: '',
    path: '',
    schedule: '',
    serverId: '',
    customerId: '',
    mysqlComponent: false,     
    selectedMysqlFiles: [] as File[], 
    filesComponent: false,     
    selectedFiles: [] as File[],      
    ftpHost: '',
    ftpUser: '',
    ftpPassword: '',
    type: 'FILE'
  };

  
  selectedScript: any = null;

  openCreate() {
    this.currentStep = 1; 
    this.resetForm();
    this.showCreate = true;
  }

  nextStep() {
    if (this.currentStep < 3) {
      this.currentStep++;
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  isStep1Valid(): boolean {
    return !!(this.scriptForm.path && this.scriptForm.schedule && this.scriptForm.customerId && this.scriptForm.serverId);
  }

  isStep2Valid(): boolean {
    if (!this.scriptForm.mysqlComponent && !this.scriptForm.filesComponent) return false;
    if (this.scriptForm.mysqlComponent && this.scriptForm.selectedMysqlFiles.length === 0) {
      return !!(this.scriptForm.filesComponent && this.scriptForm.selectedFiles.length > 0);
    }
    if (this.scriptForm.filesComponent && this.scriptForm.selectedFiles.length === 0) {
      return !!(this.scriptForm.mysqlComponent && this.scriptForm.selectedMysqlFiles.length > 0);
    }
    return true;
  }

  isStep3Valid(): boolean {
    return !!(this.scriptForm.ftpHost && this.scriptForm.ftpUser && this.scriptForm.ftpPassword);
  }

  isTab1Valid(): boolean {
    return !!(this.scriptForm.path && this.scriptForm.schedule && this.scriptForm.customerId && this.scriptForm.serverId);
  }

  isTab2Valid(): boolean {
    if (!this.scriptForm.mysqlComponent && !this.scriptForm.filesComponent) return false;
    if (this.scriptForm.mysqlComponent && this.scriptForm.selectedMysqlFiles.length === 0) {
      return !!(this.scriptForm.filesComponent && this.scriptForm.selectedFiles.length > 0);
    }
    if (this.scriptForm.filesComponent && this.scriptForm.selectedFiles.length === 0) {
      return !!(this.scriptForm.mysqlComponent && this.scriptForm.selectedMysqlFiles.length > 0);
    }
    return true;
  }

  isTab3Valid(): boolean {
    return !!(this.scriptForm.ftpHost && this.scriptForm.ftpUser && this.scriptForm.ftpPassword);
  }

  isFormValid(): boolean {
    return this.isTab1Valid() && this.isTab2Valid() && this.isTab3Valid();
  }
  
  toggleComponent(type: 'mysql' | 'files') {
    if (type === 'mysql') {
      if (!this.scriptForm.mysqlComponent) {
        this.scriptForm.selectedMysqlFiles = [];
      }
    } else if (type === 'files') {
      if (!this.scriptForm.filesComponent) {
        this.scriptForm.selectedFiles = [];
      }
    }
  }

  onMysqlFilesSelected(event: any) {
    const files: FileList = event.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        this.scriptForm.selectedMysqlFiles.push(files[i]);
      }
    }
    event.target.value = '';
  }

  removeMysqlFile(index: number) {
    this.scriptForm.selectedMysqlFiles.splice(index, 1);
  }

  onFilesSelected(event: any) {
    const files: FileList = event.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        this.scriptForm.selectedFiles.push(files[i]);
      }
    }
    event.target.value = ''; 
  }

  removeFile(index: number) {
    this.scriptForm.selectedFiles.splice(index, 1);
  }

  createScript() {
    const id = 'SCR-' + Math.floor(Math.random() * 99999);

    this.data.scripts.push({
      id,
      path: this.scriptForm.path,
      schedule: this.scriptForm.schedule,
      serverId: this.scriptForm.serverId,
      customerId: this.scriptForm.customerId,
      type: this.scriptForm.type,
      mysqlComponent: this.scriptForm.mysqlComponent,
      selectedMysqlFiles: this.scriptForm.selectedMysqlFiles, 
      filesComponent: this.scriptForm.filesComponent,
      selectedFiles: this.scriptForm.selectedFiles,           
      ftpHost: this.scriptForm.ftpHost,
      ftpUser: this.scriptForm.ftpUser
    });

    this.data.logs.push({
      id: 'LOG-' + Math.floor(Math.random() * 99999),
      level: 'SUCCESS',
      message: 'Script creato con successo',
      scriptId: id,
      executionId: 'EXE-' + Math.floor(Math.random() * 99999),
      createdAt: new Date().toISOString() // <-- Rimosso lo split
    });

    this.showCreate = false;
    this.resetForm();

    this.data.saveToStorage(); 

    this.showCreate = false;
    this.resetForm();
  }

   openEdit(script: any) {
    this.selectedScript = script;
    this.activeEditTab = 1; 
    this.scriptForm = { 
      ...script, 
      mysqlComponent: !!(script.selectedMysqlFiles && script.selectedMysqlFiles.length > 0),
      selectedMysqlFiles: script.selectedMysqlFiles ?? [],
      
      filesComponent: !!(script.selectedFiles && script.selectedFiles.length > 0),
      selectedFiles: script.selectedFiles ?? [] 
    };
    this.showEdit = true;
  }

  saveEdit() {
    const index = this.data.scripts.findIndex(s => s.id === this.selectedScript.id);
    if (index !== -1) {
      this.data.scripts[index] = { 
        ...this.data.scripts[index],
        path: this.scriptForm.path,
        schedule: this.scriptForm.schedule,
        serverId: this.scriptForm.serverId,
        customerId: this.scriptForm.customerId,
        mysqlComponent: this.scriptForm.mysqlComponent,
        selectedMysqlFiles: this.scriptForm.selectedMysqlFiles,
        filesComponent: this.scriptForm.filesComponent,
        selectedFiles: this.scriptForm.selectedFiles,
        ftpHost: this.scriptForm.ftpHost,
        ftpUser: this.scriptForm.ftpUser,
        ftpPassword: this.scriptForm.ftpPassword
      };

      this.data.logs.push({
        id: 'LOG-' + Math.floor(Math.random() * 99999),
        scriptId: this.scriptForm?.id || 'SRV-1',
        level: 'INFO',
        message: "Script modificato dall'utente",
        createdAt: new Date().toISOString(), 
        executionId: 'N/A'
      });
    }
    this.showEdit = false;
    this.data.saveToStorage(); 
    this.showEdit = false;
  }

  deleteScript(id: string) {
  if (confirm('Sei sicuro di voler eliminare questo script?')) {
    if (this.data && this.data.scripts) {
      
      const scriptDaEliminare = this.data.scripts.find((s: any) => s.id === id);
      const customerId = scriptDaEliminare ? scriptDaEliminare.customerId : '';
      const serverId = scriptDaEliminare ? scriptDaEliminare.serverId : '';

      // 2. CREIAMO IL NUOVO LOG DI ELIMINAZIONE
      if (this.data.logs) {
        const nuovoLog = {
          id: 'LOG-' + Math.floor(100000 + Math.random() * 900000), 
          scriptId: id,
          customerId: customerId,
          serverId: serverId,
          level: 'INFO',
          createdAt: new Date().toISOString(), 
          message: `Lo script con ID ${id} è stato rimosso dall'utente.` 
        };

        this.data.logs.unshift(nuovoLog);
      }
      
      this.data.scripts = this.data.scripts.filter((s: any) => s.id !== id);
      
       this.data.saveToStorage();
    }
  }
}

  filteredScripts() {
    if (!this.searchId) return this.data.scripts;
    return this.data.scripts.filter(s => s.id.toLowerCase().includes(this.searchId.toLowerCase()));
  }

  getCustomerName(id: any) {
    return this.data.customers.find(c => c.id == id)?.name ?? 'Unknown';
  }

  getServerName(id: any) {
    return this.data.servers.find(s => s.id == id)?.name ?? 'Unknown';
  }

  resetForm() {
    this.scriptForm = {
      id: '',
      path: '',
      schedule: '',
      serverId: '',
      customerId: '',
      mysqlComponent: false,
      selectedMysqlFiles: [],
      filesComponent: false,
      selectedFiles: [],
      ftpHost: '',
      ftpUser: '',
      ftpPassword: '',
      type: 'FILE'
    };
  }
}