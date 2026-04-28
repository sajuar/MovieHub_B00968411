import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { AuthService } from './auth.service';

const BASE = 'http://127.0.0.1:5001/api/users';

const clearCookies = () =>
  ['moviehub_token', 'moviehub_user_id', 'moviehub_role', 'moviehub_username', 'moviehub_expires_at']
    .forEach(k => document.cookie = `${k}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`);

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  const mockUser = {
    user_id:     'U001',
    username:    'testuser',
    email:       'test@test.com',
    role:        'user',
    joined_date: '2026-01-01'
  };

  beforeEach(() => {
    clearCookies();
    TestBed.configureTestingModule({
      providers: [UserService, AuthService, provideHttpClient(), provideHttpClientTesting()]
    });
    service  = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    clearCookies();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should GET all users with auth header', () => {
    document.cookie = `moviehub_token=${encodeURIComponent('admin-token')};path=/`;

    service.getUsers().subscribe(users => {
      expect(users.length).toBe(1);
      expect(users[0].username).toBe('testuser');
    });

    const req = httpMock.expectOne(BASE);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('x-access-token')).toBe('admin-token');
    req.flush([mockUser]);
  });

  it('should GET a single user by ID', () => {
    service.getUser('U001').subscribe(user => {
      expect(user.user_id).toBe('U001');
      expect(user.username).toBe('testuser');
    });

    const req = httpMock.expectOne(`${BASE}/U001`);
    expect(req.request.method).toBe('GET');
    req.flush(mockUser);
  });

  it('should DELETE a user with auth header', () => {
    document.cookie = `moviehub_token=${encodeURIComponent('admin-token')};path=/`;

    service.deleteUser('U002').subscribe(res => {
      expect(res).toBeDefined();
    });

    const req = httpMock.expectOne(`${BASE}/U002`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.headers.get('x-access-token')).toBe('admin-token');
    req.flush({ message: 'User deleted successfully' });
  });

  it('should PUT a promote request with auth header', () => {
    document.cookie = `moviehub_token=${encodeURIComponent('admin-token')};path=/`;

    service.promoteUser('U002').subscribe(res => {
      expect(res).toBeDefined();
    });

    const req = httpMock.expectOne(`${BASE}/U002/promote`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('x-access-token')).toBe('admin-token');
    req.flush({ message: 'testuser promoted to admin' });
  });
});
