import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data';
import { HttpClient } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, switchMap, filter } from 'rxjs/operators';

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
export class ScriptsComposer implements OnInit, OnDestroy {

  private apiUrl = 'http://localhost:3000/api';
  
  searchId = '';
  
  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;
  
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

  constructor(
    public data: DataService, 
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  // Carica i dati e avvia il flusso RxJS per cercare uno script specifico sul server dopo 600ms di pausa.
  ngOnInit() {
    this.loadInitialData();

    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(600), 
      filter(testo => {
        return testo.length >= 9;
      }),
      switchMap(testoCercato => {
        console.log(`[CRUD - Search] Avvio chiamata HTTP per: ${testoCercato}`);
        return this.http.get<any>(`${this.apiUrl}/scripts/${testoCercato}`);
      })
    ).subscribe({
      next: (scriptSingolo) => {
        if (scriptSingolo && scriptSingolo.id) {
          console.log(`[CRUD - Success] Script trovato su Mockoon automaticamente:`, scriptSingolo);
          this.data.scripts = [scriptSingolo];
        } else {
          this.data.scripts = [];
        }
        this.refreshUI();
      },
      error: (err) => {
        console.warn(`[CRUD - Info] Script non trovato su server, mantengo filtro locale.`);
        this.rimettiFiltroLocale();
        this.riavviaPipelineRicerca(); 
      }
    });
  }

  // Cancella la sottoscrizione alla ricerca quando il componente viene rimosso dallo schermo.
  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  // Resetta e riavvia la configurazione del flusso RxJS di ricerca in caso di errore di rete.
  private riavviaPipelineRicerca() {
    this.ngOnDestroy();
    this.ngOnInit();
  }

  // Applica un filtro locale basato sull'ID dello script quando la ricerca sul server fallisce.
  private rimettiFiltroLocale() {
    const testoCercato = this.searchId.trim();
    this.data.scripts = this.data.scripts.filter(
      s => s.id.toLowerCase() === testoCercato.toLowerCase()
    );
    this.refreshUI();
  }

  // Inserisce automaticamente il prefisso standard "SCR-" quando l'utente clicca sulla barra di ricerca.
  onSearchFocus(): void {
    if (!this.searchId.trim()) {
      this.searchId = 'SCR-';
      this.refreshUI();
    }
  }

  // Controlla l'input di ricerca, aggiunge il prefisso se numerico e invia il testo al flusso RxJS.
  onSearchChange(): void {
    let valoreInput = this.searchId.trim();

    if (!valoreInput || valoreInput === 'SCR-') {
      this.resetSearch();
      return;
    }

    if (/^\d+$/.test(valoreInput)) {
      this.searchId = 'SCR-' + valoreInput;
      valoreInput = this.searchId;
    }

    this.refreshUI(); 

    this.searchSubject.next(valoreInput);
  }

  // Ripristina l'elenco completo degli script scaricandoli dal server quando la ricerca viene svuotata.
  private resetSearch(): void {
    this.http.get<any[]>(`${this.apiUrl}/scripts`).subscribe(res => {
      const rawScripts = Array.isArray(res) ? res : [];
      this.data.scripts = [...rawScripts].reverse();
      this.refreshUI();
    });
  }

  // Pulisce il testo inserito e autocompila i campi mancanti con l'asterisco per rispettare la sintassi Cron.
  onScheduleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    let cleanValue = value.replace(/[^0-9\s*]/g, '');
    cleanValue = cleanValue.replace(/\s+/g, ' ');

    const blocchiUtente = cleanValue.split(' ').filter(b => b.length > 0);
    const terminaConSpazio = cleanValue.endsWith(' ');
    let elementsReady = blocchiUtente.length;
    
    let cronCampi: string[] = [];
    for (let i = 0; i < 5; i++) {
      if (i < elementsReady) {
        cronCampi.push(blocchiUtente[i]);
      } else {
        cronCampi.push('*');
      }
    }

    let formattedValue = cronCampi.join(' ');
    const posizioneCursore = input.selectionStart;

    this.scriptForm.schedule = formattedValue;
    input.value = formattedValue;

