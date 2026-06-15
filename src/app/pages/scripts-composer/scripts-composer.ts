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

  currentStep = 1;
  activeEditTab = 1;

  // Stato per verificare se l'utente sta modificando intenzionalmente la password FTP
  isChangingFtpPassword = false;

  scriptForm = {
    id: '',
    path: '',
    schedule: '',
    serverId: '',
    customerId: '',
    
    // Componente MySQL con i nuovi campi richiesti
    mysqlComponent: false,     
    selectedMysqlFiles: [] as File[], 
    mysqlHost: '',
    mysqlPort: '3306',
    mysqlUser: '',
    mysqlPassword: '',
    mysqlDatabase: '',

    // Componente File Fisici
    filesComponent: false,     
    selectedFiles: [] as File[],      
    filesSourcePath: 'C:\\', // Path predefinito impostato su C:
    
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

  // Restituisce solo i server associati al customer selezionato
  getFilteredServers(): any[] {
    if (!this.scriptForm.customerId) return [];
    return this.data.servers.filter(s => s.customerId === this.scriptForm.customerId);
  }

  // Quando cambia il customer, resetta il server precedentemente selezionato
  onCustomerChange() {
    this.scriptForm.serverId = '';
  }

  isStep1Valid(): boolean {
    return !!(this.scriptForm.path && this.scriptForm.schedule && this.scriptForm.customerId && this.scriptForm.serverId);
  }

  isStep2Valid(): boolean {
    if (!this.scriptForm.mysqlComponent && !this.scriptForm.filesComponent) return false;
    
    // Validazione MySQL: se attivo, servono i dati di connessione e almeno un file dump
    if (this.scriptForm.mysqlComponent) {
      const mysqlDataValid = !!(this.scriptForm.mysqlHost && this.scriptForm.mysqlPort && this.scriptForm.mysqlUser && this.scriptForm.mysqlDatabase);
      const mysqlFilesValid = this.scriptForm.selectedMysqlFiles.length > 0;
      if (!mysqlDataValid || !mysqlFilesValid) return false;
    }

    // Validazione File Fisici: se attivo, serve il path sorgente e almeno un file/cartella
    if (this.scriptForm.filesComponent) {
      const filesDataValid = !!this.scriptForm.filesSourcePath;
      const filesValid = this.scriptForm.selectedFiles.length > 0;
      if (!filesDataValid || !filesValid) return false;
    }

    return true;
  }

  isStep3Valid(): boolean {
    return !!(this.scriptForm.ftpHost && this.scriptForm.ftpUser && this.scriptForm.ftpPassword);
  }

  isTab1Valid(): boolean {
    return this.isStep1Valid();
  }

  isTab2Valid(): boolean {
    return this.isStep2Valid();
  }

  // Nella modifica la password è valida se è già presente o se l'utente la sta riscrivendo adesso
  isTab3Valid(): boolean {
    if (this.isChangingFtpPassword) {
      return !!(this.scriptForm.ftpHost && this.scriptForm.ftpUser && this.scriptForm.ftpPassword);
    }
    return !!(this.scriptForm.ftpHost && this.scriptForm.ftpUser);
  }

  isFormValid(): boolean {
    return this.isTab1Valid() && this.isTab2Valid() && this.isTab3Valid();
  }
  
  toggleComponent(type: 'mysql' | 'files') {
    if (type === 'mysql') {
      if (!this.scriptForm.mysqlComponent) {
        this.scriptForm.selectedMysqlFiles = [];
        this.scriptForm.mysqlHost = '';
        this.scriptForm.mysqlPort = '3306';
        this.scriptForm.mysqlUser = '';
        this.scriptForm.mysqlPassword = '';
        this.scriptForm.mysqlDatabase = '';
      }
    } else if (type === 'files') {
      if (!this.scriptForm.filesComponent) {
        this.scriptForm.selectedFiles = [];
        this.scriptForm.filesSourcePath = 'C:\\';
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
      mysqlHost: this.scriptForm.mysqlHost,
      mysqlPort: this.scriptForm.mysqlPort,
      mysqlUser: this.scriptForm.mysqlUser,
      mysqlPassword: this.scriptForm.mysqlPassword,
      mysqlDatabase: this.scriptForm.mysqlDatabase,

      filesComponent: this.scriptForm.filesComponent,
      selectedFiles: this.scriptForm.selectedFiles,           
      filesSourcePath: this.scriptForm.filesSourcePath,

      ftpHost: this.scriptForm.ftpHost,
      ftpUser: this.scriptForm.ftpUser,
      ftpPassword: this.scriptForm.ftpPassword
    });

    this.data.logs.push({
      id: 'LOG-' + Math.floor(Math.random() * 99999),
      level: 'SUCCESS',
      message: 'Script creato con successo',
      scriptId: id,
      executionId: 'EXE-' + Math.floor(Math.random() * 99999),
      createdAt: new Date().toISOString()
    });

    this.showCreate = false;
    this.resetForm();
    this.data.saveToStorage(); 
  }

  openEdit(script: any) {
    this.selectedScript = script;
    this.activeEditTab = 1; 
    this.isChangingFtpPassword = false; // Di base non obblighiamo a reinserire la password
    
    this.scriptForm = { 
      ...script, 
      mysqlComponent: !!script.mysqlComponent,
      selectedMysqlFiles: script.selectedMysqlFiles ?? [],
      mysqlHost: script.mysqlHost ?? '',
      mysqlPort: script.mysqlPort ?? '3306',
      mysqlUser: script.mysqlUser ?? '',
      mysqlPassword: script.mysqlPassword ?? '',
      mysqlDatabase: script.mysqlDatabase ?? '',

      filesComponent: !!script.filesComponent,
      selectedFiles: script.selectedFiles ?? [],
      filesSourcePath: script.filesSourcePath ?? 'C:\\',
      
      ftpPassword: script.ftpPassword ?? '' // Mantiene quella vecchia in memoria
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
        mysqlHost: this.scriptForm.mysqlHost,
        mysqlPort: this.scriptForm.mysqlPort,
        mysqlUser: this.scriptForm.mysqlUser,
        mysqlPassword: this.scriptForm.mysqlPassword,
        mysqlDatabase: this.scriptForm.mysqlDatabase,

        filesComponent: this.scriptForm.filesComponent,
        selectedFiles: this.scriptForm.selectedFiles,
        filesSourcePath: this.scriptForm.filesSourcePath,

        ftpHost: this.scriptForm.ftpHost,
        ftpUser: this.scriptForm.ftpUser,
        // Aggiorna la password nel database solo se l'utente ha scelto di modificarla
        ftpPassword: this.isChangingFtpPassword ? this.scriptForm.ftpPassword : this.data.scripts[index].ftpPassword
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
  }

  deleteScript(id: string) {
    if (confirm('Sei sicuro di voler eliminare questo script?')) {
      if (this.data && this.data.scripts) {
        const scriptDaEliminare = this.data.scripts.find((s: any) => s.id === id);
        const customerId = scriptDaEliminare ? scriptDaEliminare.customerId : '';
        const serverId = scriptDaEliminare ? scriptDaEliminare.serverId : '';

        if (this.data.logs) {
          this.data.logs.push({
            id: 'LOG-' + Math.floor(100000 + Math.random() * 900000), 
            scriptId: id,
            customerId: customerId,
            serverId: serverId,
            level: 'INFO',
            createdAt: new Date().toISOString(), 
            message: `Lo script con ID ${id} è stato rimosso dall'utente.`,
            executionId: 'N/A'
          });
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
      mysqlHost: '',
      mysqlPort: '3306',
      mysqlUser: '',
      mysqlPassword: '',
      mysqlDatabase: '',
      filesComponent: false,
      selectedFiles: [],
      filesSourcePath: 'C:\\',
      ftpHost: '',
      ftpUser: '',
      ftpPassword: '',
      type: 'FILE'
    };
    this.isChangingFtpPassword = false;
  }
}