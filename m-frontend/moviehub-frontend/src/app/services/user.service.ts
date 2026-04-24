import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/models';
import { AuthService } from './auth.service';

// ── UserService ──────────────────────────────────────────────────────────────
// Handles user management operations.
// getUser() is public (used on movie detail page to look up reviewer names).
// getUsers(), deleteUser() and promoteUser() require an admin token.
// ─────────────────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private http: HttpClient, private authService: AuthService) {}

  // Admin: retrieve the full user list
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>('http://127.0.0.1:5001/api/users', {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Public: used to look up a single user's profile
  getUser(userId: string): Observable<User> {
    return this.http.get<User>(`http://127.0.0.1:5001/api/users/${userId}`);
  }

  deleteUser(userId: string): Observable<any> {
    return this.http.delete(`http://127.0.0.1:5001/api/users/${userId}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  // Promote a regular user to admin role
  promoteUser(userId: string): Observable<any> {
    return this.http.put(`http://127.0.0.1:5001/api/users/${userId}/promote`, {}, {
      headers: this.authService.getAuthHeaders()
    });
  }
}
