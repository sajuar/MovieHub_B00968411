import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { AuthResponse, LoginCredentials, RegisterData } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY      = 'moviehub_token';
  private readonly USER_ID_KEY    = 'moviehub_user_id';
  private readonly ROLE_KEY       = 'moviehub_role';
  private readonly USERNAME_KEY   = 'moviehub_username';
  private readonly EXPIRES_KEY    = 'moviehub_expires_at';

  // How long each token lives on the backend (minutes)
  private readonly SESSION_MINUTES = 5;
  // Refresh the token this many seconds before it expires
  private readonly REFRESH_BEFORE_SECONDS = 60;

  private refreshTimer: any = null;

  private isLoggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  constructor(private http: HttpClient) {
    // One-time migration: wipe leftover localStorage keys
    ['moviehub_token', 'moviehub_user_id', 'moviehub_role', 'moviehub_username']
      .forEach(k => localStorage.removeItem(k));

    // On page load, if still logged in reschedule the refresh timer
    // so a browser refresh doesn't cause an unexpected logout
    if (this.hasToken()) {
      this.scheduleRefresh();
    }
  }

  // ----- Cookie helpers -----------------------------------------------
  private setCookie(name: string, value: string, minutes: number): void {
    const expires = new Date(Date.now() + minutes * 60 * 1000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`;
  }

  private getCookie(name: string): string | null {
    const match = document.cookie
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith(name + '='));
    return match ? decodeURIComponent(match.substring(name.length + 1)) : null;
  }

  private deleteCookie(name: string): void {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
  }

  // ----- Session state ------------------------------------------------
  private hasToken(): boolean {
    return !!this.getCookie(this.TOKEN_KEY);
  }

  getToken(): string | null {
    return this.getCookie(this.TOKEN_KEY);
  }

  getUserId(): string | null {
    return this.getCookie(this.USER_ID_KEY);
  }

  getRole(): string | null {
    return this.getCookie(this.ROLE_KEY);
  }

  getUsername(): string | null {
    return this.getCookie(this.USERNAME_KEY);
  }

  isAdmin(): boolean {
    return this.getRole() === 'admin';
  }

  isLoggedIn(): boolean {
    const loggedIn = this.hasToken();
    if (!loggedIn && this.isLoggedInSubject.value) {
      this.isLoggedInSubject.next(false);
    }
    return loggedIn;
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({ 'x-access-token': token || '' });
  }

  // ----- Silent token refresh -----------------------------------------

  // Saves all session cookies and records the expiry timestamp
  private saveSession(token: string, userId: string, role: string, username: string): void {
    const expiresAt = Date.now() + this.SESSION_MINUTES * 60 * 1000;
    this.setCookie(this.TOKEN_KEY,    token,              this.SESSION_MINUTES);
    this.setCookie(this.USER_ID_KEY,  userId,             this.SESSION_MINUTES);
    this.setCookie(this.ROLE_KEY,     role,               this.SESSION_MINUTES);
    this.setCookie(this.USERNAME_KEY, username,           this.SESSION_MINUTES);
    this.setCookie(this.EXPIRES_KEY,  String(expiresAt),  this.SESSION_MINUTES);
  }

  // Schedules a silent token refresh 60 seconds before the cookie expires.
  // If the stored expiry is already very close (or past), refresh immediately.
  private scheduleRefresh(): void {
    this.cancelRefresh();

    const expiresAt = Number(this.getCookie(this.EXPIRES_KEY) ?? '0');
    const msUntilExpiry = expiresAt - Date.now();
    const delay = Math.max(0, msUntilExpiry - this.REFRESH_BEFORE_SECONDS * 1000);

    this.refreshTimer = setTimeout(() => this.silentRefresh(), delay);
  }

  private cancelRefresh(): void {
    if (this.refreshTimer !== null) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  // Calls the backend refresh endpoint, updates cookies, and reschedules
  private silentRefresh(): void {
    const token = this.getToken();
    if (!token) return;

    const headers = new HttpHeaders({ 'x-access-token': token });
    this.http.post<{ token: string; expires_in: number }>(
      'http://127.0.0.1:5001/api/auth/refresh', {}, { headers }
    ).subscribe({
      next: (res) => {
        const userId   = this.getUserId()   ?? '';
        const role     = this.getRole()     ?? '';
        const username = this.getUsername() ?? '';
        this.saveSession(res.token, userId, role, username);
        this.scheduleRefresh();
      },
      error: () => {
        // Refresh failed (token already expired on backend) — log out cleanly
        this.clearSession();
      }
    });
  }

  // No longer needed as a public method but kept for the interceptor
  refreshSession(): void {
    // Cookie sliding is now handled by the refresh timer; this is a no-op
  }

  // ----- Auth API calls -----------------------------------------------
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    const formData = new FormData();
    if (credentials.username) formData.append('username', credentials.username);
    if (credentials.email)    formData.append('email',    credentials.email);
    formData.append('password', credentials.password);

    return this.http.post<AuthResponse>('http://127.0.0.1:5001/api/auth/login', formData).pipe(
      tap((response) => {
        this.saveSession(response.token, response.user_id, response.role, response.username);
        this.isLoggedInSubject.next(true);
        this.scheduleRefresh();
      })
    );
  }

  register(data: RegisterData): Observable<any> {
    const formData = new FormData();
    formData.append('username', data.username);
    formData.append('email',    data.email);
    formData.append('password', data.password);

    return this.http.post('http://127.0.0.1:5001/api/auth/register', formData);
  }

  logout(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post('http://127.0.0.1:5001/api/auth/logout', {}, { headers }).pipe(
      tap(() => this.clearSession())
    );
  }

  clearSession(): void {
    this.cancelRefresh();
    this.deleteCookie(this.TOKEN_KEY);
    this.deleteCookie(this.USER_ID_KEY);
    this.deleteCookie(this.ROLE_KEY);
    this.deleteCookie(this.USERNAME_KEY);
    this.deleteCookie(this.EXPIRES_KEY);
    this.isLoggedInSubject.next(false);
  }
}
