import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { WatchlistService } from './watchlist.service';
import { AuthService } from './auth.service';

const clearCookies = () =>
  ['moviehub_token', 'moviehub_user_id', 'moviehub_role', 'moviehub_username', 'moviehub_expires_at']
    .forEach(k => document.cookie = `${k}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`);

describe('WatchlistService', () => {
  let service: WatchlistService;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    clearCookies();
    TestBed.configureTestingModule({
      providers: [
        WatchlistService,
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });
    service  = TestBed.inject(WatchlistService);
    httpMock = TestBed.inject(HttpTestingController);
    router   = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    clearCookies();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('isInWatchlist should return false for any movie when watchlist is empty', () => {
    expect(service.isInWatchlist('M001')).toBeFalse();
    expect(service.isInWatchlist('M999')).toBeFalse();
  });

  it('should load watchlist IDs and correctly report which movies are saved', () => {
    document.cookie = `moviehub_token=${encodeURIComponent('test-token')};path=/`;
    document.cookie = `moviehub_user_id=${encodeURIComponent('U001')};path=/`;

    service.loadIds();

    const req = httpMock.expectOne('http://127.0.0.1:5001/api/users/U001/watchlist/ids');
    expect(req.request.method).toBe('GET');
    req.flush({ movie_ids: ['M001', 'M002'] });

    expect(service.isInWatchlist('M001')).toBeTrue();
    expect(service.isInWatchlist('M002')).toBeTrue();
    expect(service.isInWatchlist('M003')).toBeFalse();
  });

  it('toggle should navigate to /login when user is not logged in', () => {
    const navigateSpy = spyOn(router, 'navigate');
    const mockMovie   = { movie_id: 'M001', title: 'Test' } as any;

    service.toggle(mockMovie);

    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('watchlistIds$ should emit an empty Set initially', (done) => {
    service.watchlistIds$.subscribe(ids => {
      expect(ids.size).toBe(0);
      done();
    });
  });

  it('should clear watchlist IDs when user logs out', () => {
    document.cookie = `moviehub_token=${encodeURIComponent('test-token')};path=/`;
    document.cookie = `moviehub_user_id=${encodeURIComponent('U001')};path=/`;

    service.loadIds();

    const req = httpMock.expectOne('http://127.0.0.1:5001/api/users/U001/watchlist/ids');
    req.flush({ movie_ids: ['M001'] });

    expect(service.isInWatchlist('M001')).toBeTrue();

    // Simulate logout by clearing cookies and emitting logout via authService
    clearCookies();
    const authService = TestBed.inject(AuthService);
    authService.clearSession();

    expect(service.isInWatchlist('M001')).toBeFalse();
  });
});
