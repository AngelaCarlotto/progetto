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

  isChangingFtpPassword = false;

  activeKebabId: string | null = null;

  scriptForm = {
    id: '',
    path: '',
    schedule: '',
    serverId: '',
    customerId: '',
    
    mysqlComponent: false,     
    selectedMysqlFiles: [] as File[], 
    mysqlHost: '',
    mysqlPort: '3306',
    mysqlUser: '',
    mysqlPassword: '',
    mysqlDatabase: '',

    filesComponent: false,     
    selectedFiles: [] as File[],      
    filesSourcePath: 'C:\\', 
    
    ftpHost: '',
    ftpUser: '',
    ftpPassword: '',
    type: 'FILE'
  };

  selectedScript: any = null;

  // Gestisce apertura e chiusura del menu a tre puntini
  toggleKebab(scriptId: string, event: MouseEvent) {
    event.stopPropagation(); 
    this.activeKebabId = this.activeKebabId === scriptId ? null : scriptId;
  }

  closeKebab() {
    this.activeKebabId = null;
  }

  openCreate() {
    this.closeKebab();
    this.currentStep = 1; 
    this.resetForm();
    this.showCreate = true;
  }

  //passa allo step successivo del wizard
  nextStep() {
    if (this.currentStep < 3) {
      this.currentStep++;
    }
  }

  //torna indietro di uno step nel wizard
  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  //mostra solo i server che appartengono al cliente selezionato
  getFilteredServers(): any[] {
    if (!this.scriptForm.customerId) return [];
    return this.data.servers.filter(s => s.customerId === this.scriptForm.customerId);
  }

  onCustomerChange() {
    this.scriptForm.serverId = '';
  }

  //verifica che i campi dello step1 siano compilati
  isStep1Valid(): boolean {
    return !!(this.scriptForm.path && this.scriptForm.schedule && this.scriptForm.customerId && this.scriptForm.serverId);
  }

  //verifica step 2
  isStep2Valid(): boolean {
    if (!this.scriptForm.mysqlComponent && !this.scriptForm.filesComponent) return false;
    
    if (this.scriptForm.mysqlComponent) {
      const mysqlDataValid = !!(this.scriptForm.mysqlHost && this.scriptForm.mysqlPort && this.scriptForm.mysqlUser && this.scriptForm.mysqlDatabase);
      const mysqlFilesValid = this.scriptForm.selectedMysqlFiles.length > 0;
      if (!mysqlDataValid || !mysqlFilesValid) return false;
    }

    if (this.scriptForm.filesComponent) {
      const filesDataValid = !!this.scriptForm.filesSourcePath;
      const filesValid = this.scriptForm.selectedFiles.length > 0;
      if (!filesDataValid || !filesValid) return false;
    }

    return true;
  }

  //verifica step 3
  isStep3Valid(): boolean {
    return !!(this.scriptForm.ftpHost && this.scriptForm.ftpUser && this.scriptForm.ftpPassword);
  }

  isTab1Valid(): boolean {
    return this.isStep1Valid();
  }

  isTab2Valid(): boolean {
    return this.isStep2Valid();
  }

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

  //gestisce la selezione dei file sql
  onMysqlFilesSelected(event: any) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const filesArray = Array.from(input.files);
      this.scriptForm.selectedMysqlFiles = [...this.scriptForm.selectedMysqlFiles, ...filesArray];
      
      setTimeout(() => {
        input.value = '';
      }, 100);
    }
  }

  //rimuove i file sql che erano stati selezionati
  removeMysqlFile(index: number) {
    this.scriptForm.selectedMysqlFiles.splice(index, 1);
  }

  //gestisce l'aggiunta dei file 
  onFilesSelected(event: any) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const filesArray = Array.from(input.files);
      this.scriptForm.selectedFiles = [...this.scriptForm.selectedFiles, ...filesArray];
      
      setTimeout(() => {
        input.value = '';
      }, 100);
    }
  }

  //rimuove i file che erano stati selezionati
  removeFile(index: number) {
    this.scriptForm.selectedFiles.splice(index, 1);
  }

  //crea lo script
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
  };

  this.data.scripts = [newScript, ...this.data.scripts];

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

  //carica i dati dello script gia esistenti e apre il pannello di modifica
  openEdit(script: any) {
    this.closeKebab();
    this.selectedScript = script;
    this.activeEditTab = 1; 
    this.isChangingFtpPassword = false; 
    
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
      
      ftpPassword: script.ftpPassword ?? '' 
    };
    this.showEdit = true;
  }

  //applica le modifiche allo script
  saveEdit() {
    const index = this.data.scripts.findIndex(s => s.id === this.selectedScript.id);
    if (index !== -1) {
      const originalScript = this.data.scripts[index];
      const currentFtpPassword = this.isChangingFtpPassword ? this.scriptForm.ftpPassword : originalScript.ftpPassword;

      const changedParts: string[] = [];

      if (originalScript.path !== this.scriptForm.path) changedParts.push('Percorso (Path)');
      if (originalScript.schedule !== this.scriptForm.schedule) changedParts.push('Pianificazione (Schedule)');
      if (originalScript.customerId !== this.scriptForm.customerId) changedParts.push('Cliente');
      if (originalScript.serverId !== this.scriptForm.serverId) changedParts.push('Server');

      if (originalScript.mysqlComponent !== this.scriptForm.mysqlComponent) {
        changedParts.push('Abilitazione componente MySQL');
      } else if (this.scriptForm.mysqlComponent) {
        if (originalScript.mysqlHost !== this.scriptForm.mysqlHost) changedParts.push('Host MySQL');
        if (originalScript.mysqlPort !== this.scriptForm.mysqlPort) changedParts.push('Porta MySQL');
        if (originalScript.mysqlUser !== this.scriptForm.mysqlUser) changedParts.push('Utente MySQL');
        if (originalScript.mysqlPassword !== this.scriptForm.mysqlPassword) changedParts.push('Password MySQL');
        if (originalScript.mysqlDatabase !== this.scriptForm.mysqlDatabase) changedParts.push('Database MySQL');
      }
      if (originalScript.selectedMysqlFiles?.length !== this.scriptForm.selectedMysqlFiles.length) {
        changedParts.push('File SQL associati');
      }

      if (originalScript.filesComponent !== this.scriptForm.filesComponent) {
        changedParts.push('Abilitazione componente File Locali');
      } else if (this.scriptForm.filesComponent) {
        if (originalScript.filesSourcePath !== this.scriptForm.filesSourcePath) changedParts.push('Percorso sorgente File');
      }
      if (originalScript.selectedFiles?.length !== this.scriptForm.selectedFiles.length) {
        changedParts.push('File locali associati');
      }

      if (originalScript.ftpHost !== this.scriptForm.ftpHost) changedParts.push('Host FTP');
      if (originalScript.ftpUser !== this.scriptForm.ftpUser) changedParts.push('Utente FTP');
      if (originalScript.ftpPassword !== currentFtpPassword) changedParts.push('Password FTP');

      if (changedParts.length === 0) {
        this.showEdit = false;
        return;
      }

      this.data.scripts[index] = { 
        ...originalScript,
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
        ftpPassword: currentFtpPassword
      };

      const logMessage = `Script modificato. Campi aggiornati: ${changedParts.join(', ')}.`;

      this.data.logs.push({
        id: 'LOG-' + Math.floor(Math.random() * 99999),
        scriptId: this.scriptForm?.id || 'SRV-1',
        level: 'INFO',
        message: logMessage,
        createdAt: new Date().toISOString(), 
        executionId: 'N/A'
      });

      this.data.saveToStorage(); 
    }
    this.showEdit = false;
  }

  //elimina lo script
  deleteScript(id: string) {
    this.closeKebab();
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
            level: 'WARNING',
            createdAt: new Date().toISOString(), 
            message: `Lo script con ID ${id} è stato rimosso.`,
            executionId: 'N/A'
          });
        }
        
        this.data.scripts = this.data.scripts.filter((s: any) => s.id !== id);
        this.data.saveToStorage();
      }
    }
  }

  //filtra gli script in bade all'id
  filteredScripts() {
    if (!this.searchId) return this.data.scripts;
    return this.data.scripts.filter(s => s.id.toLowerCase().includes(this.searchId.toLowerCase()));
  }

  //se il customer di quello script non esiste o viene cancellato riporta unknown
  getCustomerName(id: any) {
    return this.data.customers.find(c => c.id == id)?.name ?? 'Unknown';
  }

  //se il server dello script non esiste riporta unknown
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