import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return false for isLoggedIn when no token stored', () => {
    expect(service.isLoggedIn()).toBeFalse();
  });

  it('should store token and return true for isLoggedIn after login', () => {
    const mockResponse = {
      message: 'Login successful',
      token: 'test-token-123',
      user_id: 'U001',
      role: 'user'
    };

    service.login({ username: 'testuser', password: 'password123' }).subscribe(res => {
      expect(res.token).toBe('test-token-123');
      expect(service.isLoggedIn()).toBeTrue();
      expect(service.getToken()).toBe('test-token-123');
      expect(service.getUserId()).toBe('U001');
      expect(service.getRole()).toBe('user');
    });

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should store admin role correctly', () => {
    const mockResponse = {
      message: 'Login successful',
      token: 'admin-token-456',
      user_id: 'U001',
      role: 'admin'
    };

    service.login({ username: 'adminuser', password: 'adminpass' }).subscribe(() => {
      expect(service.isAdmin()).toBeTrue();
    });

    const req = httpMock.expectOne('/api/auth/login');
    req.flush(mockResponse);
  });

  it('should return false for isAdmin when user role is "user"', () => {
    const mockResponse = {
      message: 'Login successful',
      token: 'user-token',
      user_id: 'U002',
      role: 'user'
    };

    service.login({ username: 'normaluser', password: 'pass' }).subscribe(() => {
      expect(service.isAdmin()).toBeFalse();
    });

    const req = httpMock.expectOne('/api/auth/login');
    req.flush(mockResponse);
  });

  it('should clear token on logout', () => {
    localStorage.setItem('moviehub_token', 'some-token');
    localStorage.setItem('moviehub_user_id', 'U001');
    localStorage.setItem('moviehub_role', 'user');

    service.logout().subscribe(() => {
      expect(service.isLoggedIn()).toBeFalse();
      expect(service.getToken()).toBeNull();
      expect(service.getUserId()).toBeNull();
    });

    const req = httpMock.expectOne('/api/auth/logout');
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'Logout successful' });
  });

  it('should clear session without API call when clearSession is called directly', () => {
    localStorage.setItem('moviehub_token', 'test-token');
    localStorage.setItem('moviehub_user_id', 'U001');
    localStorage.setItem('moviehub_role', 'admin');

    service.clearSession();

    expect(service.isLoggedIn()).toBeFalse();
    expect(service.getToken()).toBeNull();
    expect(service.getUserId()).toBeNull();
    expect(service.getRole()).toBeNull();
    expect(service.isAdmin()).toBeFalse();
  });

  it('should return auth headers with token', () => {
    localStorage.setItem('moviehub_token', 'my-token');
    const headers = service.getAuthHeaders();
    expect(headers.get('x-access-token')).toBe('my-token');
  });

  it('should emit isLoggedIn$ as true after login', (done) => {
    const mockResponse = {
      message: 'Login successful',
      token: 'emit-token',
      user_id: 'U003',
      role: 'user'
    };

    service.login({ username: 'u', password: 'p' }).subscribe(() => {
      service.isLoggedIn$.subscribe(val => {
        expect(val).toBeTrue();
        done();
      });
    });

    const req = httpMock.expectOne('/api/auth/login');
    req.flush(mockResponse);
  });

  it('should emit isLoggedIn$ as false after clearSession', (done) => {
    localStorage.setItem('moviehub_token', 'tok');
    service.clearSession();
    service.isLoggedIn$.subscribe(val => {
      expect(val).toBeFalse();
      done();
    });
  });
});
