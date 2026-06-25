import { Routes } from '@angular/router';
import { CustomerServerComponent } from './pages/customer-server/customer-server';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { GraphsComponent } from './pages/graphs/graphs';
import { LoginComponent } from './pages/login/login';
import { Logs } from './pages/logs/logs';
import { ScriptsComposer } from './pages/scripts-composer/scripts-composer';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'graphs', component: GraphsComponent },
  { path: 'logs', component: Logs },
  { path: 'scripts-composer', component: ScriptsComposer },
  { path: 'customer-server', component: CustomerServerComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];