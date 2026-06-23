import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http'; // 👈 IMPORTANTE
import { AppComponent } from './app/app';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient() // 👈 QUESTO APRE I CANALI DI RETE VERSO MOCKOON
  ]
}).catch((err) => console.error(err));