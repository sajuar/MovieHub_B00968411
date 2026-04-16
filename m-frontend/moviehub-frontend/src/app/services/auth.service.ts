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

  private isLoggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  constructor(private http: HttpClient) {}

  private hasToken(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getUserId(): string | null {
    return localStorage.getItem(this.USER_ID_KEY);
  }

  getRole(): string | null {
    return localStorage.getItem(this.ROLE_KEY);
  }

  getUsername(): string | null {
    return localStorage.getItem(this.USERNAME_KEY);
  }

  isAdmin(): boolean {
    return this.getRole() === 'admin';
  }

  isLoggedIn(): boolean {
    return this.hasToken();
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({ 'x-access-token': token || '' });
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    const formData = new FormData();
    if (credentials.username) formData.append('username', credentials.username);
    if (credentials.email) formData.append('email', credentials.email);
    formData.append('password', credentials.password);

    return this.http.post<AuthResponse>('http://127.0.0.1:5001/api/auth/login', formData).pipe(
      tap((response) => {
        localStorage.setItem(this.TOKEN_KEY, response.token);
        localStorage.setItem(this.USER_ID_KEY, response.user_id);
        localStorage.setItem(this.ROLE_KEY, response.role);
        // Store username from login field
        if (credentials.username) {
          localStorage.setItem(this.USERNAME_KEY, credentials.username);
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
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_ID_KEY);
    localStorage.removeItem(this.ROLE_KEY);
    localStorage.removeItem(this.USERNAME_KEY);
    this.isLoggedInSubject.next(false);
  }
}
