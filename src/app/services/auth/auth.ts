import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';
  
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  getProfile(): Observable<any> {
  const token = localStorage.getItem('token_autenticazione');

  if (!token) {
    this.currentUserSubject.next(null);
    return of(null);
  }

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  return this.http.get<any>(`${this.apiUrl}/me?user=${encodeURIComponent(token)}`, { headers }).pipe(
    tap(user => {
      if (user) {
        if (user.name && user.name.toLowerCase().includes('admin')) {
          user.role = 'admin';
        } else {
          user.role = 'user';
        }
      }

      this.currentUserSubject.next(user);
      console.log("%c[AUTH] Profilo utente caricato con successo:", "color: #cca6ef;", user);
    }),
    catchError(err => {
      console.error("[AUTH] Errore nel recupero del profilo o token scaduto.", err);
      this.logout();
      return of(null);
    })
  );
}

  getUserRole(): string {
    const user = this.currentUserSubject.value;
    return user ? user.role : 'guest';
  }
  isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }

  logout() {
    localStorage.removeItem('token_autenticazione');
    this.currentUserSubject.next(null);
    console.log("%c[AUTH] Sessione terminata. Token rimosso dal browser.", "color: #ee6c6c;");
  }
}