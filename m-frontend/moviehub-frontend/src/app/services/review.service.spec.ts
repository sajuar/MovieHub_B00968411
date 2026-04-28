import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ReviewService } from './review.service';
import { AuthService } from './auth.service';

const BASE = 'http://127.0.0.1:5001';

const clearCookies = () =>
  ['moviehub_token', 'moviehub_user_id', 'moviehub_role', 'moviehub_username', 'moviehub_expires_at']
    .forEach(k => document.cookie = `${k}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`);

describe('ReviewService', () => {
  let service: ReviewService;
  let httpMock: HttpTestingController;

  const mockReview = {
    review_id:   'R001',
    movie_id:    'M001',
    user_id:     'U001',
    rating:      8,
    comment:     'Great movie!',
    review_date: '2026-01-01',
    helpful_votes: 3
  };

  beforeEach(() => {
    clearCookies();
    TestBed.configureTestingModule({
      providers: [ReviewService, AuthService, provideHttpClient(), provideHttpClientTesting()]
    });
    service  = TestBed.inject(ReviewService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    clearCookies();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should GET reviews for a movie with correct pagination parameters', () => {
    service.getMovieReviews('M001', 1, 5).subscribe(reviews => {
      expect(reviews.length).toBe(1);
      expect(reviews[0].review_id).toBe('R001');
    });

    const req = httpMock.expectOne(r =>
      r.url === `${BASE}/api/movies/M001/reviews` &&
      r.params.get('pn') === '1' &&
      r.params.get('ps') === '5'
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockReview]);
  });

  it('should GET all reviews written by a specific user', () => {
    service.getUserReviews('U001').subscribe(reviews => {
      expect(reviews).toBeDefined();
      expect(reviews[0].user_id).toBe('U001');
    });

    const req = httpMock.expectOne(`${BASE}/api/users/U001/reviews`);
    expect(req.request.method).toBe('GET');
    req.flush([mockReview]);
  });

  it('should POST a new review as FormData with auth header', () => {
    document.cookie = `moviehub_token=${encodeURIComponent('test-token')};path=/`;

    service.addReview('M001', 8, 'Fantastic film!').subscribe(res => {
      expect(res).toBeDefined();
    });

    const req = httpMock.expectOne(`${BASE}/api/movies/M001/reviews`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('x-access-token')).toBe('test-token');
    const body = req.request.body as FormData;
    expect(body.get('rating')).toBe('8');
    expect(body.get('comment')).toBe('Fantastic film!');
    req.flush({ message: 'Review added' });
  });

  it('should PUT an updated review as FormData with auth header', () => {
    document.cookie = `moviehub_token=${encodeURIComponent('test-token')};path=/`;

    service.updateReview('R001', 6, 'Updated opinion').subscribe(res => {
      expect(res).toBeDefined();
    });

    const req = httpMock.expectOne(`${BASE}/api/reviews/R001`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('x-access-token')).toBe('test-token');
    req.flush({ message: 'Review updated' });
  });

  it('should DELETE a review with auth header', () => {
    document.cookie = `moviehub_token=${encodeURIComponent('test-token')};path=/`;

    service.deleteReview('R001').subscribe(res => {
      expect(res).toBeDefined();
    });

    const req = httpMock.expectOne(`${BASE}/api/reviews/R001`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.headers.get('x-access-token')).toBe('test-token');
    req.flush({ message: 'Review deleted' });
  });

  it('should POST a helpful vote with auth header', () => {
    document.cookie = `moviehub_token=${encodeURIComponent('test-token')};path=/`;

    service.vote('R001', 'helpful').subscribe(res => {
      expect(res).toBeDefined();
    });

    const req = httpMock.expectOne(`${BASE}/api/reviews/R001/vote/helpful`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('x-access-token')).toBe('test-token');
    req.flush({ helpful_votes: 4, not_helpful_votes: 1, user_voted: true });
  });

  it('should POST a not_helpful vote with auth header', () => {
    document.cookie = `moviehub_token=${encodeURIComponent('test-token')};path=/`;

    service.vote('R001', 'not_helpful').subscribe(res => {
      expect(res).toBeDefined();
    });

    const req = httpMock.expectOne(`${BASE}/api/reviews/R001/vote/not_helpful`);
    expect(req.request.method).toBe('POST');
    req.flush({ helpful_votes: 3, not_helpful_votes: 2, user_voted: true });
  });

  it('should use default pagination values when no params are given', () => {
    service.getMovieReviews('M001').subscribe();

    const req = httpMock.expectOne(r =>
      r.url === `${BASE}/api/movies/M001/reviews` &&
      r.params.get('pn') === '1' &&
      r.params.get('ps') === '5'
    );
    req.flush([]);
  });
});
