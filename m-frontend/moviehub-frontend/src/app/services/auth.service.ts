import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { AuthResponse, LoginCredentials, RegisterData } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'moviehub_token';
  private readonly USER_ID_KEY = 'moviehub_user_id';
  private readonly ROLE_KEY = 'moviehub_role';
  private readonly USERNAME_KEY = 'moviehub_username';

  // Cookies (and the matching backend token) live for 5 minutes; each
  // authenticated request slides the window forward so an active user
  // stays signed in even though individual tokens are short-lived.
  private readonly SESSION_MINUTES = 5;

  private isLoggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  constructor(private http: HttpClient) {
    // One-time migration: wipe any leftover localStorage keys from before
    // the switch to cookie-based storage so they don't cause confusion.
    ['moviehub_token', 'moviehub_user_id', 'moviehub_role', 'moviehub_username']
      .forEach(k => localStorage.removeItem(k));
  }

  // ----- Cookie helpers -----------------------------------------------
  private setCookie(name: string, value: string, minutes: number): void {
    const expires = new Date(Date.now() + minutes * 60 * 1000).toUTCString();
    // SameSite=Lax + path=/ so the cookie is available app-wide. Secure
    // is omitted because dev runs on http; add it when serving over https.
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
    // Cookie may have expired since the BehaviorSubject was last updated;
    // keep observers in sync with the real cookie state.
    if (!loggedIn && this.isLoggedInSubject.value) {
      this.isLoggedInSubject.next(false);
    }
    return loggedIn;
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({ 'x-access-token': token || '' });
  }

  // Re-write every session cookie with a fresh expiry. Call this after a
  // successful authenticated request to slide the session window.
  refreshSession(): void {
    const token = this.getToken();
    const userId = this.getUserId();
    const role = this.getRole();
    const username = this.getUsername();
    if (!token) return;
    this.setCookie(this.TOKEN_KEY, token, this.SESSION_MINUTES);
    if (userId) this.setCookie(this.USER_ID_KEY, userId, this.SESSION_MINUTES);
    if (role) this.setCookie(this.ROLE_KEY, role, this.SESSION_MINUTES);
    if (username) this.setCookie(this.USERNAME_KEY, username, this.SESSION_MINUTES);
  }

  // ----- Auth API calls -----------------------------------------------
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    const formData = new FormData();
    if (credentials.username) formData.append('username', credentials.username);
    if (credentials.email) formData.append('email', credentials.email);
    formData.append('password', credentials.password);

    return this.http.post<AuthResponse>('http://127.0.0.1:5001/api/auth/login', formData).pipe(
      tap((response) => {
        // Each login generates a fresh token on the backend; mirror that
        // here by writing brand new cookies with the short expiry.
        this.setCookie(this.TOKEN_KEY, response.token, this.SESSION_MINUTES);
        this.setCookie(this.USER_ID_KEY, response.user_id, this.SESSION_MINUTES);
        this.setCookie(this.ROLE_KEY, response.role, this.SESSION_MINUTES);
        if (credentials.username) {
          this.setCookie(this.USERNAME_KEY, credentials.username, this.SESSION_MINUTES);
        }
        this.isLoggedInSubject.next(true);
      })
    );
  }

  register(data: RegisterData): Observable<any> {
    const formData = new FormData();
    formData.append('username', data.username);
    formData.append('email', data.email);
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
    this.deleteCookie(this.TOKEN_KEY);
    this.deleteCookie(this.USER_ID_KEY);
    this.deleteCookie(this.ROLE_KEY);
    this.deleteCookie(this.USERNAME_KEY);
    this.isLoggedInSubject.next(false);
  }
}
