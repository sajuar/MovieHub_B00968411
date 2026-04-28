import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MovieService } from './movie.service';
import { AuthService } from './auth.service';

const BASE = 'http://127.0.0.1:5001/api/movies';

describe('MovieService', () => {
  let service: MovieService;
  let httpMock: HttpTestingController;

  const mockMovie = {
    _id: 'abc123',
    movie_id: 'M001',
    title: 'Test Movie',
    release_year: 2022,
    genres: ['Action', 'Drama'],
    duration_minutes: 120,
    director: 'Test Director',
    language: 'English',
    release: { country: 'USA', date: '2022-01-01' },
    cast: [
      { actor_name: 'Hero Actor', role: 'Hero' },
      { actor_name: 'Villain Actor', role: 'Villain' }
    ],
    ratings: { average: 7.5, votes: 100 },
    tags: ['epic', 'adventure'],
    created_at: '2022-01-01T00:00:00Z'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MovieService, AuthService, provideHttpClient(), provideHttpClientTesting()]
    });
    service  = TestBed.inject(MovieService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    ['moviehub_token', 'moviehub_user_id', 'moviehub_role', 'moviehub_username', 'moviehub_expires_at']
      .forEach(k => document.cookie = `${k}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should GET all movies and return a list', () => {
    service.getMovies().subscribe(movies => {
      expect(movies.length).toBe(1);
      expect(movies[0].title).toBe('Test Movie');
      expect(movies[0].movie_id).toBe('M001');
    });

    const req = httpMock.expectOne(r => r.url === BASE);
    expect(req.request.method).toBe('GET');
    req.flush([mockMovie]);
  });

  it('should pass genre filter as a query parameter', () => {
    service.getMovies({ genre: 'Action', pn: 1, ps: 5 }).subscribe();

    const req = httpMock.expectOne(r => r.url === BASE && r.params.get('genre') === 'Action');
    expect(req.request.params.get('pn')).toBe('1');
    expect(req.request.params.get('ps')).toBe('5');
    req.flush([mockMovie]);
  });

  it('should pass title filter as a query parameter', () => {
    service.getMovies({ title: 'Matrix' }).subscribe();

    const req = httpMock.expectOne(r => r.url === BASE && r.params.get('title') === 'Matrix');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should pass min_rating filter as a query parameter', () => {
    service.getMovies({ min_rating: 7 }).subscribe();

    const req = httpMock.expectOne(r => r.url === BASE && r.params.get('min_rating') === '7');
    req.flush([]);
  });

  it('should search movies by title', () => {
    service.searchMovies('Test').subscribe(movies => {
      expect(movies).toBeDefined();
      expect(Array.isArray(movies)).toBeTrue();
    });

    const req = httpMock.expectOne(r =>
      r.url === `${BASE}/search` && r.params.get('title') === 'Test'
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockMovie]);
  });

  it('should GET top rated movies with limit parameter', () => {
    service.getTopRated(10).subscribe(movies => {
      expect(Array.isArray(movies)).toBeTrue();
    });

    const req = httpMock.expectOne(r => r.url === `${BASE}/top-rated`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('limit')).toBe('10');
    req.flush([mockMovie]);
  });

  it('should GET genre statistics', () => {
    service.getGenreStats().subscribe(stats => {
      expect(stats).toBeDefined();
      expect(stats[0].genre).toBe('Action');
      expect(stats[0].count).toBe(10);
    });

    const req = httpMock.expectOne(`${BASE}/stats/genres`);
    expect(req.request.method).toBe('GET');
    req.flush([{ genre: 'Action', count: 10 }]);
  });

  it('should GET a single movie by its ID', () => {
    service.getMovie('M001').subscribe(movie => {
      expect(movie.movie_id).toBe('M001');
      expect(movie.title).toBe('Test Movie');
    });

    const req = httpMock.expectOne(`${BASE}/M001`);
    expect(req.request.method).toBe('GET');
    req.flush(mockMovie);
  });

  it('should DELETE a movie with auth header', () => {
    document.cookie = `moviehub_token=${encodeURIComponent('admin-token')};path=/`;

    service.deleteMovie('M001').subscribe(res => {
      expect(res).toBeDefined();
    });

    const req = httpMock.expectOne(`${BASE}/M001`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.headers.get('x-access-token')).toBe('admin-token');
    req.flush({ message: 'Movie deleted' });
  });
});
