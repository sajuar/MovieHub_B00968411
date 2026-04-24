import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { AuthResponse, LoginCredentials, RegisterData } from '../models/models';

// ── AuthService ──────────────────────────────────────────────────────────────
// Central service for authentication state.
//
// Storage strategy: session data is kept in short-lived cookies (not
// localStorage) so it has a hard expiry enforced by the browser itself.
//
// Silent refresh: a timer fires ~60 s before the current token expires and
// calls /api/auth/refresh to get a new token without interrupting the user.
// The timer is rescheduled after every successful refresh and after every
// page load (so a browser refresh doesn't unexpectedly log the user out).
// ─────────────────────────────────────────────────────────────────────────────
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY    = 'moviehub_token';
  private readonly USER_ID_KEY  = 'moviehub_user_id';
  private readonly ROLE_KEY     = 'moviehub_role';
  private readonly USERNAME_KEY = 'moviehub_username';
  private readonly EXPIRES_KEY  = 'moviehub_expires_at';

  private readonly SESSION_MINUTES       = 5;   // must match TOKEN_LIFETIME_MINUTES in the backend
  private readonly REFRESH_BEFORE_SECONDS = 60; // refresh this many seconds before expiry

  private refreshTimer: any = null;

  // BehaviorSubject lets any component subscribe to the login state
  private isLoggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
  public  isLoggedIn$       = this.isLoggedInSubject.asObservable();

  constructor(private http: HttpClient) {
    // One-time migration: clear any stale data left from the old localStorage approach
    ['moviehub_token', 'moviehub_user_id', 'moviehub_role', 'moviehub_username']
      .forEach(k => localStorage.removeItem(k));

    // Reschedule the refresh timer on every page load so a browser refresh
    // doesn't cause an unexpected logout
    if (this.hasToken()) {
      this.scheduleRefresh();
    }
  }

  // ── Cookie helpers ─────────────────────────────────────────────────────────
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

  // ── Session state ──────────────────────────────────────────────────────────
  private hasToken(): boolean { return !!this.getCookie(this.TOKEN_KEY); }

  getToken():    string | null { return this.getCookie(this.TOKEN_KEY);    }
  getUserId():   string | null { return this.getCookie(this.USER_ID_KEY);  }
  getRole():     string | null { return this.getCookie(this.ROLE_KEY);     }
  getUsername(): string | null { return this.getCookie(this.USERNAME_KEY); }
  isAdmin():     boolean       { return this.getRole() === 'admin';        }

  isLoggedIn(): boolean {
    const loggedIn = this.hasToken();
    // Keep the BehaviorSubject in sync if the cookie expired naturally
    if (!loggedIn && this.isLoggedInSubject.value) {
      this.isLoggedInSubject.next(false);
    }
    return loggedIn;
  }

  getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({ 'x-access-token': this.getToken() || '' });
  }

  // ── Session persistence ────────────────────────────────────────────────────
  // Writes all session cookies and records the exact expiry timestamp so the
  // refresh scheduler can calculate exactly how long to wait.
  private saveSession(token: string, userId: string, role: string, username: string): void {
    const expiresAt = Date.now() + this.SESSION_MINUTES * 60 * 1000;
    this.setCookie(this.TOKEN_KEY,    token,              this.SESSION_MINUTES);
    this.setCookie(this.USER_ID_KEY,  userId,             this.SESSION_MINUTES);
    this.setCookie(this.ROLE_KEY,     role,               this.SESSION_MINUTES);
    this.setCookie(this.USERNAME_KEY, username,           this.SESSION_MINUTES);
    this.setCookie(this.EXPIRES_KEY,  String(expiresAt),  this.SESSION_MINUTES);
  }

  // ── Silent token refresh ───────────────────────────────────────────────────
  // Schedules a background call to /api/auth/refresh before the token expires.
  // Uses the stored expiry timestamp so it also works correctly after a page reload.
  private scheduleRefresh(): void {
    this.cancelRefresh();
    const expiresAt    = Number(this.getCookie(this.EXPIRES_KEY) ?? '0');
    const msUntilExpiry = expiresAt - Date.now();
    const delay         = Math.max(0, msUntilExpiry - this.REFRESH_BEFORE_SECONDS * 1000);
    this.refreshTimer = setTimeout(() => this.silentRefresh(), delay);
  }

  private cancelRefresh(): void {
    if (this.refreshTimer !== null) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private silentRefresh(): void {
    const token = this.getToken();
    if (!token) return;

    const headers = new HttpHeaders({ 'x-access-token': token });
    this.http.post<{ token: string; expires_in: number }>(
      'http://127.0.0.1:5001/api/auth/refresh', {}, { headers }
    ).subscribe({
      next: (res) => {
        // Save updated cookies and reschedule for the next cycle
        this.saveSession(res.token, this.getUserId() ?? '', this.getRole() ?? '', this.getUsername() ?? '');
        this.scheduleRefresh();
      },
      error: () => {
        // If refresh fails (token already expired on backend), log out cleanly
        this.clearSession();
      }
    });
  }

  refreshSession(): void { /* no-op — refresh is handled by the timer above */ }

  // ── Auth API calls ─────────────────────────────────────────────────────────
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    const formData = new FormData();
    if (credentials.username) formData.append('username', credentials.username);
    if (credentials.email)    formData.append('email',    credentials.email);
    formData.append('password', credentials.password);

    return this.http.post<AuthResponse>('http://127.0.0.1:5001/api/auth/login', formData).pipe(
      tap((response) => {
        // Persist session and start the refresh countdown
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
