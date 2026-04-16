import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private http: HttpClient, private authService: AuthService) {}

  getUsers(): Observable<User[]> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<User[]>('http://127.0.0.1:5001/api/users', { headers });
  }

  getUser(userId: string): Observable<User> {
    return this.http.get<User>(`http://127.0.0.1:5001/api/users/${userId}`);
  }

  deleteUser(userId: string): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.delete(`http://127.0.0.1:5001/api/users/${userId}`, { headers });
  }

  promoteUser(userId: string): Observable<any> {
    const headers = this.authService.getAuthHeaders();
    return this.http.put(`http://127.0.0.1:5001/api/users/${userId}/promote`, {}, { headers });
  }
}
