import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { MovieService } from './movie.service';
import { AuthService } from './auth.service';

describe('MovieService', () => {
  let service: MovieService;
  let httpMock: HttpTestingController;

  const mockMovie = {
    _id: '123',
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
    service = TestBed.inject(MovieService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch all movies', () => {
    service.getMovies().subscribe(movies => {
      expect(movies.length).toBe(1);
      expect(movies[0].title).toBe('Test Movie');
    });

    const req = httpMock.expectOne(r => r.url === '/api/movies');
    expect(req.request.method).toBe('GET');
    req.flush([mockMovie]);
  });

  it('should fetch movies with filters applied as query params', () => {
    service.getMovies({ genre: 'Action', pn: 1, ps: 5 }).subscribe();

    const req = httpMock.expectOne(r => r.url === '/api/movies' && r.params.get('genre') === 'Action');
    expect(req.request.params.get('pn')).toBe('1');
    expect(req.request.params.get('ps')).toBe('5');
    req.flush([]);
  });

  it('should search movies by title', () => {
    service.searchMovies('Test').subscribe(movies => {
      expect(movies).toBeDefined();
    });

    const req = httpMock.expectOne(r => r.url === '/api/movies/search' && r.params.get('title') === 'Test');
    expect(req.request.method).toBe('GET');
    req.flush([mockMovie]);
  });

  it('should get top rated movies', () => {
    service.getTopRated(10).subscribe(movies => {
      expect(movies.length).toBeGreaterThanOrEqual(0);
    });

    const req = httpMock.expectOne(r => r.url === '/api/movies/top-rated');
    expect(req.request.method).toBe('GET');
    req.flush([mockMovie]);
  });

  it('should get genre stats', () => {
    service.getGenreStats().subscribe(stats => {
      expect(stats).toBeDefined();
    });

    const req = httpMock.expectOne('/api/movies/stats/genres');
    req.flush([{ genre: 'Action', count: 10 }]);
  });

  it('should get a single movie by ID', () => {
    service.getMovie('M001').subscribe(movie => {
      expect(movie.movie_id).toBe('M001');
      expect(movie.title).toBe('Test Movie');
    });

    const req = httpMock.expectOne('/api/movies/M001');
    expect(req.request.method).toBe('GET');
    req.flush(mockMovie);
  });
});
