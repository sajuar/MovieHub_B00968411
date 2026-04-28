import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

// Helper — sets a session cookie the same way the service does
const setCookie = (name: string, value: string) => {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/`;
};

const clearCookies = () =>
  ['moviehub_token', 'moviehub_user_id', 'moviehub_role', 'moviehub_username', 'moviehub_expires_at']
    .forEach(k => document.cookie = `${k}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`);

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockLoginResponse = {
    message:    'Login successful',
    token:      'test-token-abc123',
    user_id:    'U001',
    username:   'testuser',
    role:       'user',
    expires_in: 300
  };

  beforeEach(() => {
    clearCookies();
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()]
    });
    service  = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    clearCookies();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return false for isLoggedIn when no session cookie exists', () => {
    expect(service.isLoggedIn()).toBeFalse();
  });

  it('should return null for getToken when no session cookie exists', () => {
    expect(service.getToken()).toBeNull();
  });

  it('should return false for isAdmin when no session cookie exists', () => {
    expect(service.isAdmin()).toBeFalse();
  });

  it('should save session cookies and mark user as logged in after login', () => {
    service.login({ username: 'testuser', password: 'password123' }).subscribe(res => {
      expect(res.token).toBe('test-token-abc123');
      expect(service.isLoggedIn()).toBeTrue();
      expect(service.getToken()).toBe('test-token-abc123');
      expect(service.getUserId()).toBe('U001');
      expect(service.getRole()).toBe('user');
    });

    const req = httpMock.expectOne('http://127.0.0.1:5001/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(mockLoginResponse);
  });

  it('should recognise admin role correctly after login', () => {
    service.login({ username: 'adminuser', password: 'adminpass' }).subscribe(() => {
      expect(service.isAdmin()).toBeTrue();
    });

    httpMock.expectOne('http://127.0.0.1:5001/api/auth/login')
      .flush({ ...mockLoginResponse, token: 'admin-token', role: 'admin' });
  });

  it('should return false for isAdmin when role is user', () => {
    service.login({ username: 'normaluser', password: 'pass' }).subscribe(() => {
      expect(service.isAdmin()).toBeFalse();
    });

    httpMock.expectOne('http://127.0.0.1:5001/api/auth/login')
      .flush({ ...mockLoginResponse, role: 'user' });
  });

  it('should clear all session cookies on clearSession', () => {
    setCookie('moviehub_token',    'test-token');
    setCookie('moviehub_user_id',  'U001');
    setCookie('moviehub_role',     'admin');
    setCookie('moviehub_username', 'testuser');

    expect(service.isLoggedIn()).toBeTrue();

    service.clearSession();

    expect(service.isLoggedIn()).toBeFalse();
    expect(service.getToken()).toBeNull();
    expect(service.getUserId()).toBeNull();
    expect(service.getRole()).toBeNull();
    expect(service.isAdmin()).toBeFalse();
  });

  it('should call logout endpoint and clear session on logout', () => {
    setCookie('moviehub_token', 'logout-token');

    service.logout().subscribe(() => {
      expect(service.isLoggedIn()).toBeFalse();
      expect(service.getToken()).toBeNull();
    });

    const req = httpMock.expectOne('http://127.0.0.1:5001/api/auth/logout');
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'Logout successful' });
  });

  it('should return auth headers containing the session token', () => {
    setCookie('moviehub_token', 'my-auth-token');
    const headers = service.getAuthHeaders();
    expect(headers.get('x-access-token')).toBe('my-auth-token');
  });

  it('should emit isLoggedIn$ as true after a successful login', (done) => {
    service.login({ username: 'u', password: 'p' }).subscribe(() => {
      service.isLoggedIn$.subscribe(val => {
        expect(val).toBeTrue();
        done();
      });
    });

    httpMock.expectOne('http://127.0.0.1:5001/api/auth/login').flush(mockLoginResponse);
  });

  it('should emit isLoggedIn$ as false after clearSession', (done) => {
    setCookie('moviehub_token', 'tok');
    service.clearSession();
    service.isLoggedIn$.subscribe(val => {
      expect(val).toBeFalse();
      done();
    });
  });

  it('should use email when no username is provided to login', () => {
    service.login({ email: 'user@test.com', password: 'pass' }).subscribe();

    const req = httpMock.expectOne('http://127.0.0.1:5001/api/auth/login');
    const body = req.request.body as FormData;
    expect(body.get('email')).toBe('user@test.com');
    req.flush(mockLoginResponse);
  });

  it('should send register data as FormData', () => {
    service.register({ username: 'newuser', email: 'new@test.com', password: 'pass123' }).subscribe();

    const req = httpMock.expectOne('http://127.0.0.1:5001/api/auth/register');
    expect(req.request.method).toBe('POST');
    const body = req.request.body as FormData;
    expect(body.get('username')).toBe('newuser');
    expect(body.get('email')).toBe('new@test.com');
    req.flush({ message: 'User registered successfully' });
  });
});
