import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ReviewService } from './review.service';
import { AuthService } from './auth.service';

describe('ReviewService', () => {
  let service: ReviewService;
  let httpMock: HttpTestingController;

  const mockReview = {
    review_id: 'R001',
    movie_id: 'M001',
    user_id: 'U001',
    rating: 4,
    comment: 'Great movie!',
    review_date: '2026-01-01',
    helpful_votes: 3
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ReviewService, AuthService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ReviewService);
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

  it('should GET reviews for a movie with pagination params', () => {
    service.getMovieReviews('M001', 1, 5).subscribe(reviews => {
      expect(reviews.length).toBe(1);
      expect(reviews[0].review_id).toBe('R001');
    });

    const req = httpMock.expectOne(r =>
      r.url === '/api/movies/M001/reviews' &&
      r.params.get('pn') === '1' &&
      r.params.get('ps') === '5'
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockReview]);
  });

  it('should GET reviews written by a specific user', () => {
    service.getUserReviews('U001').subscribe(reviews => {
      expect(reviews).toBeDefined();
      expect(reviews[0].user_id).toBe('U001');
    });

    const req = httpMock.expectOne('/api/users/U001/reviews');
    expect(req.request.method).toBe('GET');
    req.flush([mockReview]);
  });

  it('should POST a new review with FormData', () => {
    localStorage.setItem('moviehub_token', 'test-token');

    service.addReview('M001', 5, 'Amazing!').subscribe(res => {
      expect(res).toBeDefined();
    });

    const req = httpMock.expectOne('/api/movies/M001/reviews');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('x-access-token')).toBe('test-token');
    req.flush({ message: 'Review added' });
  });

  it('should PUT an updated review with FormData', () => {
    localStorage.setItem('moviehub_token', 'test-token');

    service.updateReview('R001', 3, 'Updated comment').subscribe(res => {
      expect(res).toBeDefined();
    });

    const req = httpMock.expectOne('/api/reviews/R001');
    expect(req.request.method).toBe('PUT');
    expect(req.request.headers.get('x-access-token')).toBe('test-token');
    req.flush({ message: 'Review updated' });
  });

  it('should DELETE a review with auth header', () => {
    localStorage.setItem('moviehub_token', 'test-token');

    service.deleteReview('R001').subscribe(res => {
      expect(res).toBeDefined();
    });

    const req = httpMock.expectOne('/api/reviews/R001');
    expect(req.request.method).toBe('DELETE');
    expect(req.request.headers.get('x-access-token')).toBe('test-token');
    req.flush({ message: 'Review deleted' });
  });
});
