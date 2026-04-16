import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  const mockUser = {
    user_id: 'U001',
    username: 'testuser',
    role: 'user',
    joined_date: '2026-01-01'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should GET all users', () => {
    service.getUsers().subscribe(users => {
      expect(users.length).toBe(1);
      expect(users[0].username).toBe('testuser');
    });

    const req = httpMock.expectOne('/api/users');
    expect(req.request.method).toBe('GET');
    req.flush([mockUser]);
  });

  it('should GET a single user by ID', () => {
    service.getUser('U001').subscribe(user => {
      expect(user.user_id).toBe('U001');
      expect(user.username).toBe('testuser');
    });

    const req = httpMock.expectOne('/api/users/U001');
    expect(req.request.method).toBe('GET');
    req.flush(mockUser);
  });
});