    if (posizioneCursore !== null && value.length !== formattedValue.length) {
      if (terminaConSpazio && elementsReady < 5) {
        const testoFinoAElemento = cronCampi.slice(0, elementsReady).join(' ') + ' ';
        input.setSelectionRange(testoFinoAElemento.length, testoFinoAElemento.length);
      } else {
        input.setSelectionRange(posizioneCursore, posizioneCursore);
      }
    }
    this.refreshUI();
  }

  // Carica script, clienti e server dalle API ordinando gli script dal più recente.
  loadInitialData() {
    if (this.data.scripts && this.data.scripts.length > 0) {
      this.data.scripts.sort((a, b) => {
        const dataA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dataB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dataB - dataA;
      });
      this.refreshUI();
      return; 
    }

    this.http.get<any[]>(`${this.apiUrl}/scripts`).subscribe(res => {
      const rawScripts = Array.isArray(res) ? res : [];
      rawScripts.sort((a, b) => {
        const dataA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dataB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dataB - dataA;
      });
      this.data.scripts = rawScripts;
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

  // Forza in modo asincrono l'aggiornamento e il rinfresco dell'interfaccia utente.
  private refreshUI() {
    setTimeout(() => {
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }, 0);
  }

  // Mostra o nasconde il menu contestuale (kebab menu) di una riga bloccando i clic esterni.
  toggleKebab(scriptId: string, event: MouseEvent) {
    event.stopPropagation(); 
    this.activeKebabId = this.activeKebabId === scriptId ? null : scriptId;
    this.refreshUI();
  }

  // Chiude il menu contestuale azzerando l'ID memorizzato.
  closeKebab() {
    this.activeKebabId = null;
    this.refreshUI();
  }

  // Pulisce i campi e apre la schermata guidata per creare un nuovo script.
  openCreate() {
    this.closeKebab();
    this.currentStep = 1; 
    this.resetForm();
    this.showCreate = true;
    this.refreshUI();
  }

  // Avanza di uno step nel wizard di creazione dello script.
  nextStep() { 
    if (this.currentStep < 3) this.currentStep++; 
    this.refreshUI();
  }
  
  // Ritorna allo step precedente nel wizard di creazione dello script.
  prevStep() { 
    if (this.currentStep > 1) this.currentStep--; 
    this.refreshUI();
  }

  // Ritorna l'elenco dei server associati esclusivamente al cliente selezionato nel modulo.
  getFilteredServers(): any[] {
    if (!this.scriptForm.customerId) return [];
    return this.data.servers.filter(s => s.customerId === this.scriptForm.customerId);
  }

  // Resetta il server selezionato quando l'utente cambia il cliente di riferimento.
  onCustomerChange() { 
    this.scriptForm.serverId = ''; 
    this.refreshUI();
  }

  // Aggiunge una nuova configurazione vuota per un database MySQL.
  addMysqlInstance() {
    this.scriptForm.mysqlInstances.push({
      host: '', port: '3306', user: '', password: '', database: '', selectedMysqlFiles: []
    });
    this.refreshUI();
  }

  // Rimuove la configurazione MySQL all'indice specificato.
  removeMysqlInstance(index: number) { 
    this.scriptForm.mysqlInstances.splice(index, 1); 
    this.refreshUI();
  }
  
  // Aggiunge una nuova configurazione vuota per il backup di file fisici.
  addFileInstance() { 
    this.scriptForm.fileInstances.push({ sourcePath: 'C:\\', selectedFiles: [] }); 
    this.refreshUI();
  }
  
  // Rimuove la configurazione dei file fisici all'indice specificato.
  removeFileInstance(index: number) { 
    this.scriptForm.fileInstances.splice(index, 1); 
    this.refreshUI();
  }

  // Inizializza o svuota le istanze dei componenti in base all'attivazione delle checkbox del modulo.
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

  // Gestisce la selezione dei file per MySQL e li aggiunge alla lista dell'istanza corrispondente.
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

  // Elimina un file precedentemente allegato da una specifica istanza MySQL.
  removeMysqlFile(instanceIndex: number, fileIndex: number) {
    this.scriptForm.mysqlInstances[instanceIndex].selectedMysqlFiles.splice(fileIndex, 1);
    this.refreshUI();
  }

  // Gestisce la selezione dei file fisici e li aggiunge alla lista dell'istanza corrispondente.
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

  // Elimina un file precedentemente allegato da una specifica istanza di cartelle/file.
  removeFile(instanceIndex: number, fileIndex: number) {
    this.scriptForm.fileInstances[instanceIndex].selectedFiles.splice(fileIndex, 1);
    this.refreshUI();
  }

  // Valida i campi obbligatori del primo step (destinazione, pianificazione, cliente e server).
  isStep1Valid(): boolean { return !!(this.scriptForm.path && this.scriptForm.schedule && this.scriptForm.customerId && this.scriptForm.serverId); }

  // Controlla che le configurazioni inserite per MySQL o per i file fisici siano complete e valide.
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

  // Valida i dati obbligatori dello step relativo alle credenziali dello spazio FTP.
  isStep3Valid(): boolean { return !!(this.scriptForm.ftpHost && this.scriptForm.ftpUser && this.scriptForm.ftpPassword); }
  
  // Controlla la validità dei dati anagrafici nella prima scheda di modifica.
  isTab1Valid(): boolean { return this.isStep1Valid(); }
  
  // Controlla la validità dei dati di configurazione nella seconda scheda di modifica.
  isTab2Valid(): boolean { return this.isStep2Valid(); }
  
  // Valida i dati della scheda FTP controllando la password solo se l'utente ha scelto di modificarla.
  isTab3Valid(): boolean {
    return this.isChangingFtpPassword 
      ? !!(this.scriptForm.ftpHost && this.scriptForm.ftpUser && this.scriptForm.ftpPassword)
      : !!(this.scriptForm.ftpHost && this.scriptForm.ftpUser);
  }

  // Verifica la validità totale di tutte e tre le schede del modulo di modifica.
  isFormValid(): boolean { return this.isTab1Valid() && this.isTab2Valid() && this.isTab3Valid(); }

  // Confronta lo stato attuale del modulo con il backup iniziale per rilevare la presenza di modifiche.
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

  // Invia i dati del nuovo script via POST, aggiorna la lista locale e crea un log di avvenuta creazione.
  createScript() {
    const idUnivoco = 'SCR-' + Math.floor(100000 + Math.random() * 900000);
    const dataOdierna = new Date().toISOString(); 

    const newScript = {
      id: idUnivoco, 
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
      ftpPassword: this.scriptForm.ftpPassword,
      createdAt: dataOdierna 
    };

    this.http.post(`${this.apiUrl}/scripts`, newScript).subscribe({
      next: () => {
        this.data.scripts = [newScript, ...this.data.scripts];
        const newLog = {
          id: 'LOG-' + Math.floor(100000 + Math.random() * 900000),
          level: 'success', 
          message: `Nuovo script di backup creato con successo`,
          scriptId: idUnivoco, 
          executionId: 'EXE-' + Math.floor(Math.random() * 99999),
          createdAt: dataOdierna
        };
        this.http.post(`${this.apiUrl}/logs`, newLog).subscribe({
          next: () => {
            if (!Array.isArray(this.data.logs)) this.data.logs = [];
            this.data.logs = [newLog, ...this.data.logs];
            this.refreshUI();
          },
          error: (err) => console.error("Errore salvataggio LOG su Mockoon:", err)
        });
      },
      error: (err) => console.error("Errore salvataggio SCRIPT su Mockoon:", err)
    });

    this.showCreate = false;
    this.resetForm();
  }

  // Carica i dati dello script selezionato nel modulo e crea una copia JSON di backup per il confronto.
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

  // Invia i dati aggiornati tramite PUT, rileva l'elenco dei campi modificati e genera un log informativo.
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

      this.http.put(`${this.apiUrl}/scripts/${updatedScript.id}`, updatedScript).subscribe({
        next: (resScript) => {
          const updatedScriptsArray = [...this.data.scripts];
          updatedScriptsArray[index] = updatedScript;
          this.data.scripts = updatedScriptsArray;

          const fieldsList = changedFields.join(', ');
          const newLog = {
            id: 'LOG-' + Math.floor(Math.random() * 99999),
            scriptId: this.scriptForm.id,
            level: 'info', 
            message: `Script modificato. Campi aggiornati: [${fieldsList}].`,
            createdAt: new Date().toISOString(), 
            executionId: 'N/A'
          };

          this.http.post(`${this.apiUrl}/logs`, newLog).subscribe({
            next: (resLog) => {
              this.data.logs = [newLog, ...this.data.logs];
              this.refreshUI();
            },
            error: (errLog) => {
              this.data.logs = [newLog, ...this.data.logs];
              this.refreshUI();
            }
          });
          this.refreshUI();
        },
        error: (errScript) => {
          const updatedScriptsArray = [...this.data.scripts];
          updatedScriptsArray[index] = updatedScript;
          this.data.scripts = updatedScriptsArray;
          this.refreshUI();
        }
      });
    }
    this.showEdit = false;
  }

  // Elimina uno script tramite richiesta HTTP DELETE e lo rimuove dall'elenco visibile localmente.
  deleteScript(id: string) {
    this.http.delete<any>(`${this.apiUrl}/scripts/${id}`).subscribe({
      next: (response) => {
        this.data.scripts = this.data.scripts.filter((s: any) => s.id !== id);
        this.refreshUI();
      },
      error: (err) => {
        this.data.scripts = this.data.scripts.filter((s: any) => s.id !== id);
        this.refreshUI();
      }
    });
  }

  // Restituisce l'elenco degli script filtrati localmente in base alla corrispondenza parziale dell'ID.
  get filteredScripts(): any[] {
    if (!this.data.scripts) return [];
    if (!this.searchId.trim()) return this.data.scripts;
    
    const query = this.searchId.trim().toLowerCase();
    return this.data.scripts.filter(s => s.id.toLowerCase().includes(query));
  }

  // Trova e restituisce il nome del cliente a partire dal suo ID.
  getCustomerName(id: any) { return this.data.customers.find(c => c.id == id)?.name ?? 'Unknown'; }
  
  // Trova e restituisce il nome del server a partire dal suo ID.
  getServerName(id: any) { return this.data.servers.find(s => s.id == id)?.name ?? 'Unknown'; }

  // Ripristina i campi del form di configurazione dello script ai valori vuoti o predefiniti.
  resetForm() {
    this.scriptForm = {
      id: '', path: '', schedule: '', serverId: '', customerId: '', mysqlComponent: false,
      mysqlInstances: [], filesComponent: false, fileInstances: [], ftpHost: '', ftpUser: '', ftpPassword: '', type: 'FILE'
    };
    this.isChangingFtpPassword = false;
    this.originalScriptBackup = '';
  }
}